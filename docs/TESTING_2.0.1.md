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

## Focused PUM audit after visual report

The maintainer observed that selecting **g** displayed **kg** without explanation. This was historically intentional normalization, but confusing UX. Test both choices on the new **comparison unit** selector:

- Enter COP 1000 and content **500 g**. Output per **g** must be COP 2; change reference to **kg**, output COP 2000. The input must remain 500 g.
- Enter COP 1000 and **1500 ml**; expect COP 0.67/ml or COP 666.67/l.
- Enter COP 1000 and **150 cm**; expect COP 6.67/cm or COP 666.67/m.
- Switch source families: g only offers g/kg, ml only ml/l, cm only cm/m. Incompatible choices are rejected by core.
- Reopen existing saved PUM simulations from v2.0.0 (no `referenceUnit` field): they must load with a clear, matching source-unit comparison selected by default. Backup v1/v2 data structures are unchanged.
- Verify static translations in Spanish, Portuguese and English; mathematical and SIC-style truncated values remain distinct.

This change requires a new local typecheck, test and build after the commit; do not rely on prior green results.
