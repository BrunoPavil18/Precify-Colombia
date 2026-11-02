-- Precify Financy V2 store-owned device protocol — MySQL 8/InnoDB
-- Run within the existing merchant database. Never provision a separate central Precify database.
CREATE TABLE IF NOT EXISTS precify_financy_enrollments (
 code_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 subject VARCHAR(160) NOT NULL,
 expires_at DATETIME(3) NOT NULL,
 consumed_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS precify_financy_devices (
 device_id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 subject VARCHAR(160) NOT NULL,
 public_jwk JSON NOT NULL,
 scopes JSON NOT NULL,
 revoked_at DATETIME(3) NULL,
 created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX idx_device_subject(subject)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS precify_financy_nonces (
 device_id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 nonce CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 seen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY(device_id,nonce),
 INDEX idx_nonce_ttl(seen_at),
 CONSTRAINT fk_precify_financy_device FOREIGN KEY(device_id) REFERENCES precify_financy_devices(device_id) ON DELETE CASCADE
) ENGINE=InnoDB;
-- Scheduled merchant-owned cleanup: DELETE FROM precify_financy_nonces WHERE seen_at < NOW(3) - INTERVAL 10 MINUTE;
-- Do not reuse revoked device IDs.
