# Precify Financy v2.1.0 — Tauri 2 Windows pilot (2026-11-02)

## State
**Windows build + packaging verified; real end-user desktop runtime acceptance still pending.** This does not publish, merge, or replace the Precify browser PWA. This proof of concept is meant to evaluate Tauri prior to an optional future Registrum migration.

- Branch: `feat/precify-financy-v2.1.0`, PR [#4](https://github.com/BrunoPavil18/Precify-Financy/pull/4) (DRAFT).
- Windows GitHub Actions: **SUCCESS**, [run #41375253548](https://github.com/BrunoPavil18/Precify-Financy/actions/runs/41375253548), source commit `fd253ef3fa6a1dcd1b5a56435c09d1e50fac8127`.
- The job ran `pnpm verify:2.1.0`, compiled Rust/Tauri 2 into `precify-financy.exe`, built Inno Setup and portable ZIP, and uploaded the `Precify-Financy-Tauri2-Windows-pilot` artifact.
- The temporary feature-only workflow and its single-run trigger have been removed after success to conserve Actions minutes. Runtime code is unchanged by this docs-only cleanup.

## Distribution outputs

| File | Format | Approximate size | SHA-256 |
|---|---|---:|---|
| `Precify-Financy-2.1.0-setup.exe` | Inno installer, x64 | 3.40 MiB | `b7209b661619c3778e3b969161eb3b0733dccbe390e2dd3f4a86f30d57278537` |
| `Precify-Financy-2.1.0-win64.zip` | Portable binary and readme | 1.79 MiB | `62999735369d2d774eae37abf0afcf758b136d704b20f47e37f0c2da4ed19a68` |
| `SHA256SUMS.txt` | Checksums | — | Generated from both output files |

Download the three files from the successful Actions artifact, or from the ChatGPT conversation attachment that materialized the same archive.

## Technical architecture

- `apps/desktop/src-tauri/` contains Tauri 2 manifest, Cargo Rust binary, restricted capability and Windows icon.
- A native Rust command `desktop_runtime` reports OS, architecture and installed version. A second command `ipc_probe` returns bytes as `tauri::ipc::Response` for raw `ArrayBuffer` IPC verification; JS displays an APP WINDOWS badge after successful native handshake.
- Financial logic is still in `@precify-financy/core` (TypeScript/BigInt). The existing PWA remains available, and the app ships with its static React build.
- Node/pnpm compile assets but are not distributed or required by the end user's binary.
- The native window uses Windows Microsoft WebView2. The portable ZIP **does not embed or install the separate WebView2 runtime**. A fully offline bundle must add an official runtime package or fixed-version distribution.
- This proof-of-concept uses a Tauri global bridge limited by `capabilities/default.json`; production hardening may replace it with an imported typed API and narrower capabilities.
- No local Node server or localhost IPC HTTP proxy is necessary for this pilot; outbound HTTPS still requires normal per-provider authentication, correct web origins/CORS, and consent.
- No browser-to-native data migration happens silently. Import a backup manually before treating the native storage as authoritative.
- No arbitrary filesystem or shell plugin access was granted; no upstream webhooks or authentication flows were exercised.

## Owner acceptance checklist

1. On Windows 10/11 x64 with Microsoft WebView2 installed, run the portable `precify-financy.exe` from the extracted directory. Confirm that a distinct native window opens (not Chrome).
2. Confirm **APP WINDOWS** appears in the app topbar. Hover it to verify the runtime/version and whether the raw binary IPC probe was accepted as `ArrayBuffer`.
3. Test calculator and scenarios offline and confirm no Node process or browser tab needs to remain open.
4. Before transferring real data, export a backup from the Chrome/PWA version. In the native app, restore the backup, compare records and export another backup. Preserve the original file.
5. Close and reopen the application. Confirm saved products persist in the native local storage without needing internet.
6. If the device is online, test only authorized HTTPS connections that have matching CORS/origin configuration; do not expose API secrets in the frontend.
7. Test Inno installation/uninstall and the portable ZIP separately, and assess idle RAM, startup latency, memory footprint and Windows SmartScreen warnings from the unsigned pilot.
8. Check the app's normal transitions and compare its visual quality with the browser. WebView2 may differ from Chrome in subtle ways.

## Explicitly NOT part of this pilot
- Site-specific financial profiles, SQLite migration and consolidated all-sites financial dashboard.
- Hosted connected API deployment, Meta Ads OAuth production access, native Windows background sync, versioned auto-update, app signing and a fully self-contained offline WebView2 runtime.
- Any Vezura or Registrum changes, or an official v2.1.0 public release.
