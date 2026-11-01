# Vezura Store → Precify Colombia 2.1.0: integration gate

**State:** Planned. The generic Precify sync client, merchant-side adapter and Chromium IndexedDB check are implemented. Vezura has NOT been modified. Neither Hostinger nor merchant production requires changes until the proposed store-side implementation is reviewed and the relevant migrations are approved.

## Existing Vezura evidence (read-only inspection of main on 2026-11-01)

The Vezura backend already uses MySQL with order intents, order transitions and a durable Mastershop webhook inbox. Its admin order summary endpoint deliberately omits buyer/delivery JSON. These records are a useful starting point for a store-owned financial change-feed; they are **not** automatically complete, authoritative profit records.

## Implementation order (store repository, in a separate reviewed branch)

1. Define the **financial evidence contract**. Map gross order value, verified payment/COD collection, refunds, shipping fees, acquisition/product cost and advertising attribution. Unknown costs must remain unknown, not silently mapped to zero. A paid status must be verifiably observed, not inferred from "submitted" or "delivered". Do not expose buyer PII in the Precify feed.
2. Add a **durable outbox** or prove existing transitions provide transactionally ordered and complete committed events across order/payment/refund/shipping changes. The reader must emit stable IDs, tombstones and monotonic opaque cursor tokens, with a retention window allowing offline computers to catch up.
3. Implement user-scoped **read-only credentials** managed by Vezura server administrators, with one-way hashed persistence, revocation, expiry, rate limits, and actual authorization for tenant/store data. Never paste Vezura admin cookies, Mastershop API keys or Precify backend secret keys into the browser.
4. Expose GET \`/precify/v1/identity\` and GET \`/precify/v1/changes\` using the existing \`integrations/site-owned-feed.mjs\` adapter (copied/versioned inside the store as appropriate). Validate every session; configure exact Precify HTTPS origin in CORS and avoid customer details.
5. Stage and test with **synthetic orders**: an order placed and updated while Precify is fully closed must appear after reopening/authentication. Confirm cursor resumes, retries do not duplicate, deletion/consent revocation affects only the corresponding account, and campaigns/multiple currencies remain separate. Run production-shaped data only after privacy review.
6. After verified staging, separately approve any Hostinger MySQL migrations, env secrets, deployment and production activation. Keep Precify \`main\` / stable v2.0.1 and Vezura \`main\` unchanged until signoff.

## Owner actions that cannot be substituted by code

- Approve the source-of-truth for paid/refunded status and cost evidence, especially Mastershop/COD returns and settlement.
- Provide access to a **safe test environment**, when store-side API is ready, or authorize an isolated staging deployment. No real API secrets need to be pasted in ChatGPT.
- Approve migration/backups and release timing. The already granted permission to use GitHub Actions covers CI, not automatic deployment/production data migration.

## What is already automatically verified on Precify

- [108 automated tests and full build](https://github.com/BrunoPavil18/Precify-Colombia/actions/runs/41317968648): 61 core + 22 web + 7 service + 18 integration.
- The same run completed **a real Chromium IndexedDB acceptance** with 9 checks for atomic cursor commit, stale writer rejection, immutability, concurrent transactions, tenant isolation, consent-revocation purge and persistence after a real reload.
- Reproduction: compile \`apps/web/src/website-sync-db.ts\` to ES2022 JavaScript using the repository's TypeScript compiler, then execute \`node scripts/browser-sync-smoke.mjs <compiled-file>\` with Chrome/Chromium available.

This is **not** proof of a real merchant connection, PWA installation in Windows, cross-origin store authentication, Meta credentials or cloud data replication. Those are staged acceptance tasks.
