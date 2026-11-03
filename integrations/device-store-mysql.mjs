/**
 * MySQL 8 store-owned device database adapter.
 * Inject an existing mysql2-compatible pool with getConnection() and execute().
 * Never export the store's MySQL credentials to Precify's frontend.
 */
export function createMySQLDeviceStore(pool){
 if(!pool||typeof pool.getConnection!=="function"||typeof pool.execute!=="function")throw Error("mysql2-compatible connection pool required");
 return {
  async redeem({codeHash,deviceId,publicKey}){
   const conn=await pool.getConnection();
   try{
    await conn.beginTransaction();
    const [updated]=await conn.execute(
     "UPDATE precify_financy_enrollments SET consumed_at=UTC_TIMESTAMP(3) WHERE code_hash=? AND consumed_at IS NULL AND expires_at>UTC_TIMESTAMP(3)",
     [codeHash]);
    if(updated.affectedRows!==1){await conn.rollback();return null;}
    const [rows]=await conn.execute("SELECT subject FROM precify_financy_enrollments WHERE code_hash=?",[codeHash]);
    if(rows.length!==1)throw Error("Invitation disappeared");
    const subject=rows[0].subject;
    await conn.execute("INSERT INTO precify_financy_devices(device_id,subject,public_jwk,scopes) VALUES(?,?,?,?)",
     [deviceId,subject,JSON.stringify(publicKey),JSON.stringify(["finance:read"])]);
    await conn.commit();
    return {subject};
   }catch(e){await conn.rollback();throw e;}
   finally{conn.release();}
  },
  async lookup(deviceId){
   const [rows]=await pool.execute(
    "SELECT subject,public_jwk,scopes,revoked_at FROM precify_financy_devices WHERE device_id=? LIMIT 1",[deviceId]);
   if(rows.length!==1)return null;
   const r=rows[0],json=value=>typeof value==="string"?JSON.parse(value):value;
   return {subject:r.subject,publicKey:json(r.public_jwk),scopes:json(r.scopes),revoked:r.revoked_at!==null};
  },
  async useNonce(deviceId,nonce,timestamp){
   const [r]=await pool.execute("INSERT IGNORE INTO precify_financy_nonces(device_id,nonce) VALUES(?,?)",[deviceId,nonce]);
   return r.affectedRows===1;
  }
 };
}
