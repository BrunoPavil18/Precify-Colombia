# 2.0.1 — Verification and acceptance guide

Run from the branch `fix/precify-colombia-v2.0.1` in PowerShell:

```powershell
git fetch origin
git switch fix/precify-colombia-v2.0.1
git pull --ff-only origin fix/precify-colombia-v2.0.1
pnpm.cmd install --frozen-lockfile --ignore-scripts
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test
pnpm.cmd build
pnpm.cmd verify:core
pnpm.cmd audit --audit-level moderate
```

Do not mark unrun commands passed. The 53/53 green tests on v2.0.0 do not validate v2.0.1. The core regressions include COD with 0% shipped, 0% paid; campaign with 100% refunds and attributed/projection mismatch; PUM 1000/6 truncation; and exact portfolio break-even.

Manual acceptance should use an **exported backup first**, then check:
1. Campaign with mismatched attributed revenue: projected profit uses projected conversions; attributed ROAS uses entered attribution, warning clearly labels the mismatch; no accidental promotion of estimated revenue to verified data.
2. COD 0 shipped: no failed delivery cost, only configured per-created advertising/loss reserves; delivered-unpaid cases separate from undelivered cases.
3. PUM price COP 1,000 / 6 each: mathematical 166.67, truncated presentation 166.66, conditional legal explanation.
4. Portfolio small margins, uneven volumes and zero volume: break-even finite only where mathematically possible; shared fixed costs once.
5. Switch ES/PT/EN and check warnings; save/reload simulations and restore v1/v2 backups; cancel destructive modals; check PWA offline after loading static assets; verify 2.0.1 version label.

No GitHub Actions or release publishing is authorized. Record exceptions (including external browser E2E, full regulatory consolidations and simultaneous-write race tests) in PR notes.
