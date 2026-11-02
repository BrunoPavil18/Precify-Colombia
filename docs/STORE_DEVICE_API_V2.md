# Precify Financy — Site-Owned Device Protocol v2

Each installation owns a non-exportable Ed25519 private key. An administrator of the **store** generates a high-entropy **single-use invitation code**, which is atomically consumed by the store API on first activation. The Precify app does not hold a shared backend secret or require a central account database.

## Store-side setup

Implement **GET /precify/v2/identity**, **GET /precify/v2/changes** and **POST /precify/v2/activate** using `integrations/device-feed.mjs` server-side. Your store adapter must provide:

- `redeem({codeHash,deviceId,publicKey})`: in one database transaction, validate a short expiry, tenant, allowed scope and unused invitation, **atomically mark consumed** and insert unique `device_id` with the public key. Return `{subject}` only on success. Set UNIQUE constraints on enrollment hash and device ID. Reuse returns HTTP 409.
- `lookup(deviceId)`: store-verified tenant, key, scopes (e.g., `finance:read`), revoked state. Never accept the client's tenant parameter as authority.
- `useNonce(deviceId,nonce,timestamp)`: atomically insert a unique device nonce with TTL and reject replay. Enforce clock skew at most 120 seconds.
- `readChanges({subject,cursor,limit})`: transactionally ordered, durable financial change-feed for that subject even while computers are offline.

Use `createEnrollmentCode()` and store only `hashEnrollmentCode(code)`; prefer a 10 minute code lifetime and display once. Keep server-side invitation creation behind the existing **store admin** authentication, not on a public endpoint. The sample handler deliberately **does not implement a database**, since that belongs to each merchant's own server.

Each request is signed using canonical `PRECIFY-FINANCY-V2\nGET\n/path?query\ntimestamp\nnonce\ndeviceId`. Verify the Ed25519 signature with the stored public key, enforce scope and revocation, and only then consume a nonce. Do not permit direct access to admin endpoints or mutable order data.

The Windows client stores a CryptoKey in per-app IndexedDB; it is **non-exportable through WebCrypto**, but an OS-level copy of application profile data may allow cloning. True hardware-bound device attestation requires additional Windows TPM/CNG integration. A one-time code protects **against reuse of that code**, not against theft before first redemption. Revocation stops future network access but does not retroactively erase an offline cache.

Two installations can access the same store using **two independently issued codes**. One code cannot be reused. No Precify-hosted account service is required.

## Local validation and integration boundary

Run `node --test integrations/tests/device-enrollment.test.mjs`. Production requires real durable store database transactions, request rate limiting, HTTPS, CORS origin allowlists and admin-side device revocation. Integrate the store adapter in Vezura in the separate Vezura project. The prior site-owned v1 bearer endpoint remains available for migration only; new sites use device v2 by default.
