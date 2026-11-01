# Site-owned incremental synchronization — protocol v1 (2.1.0 candidate)

A merchant's own website is the **source of truth**. It stores orders/campaigns and receives provider webhooks while the Precify PWA is closed. Precify performs read-only pulls when open, then stores authenticated, consented replicas in per-site/per-subject IndexedDB. This does not deploy anything on Hostinger, Supabase or Vezura.

## HTTPS contract (store must implement)

* GET `/precify/v1/identity`, authenticated with a **user-scoped, read-only Bearer** token; returns `{"subject":"stable-tenant-id"}`. Never return a different tenant's records for the same identity.
* GET `/precify/v1/changes?limit=100&cursor=<opaque>`, same auth; returns:
```json
{
  "changes":[{"kind":"order","id":"order-event-1","operation":"upsert","value":{"id":"order-event-1","orderId":"123","source":"store","occurredAt":"2026-11-01T12:00:00Z","status":"created","campaignId":null,"currency":"COP","grossRevenue":"99000","productCost":"40000","shippingCost":"0","reverseShippingCost":"0","advertisingCost":"0","otherCost":"0","refundAmount":"0"}}],
  "nextCursor":"opaque-next-cursor",
  "hasMore":false
}
```
* `kind`: `order` or `campaign`; `operation`: `upsert` or `delete`. Upserts include the full object. Deletes are durable tombstones for **the affected identity**.
* IDs stable, unique and namespaced within a kind; maximum 250 changes per page; opaque cursor <= 2048 chars.
* Cursor **must only advance past committed changes**. A site should serialize cursor assignment with commits or use a database-derived ordered outbox. Avoid offset pagination for a mutating feed. Return an unchanged cursor and empty changes when nothing changed. Support redelivery, retries and deleted-record tombstones. Return an explicit `410 Gone` if the cursor fell outside retention; require full snapshot rebootstrap with user approval rather than silently skipping history.
* After a successful initial snapshot, the site must continue exposing new changes even if Precify was closed for days. Never rely on the Precify computer being online when webhooks arrive.
* Authorization must validate store identity and read scope on **each** request. Support restrictive CORS for Precify's actual origin; never use wildcards with credentials, never put privileged integration keys in a browser, and rate limit reads.
* The site's `identity` and `changes` endpoint must be HTTPS (local development on localhost excepted). This prototype passes a short-lived read-only token in memory, not localStorage. After closing/reopening the app, the merchant needs to sign in again; automatic startup sync begins after authentication. Long-lived silent login requires a future audited OAuth/BFF session, **not** a global backend secret in localStorage.
* The browser is the local cache and sync UI. IndexedDB is browser-origin scoped; no native Windows executable or unattended Windows service is claimed. The site continues operating while the PWA is closed.

## Client behavior

1. Add store HTTPS origin; explicitly permit local storage per source; authenticate with an account-specific read token.
2. On authenticated connection: fetch stable identity, isolate cache using `source UUID:tenant subject`, and sync immediately.
3. While open: default polling every 60s, configurable 30s / 5 min / manual-only, refresh on restored connectivity and on returning to a visible tab. Only committed pages advance the local cursor.
4. A manual button bypasses automatic retry backoff and coalesces concurrent pulls. Errors back off exponentially up to 15min; the source remains independent of other sources.
5. Disable or remove a source to clear its local cache. Offline rows are not merged into the local manual COD workspace and never automatically pushed back to stores.
6. The store may expose paginated deletion tombstones, but cross-device or remote erasure cannot revoke copies from a computer that never reconnects. Operators need retention and device security policies.

## Integration boundaries

The current Vezura Store has **not** been modified to provide this contract. Hostinger only needs to run Vezura as it already does, plus an authorized merchant-specific change-feed integration when implemented. This is a generic adapter/protocol, not a claim that Vezura, Mastershop, Shopify or Meta already exports this exact endpoint. The optional Precify Supabase connected service and Meta OAuth remain separate features and are not required for site-owned local sync. Provider-specific rate limits and update latencies must be respected.

## Testing & release gate

`node --test integrations/tests/site-owned-sync.test.mjs` verifies cursor continuation, atomic commit contracts, replay, account isolation, concurrent-call coalescing, backoff, insecure origins and malformed responses. Browser IndexedDB, real hosted source APIs, OAuth and offline/online E2E require live acceptance before general release.


### Store-side handler (Next.js, Node, Deno with Web Fetch APIs)

A reusable adapter lives in `integrations/site-owned-feed.mjs`. Its two callbacks are deliberately owned by the merchant and **never** replace its order database:

```js
import {createSiteFeedHandler} from "./integrations/site-owned-feed.mjs";

const handle=createSiteFeedHandler({
  allowedOrigins:["https://precify.example.com"],
  authorize: async token => {
    // Verify short-lived, read-only user permission in YOUR store backend.
    // Return {subject:stableTenantId} or null; do not use global API secrets.
    return await verifyStoreViewerToken(token);
  },
  readChanges: async ({subject,cursor,limit}) => {
    // Query YOUR durable, commit-ordered outbox by subject/tenant.
    // Return {changes,nextCursor,hasMore}; do not use offset paging.
    return await storeDatabase.readFinancialChangeFeed({subject,cursor,limit});
  }
});
export const GET=handle;
export const OPTIONS=handle;
```

The placeholders `verifyStoreViewerToken` and `storeDatabase.readFinancialChangeFeed` must be implemented by the actual store. Import this handler **only on the server**. It does not install a database, persist merchant events, authenticate Vezura customers by itself or expose data until the merchant explicitly implements the two callbacks.


### Validated local reports

Store upserts must contain complete Precify `OrderEvent` or `AdCampaign` values as defined in `packages/core/src/operations.ts`. Reject unknown fields/statuses or malformed amounts at the connector. The Precify client validates payloads before atomically persisting cursor+changes. Per-site and per-currency COD summaries show paid orders and projected operating net result, without mixing currencies or silently copying records into the separate manual workspace.

### Consistency safeguards

- A previously synchronized order event ID is immutable: redelivery with the same payload is idempotent; a conflicting payload aborts its IndexedDB transaction without advancing its cursor. Corrections use a new event ID; campaign measurements may update by ID.
- "Manual only" never triggers an automatic startup, interval, online or visibility pull. Manual refresh can be attempted even when the browser's online indicator is inaccurate.
- Cached data is isolated by connector ID and verified tenant subject. Switching subjects hides the previous summary from the UI, without merging accounts.


### Verified browser acceptance

[Actions run 41317968648](https://github.com/BrunoPavil18/Precify-Colombia/actions/runs/41317968648) passed 108 unit/contract tests plus a real Chromium/IndexedDB smoke: atomic cache/cursor commits, immutable order ID conflict rollback, expected-cursor check during cross-tab races, tenant separation, selective consent cache deletion and persisted record availability after reloading the browser. The test identified and resolved an actual IndexedDB key-only-cursor deletion bug. Reusable developer test: `scripts/browser-sync-smoke.mjs`. **No Vezura or real merchant server endpoint has been deployed.**
