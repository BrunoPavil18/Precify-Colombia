# Site-owned incremental synchronization — protocol v1 (2.1.0 candidate)

A merchant's own website is the **source of truth**. It stores orders/campaigns and receives provider webhooks while the Precify PWA is closed. Precify performs read-only pulls when open, then stores authenticated, consented replicas in per-site/per-subject IndexedDB. This does not deploy anything on Hostinger, Supabase or Vezura.

## HTTPS contract (store must implement)

* GET \`/precify/v1/identity\`, authenticated with a **user-scoped, read-only Bearer** token; returns \`{"subject":"stable-tenant-id"}\`. Never return a different tenant's records for the same identity.
* GET \`/precify/v1/changes?limit=100&cursor=<opaque>\`, same auth; returns:
\`\`\`json
{
  "changes":[{"kind":"order","id":"order-event-1","operation":"upsert","value":{"id":"order-event-1","orderId":"123","source":"store"}}],
  "nextCursor":"opaque-next-cursor",
  "hasMore":false
}
\`\`\`
* \`kind\`: \`order\` or \`campaign\`; \`operation\`: \`upsert\` or \`delete\`. Upserts include the full object. Deletes are durable tombstones for **the affected identity**.
* IDs stable, unique and namespaced within a kind; maximum 250 changes per page; opaque cursor <= 2048 chars.
* Cursor **must only advance past committed changes**. A site should serialize cursor assignment with commits or use a database-derived ordered outbox. Avoid offset pagination for a mutating feed. Return an unchanged cursor and empty changes when nothing changed. Support redelivery, retries and deleted-record tombstones. Return an explicit \`410 Gone\` if the cursor fell outside retention; require full snapshot rebootstrap with user approval rather than silently skipping history.
* After a successful initial snapshot, the site must continue exposing new changes even if Precify was closed for days. Never rely on the Precify computer being online when webhooks arrive.
* Authorization must validate store identity and read scope on **each** request. Support restrictive CORS for Precify's actual origin; never use wildcards with credentials, never put privileged integration keys in a browser, and rate limit reads.
* The site's \`identity\` and \`changes\` endpoint must be HTTPS (local development on localhost excepted). This prototype passes a short-lived read-only token in memory, not localStorage. After closing/reopening the app, the merchant needs to sign in again; automatic startup sync begins after authentication. Long-lived silent login requires a future audited OAuth/BFF session, **not** a global backend secret in localStorage.
* The browser is the local cache and sync UI. IndexedDB is browser-origin scoped; no native Windows executable or unattended Windows service is claimed. The site continues operating while the PWA is closed.

## Client behavior

1. Add store HTTPS origin; explicitly permit local storage per source; authenticate with an account-specific read token.
2. On authenticated connection: fetch stable identity, isolate cache using \`source UUID:tenant subject\`, and sync immediately.
3. While open: default polling every 60s, configurable 30s / 5 min / manual-only, refresh on restored connectivity and on returning to a visible tab. Only committed pages advance the local cursor.
4. A manual button bypasses automatic retry backoff and coalesces concurrent pulls. Errors back off exponentially up to 15min; the source remains independent of other sources.
5. Disable or remove a source to clear its local cache. Offline rows are not merged into the local manual COD workspace and never automatically pushed back to stores.
6. The store may expose paginated deletion tombstones, but cross-device or remote erasure cannot revoke copies from a computer that never reconnects. Operators need retention and device security policies.

## Integration boundaries

The current Vezura Store has **not** been modified to provide this contract. Hostinger only needs to run Vezura as it already does, plus an authorized merchant-specific change-feed integration when implemented. This is a generic adapter/protocol, not a claim that Vezura, Mastershop, Shopify or Meta already exports this exact endpoint. The optional Precify Supabase connected service and Meta OAuth remain separate features and are not required for site-owned local sync. Provider-specific rate limits and update latencies must be respected.

## Testing & release gate

\`node --test integrations/tests/site-owned-sync.test.mjs\` verifies cursor continuation, atomic commit contracts, replay, account isolation, concurrent-call coalescing, backoff, insecure origins and malformed responses. Browser IndexedDB, real hosted source APIs, OAuth and offline/online E2E require live acceptance before general release.
