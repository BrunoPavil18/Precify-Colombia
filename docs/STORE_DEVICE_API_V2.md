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

## Postgres pronto para adaptação no site

A migração `integrations/sql/precify-financy-device-v2.sql` e o adapter `integrations/device-store-postgres.mjs` permitem ao servidor de uma loja criar suas próprias tabelas de convites, dispositivos e nonces. Eles **não mexem no banco da Vezura** automaticamente. Para usar, o backend da loja aplica a migração, fornece um pool PostgreSQL existente a `createPostgresDeviceStore(pool)` e conecta o objeto retornado ao `createDeviceFeedHandler`.

A transação de ativação consome o convite por `UPDATE ... WHERE consumed_at IS NULL ... RETURNING`, registra a chave pública e faz `COMMIT`. Um segundo pedido concorrente obtém nenhum registro, por design. Se o insert do dispositivo falhar, `ROLLBACK` recupera a disponibilidade do convite. A tentativa não expõe dados financeiros de outro tenant.

O backend da loja continua responsável pela tela administrativa de emissão/revogação, pelo feed de pedidos com outbox e pelo rate limiting. Agende expurgo de nonces expirados e **não reatribua IDs revogados**. Se o banco da loja não for PostgreSQL (por exemplo MySQL), traduza a migração e preserve a mesma atomicidade. Não configure silenciosamente uma segunda instância PostgreSQL na Vezura.

O identificador e o segredo de instalação não são uma senha compartilhada; o código de convite é de uso único e a chave privada fica no computador. A verificação de assinatura deve ocorrer em cada acesso. O aplicativo não depende de cadastro de funcionário no serviço do Precify.

## Integração com lojas que utilizam MySQL 8

Para lojas com MySQL 8, aplique `integrations/sql/precify-financy-device-v2.mysql.sql` no banco da própria loja e utilize `createMySQLDeviceStore(pool)` de `integrations/device-store-mysql.mjs`, fornecendo o pool mysql2 já usado pelo site. A transação de `redeem()` consome o convite e registra o dispositivo de maneira atômica; erros fazem ROLLBACK e um segundo consumo retorna HTTP 409. Os nonces possuem índice composto único.

O SQL não cria usuários, senhas nem administradores do Precify. O site continua responsável por autorizar quem emite/renova/revoga dispositivos, e por disponibilizar o feed financeiro da loja. Esse adapter NÃO foi implantado na Vezura e deve ser testado no ambiente dela antes de uso real.
