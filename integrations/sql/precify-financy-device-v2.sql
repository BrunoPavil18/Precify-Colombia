-- Precify Financy device protocol v2 (PostgreSQL; run ON THE MERCHANT SERVER)
-- Invitation issuance must require the merchant's existing admin session.
CREATE TABLE IF NOT EXISTS precify_financy_enrollments (
 code_hash CHAR(64) PRIMARY KEY,
 subject VARCHAR(160) NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,
 consumed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS precify_financy_devices (
 device_id CHAR(32) PRIMARY KEY,
 subject VARCHAR(160) NOT NULL,
 public_jwk JSONB NOT NULL,
 scopes TEXT[] NOT NULL DEFAULT ARRAY['finance:read']::TEXT[],
 revoked_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK (jsonb_typeof(public_jwk) = 'object')
);
CREATE TABLE IF NOT EXISTS precify_financy_nonces (
 device_id CHAR(32) NOT NULL REFERENCES precify_financy_devices(device_id) ON DELETE CASCADE,
 nonce CHAR(32) NOT NULL,
 seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(device_id,nonce)
);
CREATE INDEX IF NOT EXISTS idx_precify_financy_nonces_expiration ON precify_financy_nonces(seen_at);
CREATE INDEX IF NOT EXISTS idx_precify_financy_devices_subject ON precify_financy_devices(subject);
-- Periodic site-owned cleanup:
-- DELETE FROM precify_financy_nonces WHERE seen_at < now() - interval '10 minutes';
-- DELETE FROM precify_financy_enrollments WHERE expires_at < now() - interval '7 days';
-- Do not delete revoked devices automatically: retain their device_id so it cannot be reused.
