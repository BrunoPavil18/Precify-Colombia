# Security policy — Precify Colombia

**Updated:** 2026-10-23. **Code version:** 2.0.0 in `main`; GitHub Release publication is a separate step. See [Changelog](CHANGELOG.md).

## Data and privacy
Precify operates without mandatory user accounts, cloud storage, advertising integrations or API keys. Workspace data live in the user's origin-scoped `localStorage` under `precify-colombia:workspace:v1` (the storage **key remains v1 intentionally for compatibility**); backups exported in v2 format import version 1 and 2 records. Local storage is accessible to other scripts running on the same origin and browser profile; it is not encrypted, synchronized, or protected against shared-device access. Do not save sensitive client personal information or secrets. Export backups and safeguard them outside the browser.

## Implemented safeguards
- Exact COP decimal-string/BigInt financial arithmetic and input validation.
- 2 MB JSON backup limit, schema validation, and atomic-in-application rejection before replacing workspace contents.
- CSV spreadsheet formula neutralization and ordinary React text escaping.
- Confirmation dialogs: cancellation and Escape must not mutate data.
- Detect stale browser tabs using `storage` events and pre-write comparison of full validated workspace snapshots.
- PWA caches public static shell/assets only; financial data are not intentionally stored in the service-worker cache.
- All new features remain local and user-configurable, without third-party network accounts.

## Security limitations
- Snapshot comparison + `localStorage` setItem **does not provide atomic compare-and-swap** for truly simultaneous multi-tab writes.
- Dependency scan results are time-bounded: latest maintainer `pnpm audit --audit-level moderate` reported no known vulnerabilities; this is not a guarantee.
- Production hosts should configure HTTPS, appropriate CSP and `frame-ancestors`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, restrictive Permissions-Policy, and deliberate iframe access where applicable; adapt headers to actual deployment.
- PWA updates and offline functionality require browser/runtime compatibility and should be tested on the deployment origin.
- Regulatory and tax guides are informative, not legal certification.

## Report a vulnerability
Avoid disclosing live exploits or personal data in public issues. Use GitHub private vulnerability reporting, if enabled, or an appropriate private maintainer channel. Provide the impacted version, minimal reproduction steps and potential impact.

## Local verification

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify:core
pnpm audit --audit-level moderate
```

No GitHub Actions runs or paid infrastructure are required.
