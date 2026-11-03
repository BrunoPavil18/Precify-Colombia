/**
 * Site-owned Postgres implementation of the v2 enrollment gate.
 * Supply an existing pool with pool.connect() and pool.query(); no PG driver is bundled.
 * The merchant controls its own access to invitation issuance and authorization.
 */
export function createPostgresDeviceStore(pool){
 if(!pool||typeof pool.connect!=="function"||typeof pool.query!=="function")throw Error("PostgreSQL connection pool required");
 return {
  async redeem({codeHash,deviceId,publicKey}){
   const db=await pool.connect();
   try{
    await db.query("BEGIN");
    // Exactly one concurrent activation can consume this code. Others receive zero rows.
    const r=await db.query(
     "UPDATE precify_financy_enrollments SET consumed_at=now() WHERE code_hash=$1 AND consumed_at IS NULL AND expires_at>now() RETURNING subject",
     [codeHash]);
    if(r.rowCount!==1){await db.query("ROLLBACK");return null;}
    const subject=r.rows[0].subject;
    await db.query(
     "INSERT INTO precify_financy_devices(device_id,subject,public_jwk,scopes) VALUES($1,$2,$3::jsonb,ARRAY['finance:read']::text[])",
     [deviceId,subject,JSON.stringify(publicKey)]);
    await db.query("COMMIT");
    return {subject};
   }catch(e){await db.query("ROLLBACK");throw e;}
   finally{db.release();}
  },
  async lookup(deviceId){
   const r=await pool.query(
    "SELECT subject, public_jwk, scopes, revoked_at IS NOT NULL AS revoked FROM precify_financy_devices WHERE device_id=$1",[deviceId]);
   if(r.rowCount!==1)return null;
   const v=r.rows[0];
   return {subject:v.subject,publicKey:v.public_jwk,scopes:v.scopes,revoked:v.revoked};
  },
  async useNonce(deviceId,nonce,timestamp){
   const r=await pool.query(
    "INSERT INTO precify_financy_nonces(device_id,nonce) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING nonce",
    [deviceId,nonce]);
   return r.rowCount===1;
  }
 };
}
