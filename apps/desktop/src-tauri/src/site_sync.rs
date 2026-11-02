//! Transactional site-owned financial event cache, stored in native SQLite on Windows.
use rusqlite::{params,Connection,OptionalExtension,TransactionBehavior};
use serde::{Deserialize,Serialize};
use serde_json::Value;
use std::time::{SystemTime,UNIX_EPOCH};
use tauri::Manager;
#[derive(Debug,Deserialize,Clone)]
pub struct Change{kind:String,id:String,operation:String,value:Option<Value>}
#[derive(Serialize)]
#[serde(rename_all="camelCase")]
pub struct Checkpoint{cursor:Option<String>,at:i64,count:i64}
#[derive(Serialize)]
pub struct EventRow{kind:String,id:String,value:Value}
fn valid_scope(v:&str)->bool{
 !v.is_empty()&&v.len()<=320&&v.bytes().all(|c|c.is_ascii_alphanumeric()||matches!(c,b'.'|b'_'|b':'|b'-'))
}
fn valid_business(v:&str)->bool{
 v=="default"||v.len()==34&&v.starts_with("b_")&&v[2..].bytes().all(|c|c.is_ascii_hexdigit()&&!c.is_ascii_uppercase())
}
fn valid_change(v:&Change)->bool{
 (v.kind=="order"||v.kind=="campaign")&&(v.operation=="upsert"||v.operation=="delete")&&valid_scope(&v.id)
 &&(v.operation=="delete"||v.value.as_ref().is_some_and(|x|x.is_object()&&x.to_string().len()<=100_000))
}
fn setup(db:&Connection)->Result<(),String>{
 db.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
 CREATE TABLE IF NOT EXISTS site_checkpoints(
 business_id TEXT NOT NULL, scope TEXT NOT NULL, cursor TEXT, at INTEGER NOT NULL,
 PRIMARY KEY(business_id,scope));
 CREATE TABLE IF NOT EXISTS site_events(
 business_id TEXT NOT NULL, scope TEXT NOT NULL, kind TEXT NOT NULL,
 event_id TEXT NOT NULL, payload TEXT NOT NULL,
 PRIMARY KEY(business_id,scope,kind,event_id));
 CREATE INDEX IF NOT EXISTS site_events_scope ON site_events(business_id,scope);")
 .map_err(|e|e.to_string())
}
fn connection(app:tauri::AppHandle)->Result<Connection,String>{
 let path=app.path().app_data_dir().map_err(|e|e.to_string())?.join("precify-financy-local.db");
 if let Some(dir)=path.parent(){std::fs::create_dir_all(dir).map_err(|e|e.to_string())?;}
 let db=Connection::open(path).map_err(|e|e.to_string())?;
 db.busy_timeout(std::time::Duration::from_secs(5)).map_err(|e|e.to_string())?;
 setup(&db)?;
 Ok(db)
}
fn checkpoint(db:&Connection,business_id:&str,scope:&str)->Result<Option<Checkpoint>,String>{
 let result=db.query_row("SELECT cursor,at FROM site_checkpoints WHERE business_id=?1 AND scope=?2",
  params![business_id,scope],|r|Ok((r.get::<_,Option<String>>(0)?,r.get::<_,i64>(1)?)))
  .optional().map_err(|e|e.to_string())?;
 match result{None=>Ok(None),Some((cursor,at))=>{
  let count=db.query_row("SELECT count(*) FROM site_events WHERE business_id=?1 AND scope=?2",params![business_id,scope],|r|r.get(0)).map_err(|e|e.to_string())?;
  Ok(Some(Checkpoint{cursor,at,count}))
 }}
}
#[tauri::command]
pub fn site_sync_checkpoint(app:tauri::AppHandle,business_id:String,scope:String)->Result<Option<Checkpoint>,String>{
 if !valid_business(&business_id)||!valid_scope(&scope){return Err("Invalid site scope".into());}
 checkpoint(&connection(app)?,&business_id,&scope)
}
fn apply(db:&mut Connection,business_id:&str,scope:&str,changes:Vec<Change>,cursor:Option<String>,expected_cursor:Option<String>,check_expected:bool)->Result<(),String>{
 if !valid_business(business_id)||!valid_scope(scope)||changes.len()>250||cursor.as_ref().is_some_and(|x|x.len()>2048)||!changes.iter().all(valid_change){
  return Err("Invalid site sync page".into());
 }
 if changes.iter().map(|c|c.value.as_ref().map_or(0,|x|x.to_string().len())).sum::<usize>()>2_000_000{
  return Err("Site page exceeds 2MB".into());
 }
 let tx=db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(|e|e.to_string())?;
 let previous=tx.query_row("SELECT cursor FROM site_checkpoints WHERE business_id=?1 AND scope=?2",
  params![business_id,scope],|r|r.get::<_,Option<String>>(0)).optional().map_err(|e|e.to_string())?.flatten();
 if check_expected&&previous!=expected_cursor{return Err("Site cursor conflict".into());}
 for c in changes{
  if c.operation=="delete"{
   tx.execute("DELETE FROM site_events WHERE business_id=?1 AND scope=?2 AND kind=?3 AND event_id=?4",
    params![business_id,scope,c.kind,c.id]).map_err(|e|e.to_string())?;
   continue;
  }
  let payload=c.value.ok_or("Missing payload")?;
  if c.kind=="order"{
   let prior=tx.query_row("SELECT payload FROM site_events WHERE business_id=?1 AND scope=?2 AND kind='order' AND event_id=?3",
    params![business_id,scope,c.id],|r|r.get::<_,String>(0)).optional().map_err(|e|e.to_string())?;
   if let Some(prior)=prior{
    let old:Value=serde_json::from_str(&prior).map_err(|_|"Corrupt stored order")?;
    if old!=payload{return Err("Immutable order event changed".into());}
   }
  }
  tx.execute("INSERT INTO site_events(business_id,scope,kind,event_id,payload) VALUES(?1,?2,?3,?4,?5)
   ON CONFLICT(business_id,scope,kind,event_id) DO UPDATE SET payload=excluded.payload",
   params![business_id,scope,c.kind,c.id,payload.to_string()]).map_err(|e|e.to_string())?;
 }
 let now=SystemTime::now().duration_since(UNIX_EPOCH).map_err(|e|e.to_string())?.as_millis() as i64;
 tx.execute("INSERT INTO site_checkpoints(business_id,scope,cursor,at) VALUES(?1,?2,?3,?4)
  ON CONFLICT(business_id,scope) DO UPDATE SET cursor=excluded.cursor,at=excluded.at",
  params![business_id,scope,cursor,now]).map_err(|e|e.to_string())?;
 tx.commit().map_err(|e|e.to_string())
}
#[tauri::command]
pub fn site_sync_apply(app:tauri::AppHandle,business_id:String,scope:String,changes:Vec<Change>,cursor:Option<String>,expected_cursor:Option<String>,check_expected:bool)->Result<(),String>{
 apply(&mut connection(app)?,&business_id,&scope,changes,cursor,expected_cursor,check_expected)
}
#[tauri::command]
pub fn site_sync_rows(app:tauri::AppHandle,business_id:String,scope:String,max_rows:i64)->Result<Vec<EventRow>,String>{
 if !valid_business(&business_id)||!valid_scope(&scope)||!(1..=20000).contains(&max_rows){return Err("Invalid event query".into());}
 let db=connection(app)?;
 let mut st=db.prepare("SELECT kind,event_id,payload FROM site_events WHERE business_id=?1 AND scope=?2 ORDER BY kind,event_id LIMIT ?3").map_err(|e|e.to_string())?;
 let rows=st.query_map(params![business_id,scope,max_rows+1],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?))).map_err(|e|e.to_string())?;
 let mut result=Vec::new();
 for row in rows{
  let(kind,id,data)=row.map_err(|e|e.to_string())?;
  if result.len()>=max_rows as usize{return Err("Site cache record limit exceeded".into());}
  result.push(EventRow{kind,id,value:serde_json::from_str(&data).map_err(|_|"Corrupt event JSON")?});
 }
 Ok(result)
}
#[tauri::command]
pub fn site_sync_purge(app:tauri::AppHandle,business_id:String,source_id:String)->Result<(),String>{
 if !valid_business(&business_id)||!valid_scope(&source_id){return Err("Invalid purge scope".into());}
 let mut db=connection(app)?;
 let tx=db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(|e|e.to_string())?;
 let prefix=source_id+":";
 tx.execute("DELETE FROM site_events WHERE business_id=?1 AND substr(scope,1,length(?2))=?2",params![business_id,prefix]).map_err(|e|e.to_string())?;
 tx.execute("DELETE FROM site_checkpoints WHERE business_id=?1 AND substr(scope,1,length(?2))=?2",params![business_id,prefix]).map_err(|e|e.to_string())?;
 tx.commit().map_err(|e|e.to_string())
}
#[cfg(test)]
mod tests{
 use super::*;
 #[test]
 fn native_sync_is_atomic_scoped_and_replay_safe(){
  let mut db=Connection::open_in_memory().unwrap();setup(&db).unwrap();
  let item=Change{kind:"order".into(),id:"event1".into(),operation:"upsert".into(),value:Some(serde_json::json!({"amount":"50000"}))};
  apply(&mut db,"default","shop:tenant",vec![item.clone()],Some("c1".into()),None,true).unwrap();
  assert_eq!(checkpoint(&db,"default","shop:tenant").unwrap().unwrap().count,1);
  assert!(checkpoint(&db,"b_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","shop:tenant").unwrap().is_none());
  let conflict=Change{value:Some(serde_json::json!({"amount":"90000"})),..item.clone()};
  assert!(apply(&mut db,"default","shop:tenant",vec![conflict],Some("c2".into()),Some("c1".into()),true).is_err());
  assert_eq!(checkpoint(&db,"default","shop:tenant").unwrap().unwrap().cursor,Some("c1".into()));
  assert!(apply(&mut db,"default","shop:tenant",vec![item],Some("c2".into()),Some("wrong".into()),true).is_err());
  apply(&mut db,"default","shop:tenant",vec![],Some("c2".into()),Some("c1".into()),true).unwrap();
  assert_eq!(checkpoint(&db,"default","shop:tenant").unwrap().unwrap().count,1);
 }
}
