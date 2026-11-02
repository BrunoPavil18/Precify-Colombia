//! SQLite snapshot store for separately scoped business data.
//! No arbitrary table names, SQL, filesystem paths, or network requests are exposed to JS.
use rusqlite::{params, Connection, OptionalExtension, TransactionBehavior};
use serde::Serialize;
use std::path::Path;
use tauri::Manager;

#[derive(Serialize)]
pub struct Snapshot {
    pub revision: i64,
    pub data: String,
}

fn valid_business(value: &str) -> bool {
    value == "default"
        || (value.len() == 34 && value.starts_with("b_")
            && value[2..].bytes().all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase()))
}
fn valid_kind(value: &str) -> bool {
    matches!(value, "workspace" | "operations" | "global-pricing" | "site-connectors" | "business-directory")
}
fn validate_snapshot(business_id: &str, kind: &str, data: &str) -> Result<(), String> {
    if !valid_business(business_id) || !valid_kind(kind) {
        return Err("Unsupported business or snapshot kind".into());
    }
    if data.len() > 2_000_000 || data.is_empty() {
        return Err("Snapshot exceeds maximum size or is empty".into());
    }
    let value: serde_json::Value = serde_json::from_str(data).map_err(|_| "Invalid JSON")?;
    if !(value.is_object() || (kind == "site-connectors" && value.is_array())) {
        return Err("Invalid snapshot shape".into());
    }
    Ok(())
}
fn init_db(path: &Path) -> Result<Connection, String> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    conn.busy_timeout(std::time::Duration::from_secs(5))
        .map_err(|e| e.to_string())?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA foreign_keys = ON;
         CREATE TABLE IF NOT EXISTS snapshots (
           business_id TEXT NOT NULL,
           kind TEXT NOT NULL,
           revision INTEGER NOT NULL,
           payload TEXT NOT NULL,
           updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
           PRIMARY KEY (business_id, kind)
         );"
    ).map_err(|e| e.to_string())?;
    Ok(conn)
}
fn connection(app: tauri::AppHandle) -> Result<Connection, String> {
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?.join("precify-local.db");
    init_db(&path)
}
fn fetch(conn: &Connection, business_id: &str, kind: &str) -> Result<Option<Snapshot>, String> {
    conn.query_row(
        "SELECT revision, payload FROM snapshots WHERE business_id=?1 AND kind=?2",
        params![business_id, kind],
        |row| Ok(Snapshot { revision: row.get(0)?, data: row.get(1)? })
    ).optional().map_err(|e| e.to_string())
}
#[tauri::command]
pub fn desktop_snapshot_get(app: tauri::AppHandle, business_id: String, kind: String) -> Result<Option<Snapshot>, String> {
    if !valid_business(&business_id) || !valid_kind(&kind) {
        return Err("Unsupported business or snapshot kind".into());
    }
    let db = connection(app)?;
    fetch(&db, &business_id, &kind)
}
fn store(db: &mut Connection, business_id: &str, kind: &str, data: &str, expected_revision: Option<i64>) -> Result<i64, String> {
    validate_snapshot(business_id, kind, data)?;
    let tx = db.transaction_with_behavior(TransactionBehavior::Immediate).map_err(|e| e.to_string())?;
    let previous: Option<i64> = tx.query_row(
        "SELECT revision FROM snapshots WHERE business_id=?1 AND kind=?2",
        params![business_id,kind],|r|r.get(0)
    ).optional().map_err(|e|e.to_string())?;
    if previous != expected_revision {
        return Err("SQLite snapshot conflict: external modification detected".into());
    }
    let revision = previous.unwrap_or(0).checked_add(1).ok_or("Invalid revision")?;
    tx.execute(
        "INSERT INTO snapshots(business_id,kind,revision,payload) VALUES(?1,?2,?3,?4)
         ON CONFLICT(business_id,kind) DO UPDATE SET
         revision=excluded.revision,payload=excluded.payload,updated_at=CURRENT_TIMESTAMP",
        params![business_id,kind,revision,data]
    ).map_err(|e|e.to_string())?;
    tx.commit().map_err(|e|e.to_string())?;
    Ok(revision)
}
#[tauri::command]
pub fn desktop_snapshot_put(app: tauri::AppHandle, business_id: String, kind: String, data: String, expected_revision: Option<i64>) -> Result<i64, String> {
    let mut db = connection(app)?;
    store(&mut db, &business_id, &kind, &data, expected_revision)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_invalid_businesses_and_unknown_commands() {
        assert!(valid_business("default"));
        assert!(valid_business(&format!("b_{}", "a".repeat(32))));
        assert!(!valid_business("../AppData"));
        assert!(!valid_kind("sql"));
        assert!(validate_snapshot("default","workspace","{\"schemaVersion\":1}").is_ok());
        assert!(validate_snapshot("default","workspace","[]").is_err());
    }
    #[test]
    fn snapshot_is_scoped_and_protected_by_revision() {
        let mut db = Connection::open_in_memory().unwrap();
        db.execute_batch("CREATE TABLE snapshots (business_id TEXT NOT NULL, kind TEXT NOT NULL, revision INTEGER NOT NULL, payload TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(business_id,kind));").unwrap();
        let first=store(&mut db,"default","workspace","{\"data\":1}",None).unwrap();
        assert_eq!(first,1);
        assert!(fetch(&db,"b_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","workspace").unwrap().is_none());
        assert!(store(&mut db,"default","workspace","{\"data\":2}",None).is_err());
        assert_eq!(store(&mut db,"default","workspace","{\"data\":2}",Some(1)).unwrap(),2);
        assert_eq!(fetch(&db,"default","workspace").unwrap().unwrap().data,"{\"data\":2}");
        assert!(store(&mut db,"default","workspace","broken",Some(2)).is_err());
    }
}
