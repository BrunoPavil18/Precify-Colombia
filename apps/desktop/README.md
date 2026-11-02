# Precify Financy desktop pilot (Tauri 2)

**This is an experimental Windows shell, NOT the v2.1.0 public release.** The shared React/TypeScript application and exact money engine remain intact; Node is a build-time dependency only. The installed program launches its own WebView2 window instead of Chrome. Network calls use HTTPS, and site-owned connectors still require their server endpoints and credentials.

## Build (Windows 10/11 x64, Visual Studio C++ Build Tools, Rust stable, Node 22, pnpm 10)

From the repository root:

```powershell
pnpm install --frozen-lockfile
pnpm --filter @precify-financy/core build
pnpm --filter @precify-financy/web build
cd apps/desktop
pnpm dlx @tauri-apps/cli@2.12.4 build --no-bundle
cd ../..
.\scripts\package-desktop.ps1
```

For development run `pnpm dev` in one terminal, then `cd apps/desktop; pnpm dlx @tauri-apps/cli@2.12.4 dev` in another. The native build should output `apps/desktop/src-tauri/target/release/precify-financy.exe`; artifacts are generated under `dist/desktop/`.

## What the pilot proves
- A native Windows process/window: the topbar displays **APP WINDOWS** only after a real Tauri command returns the platform and version.
- WebView2 with local prebuilt frontend assets; Node and localhost HTTP servers are not bundled or required to run the binary.
- Existing calculator, local backup, dashboards, and optional remote HTTPS connectors are still available in the UI.

## Known boundaries
- The installed Tauri WebView has **its own separate localStorage and IndexedDB origin**. Data from Chrome/PWA is **not automatically copied**; export a v2 backup in the browser and restore it in the desktop app after confirming the original backup is saved.
- This pilot **does not migrate local storage to SQLite or implement business profiles**. Both require explicit data migrations and isolation tests.
- While the app window is closed, only the merchant's own server handles webhooks. Desktop synchronization resumes after the user reconnects/authenticates; this pilot does not install an unattended background Windows service.
- It is not a real Meta Ads authorization or hosted API deployment.
- The ZIP relies on the **Microsoft WebView2 Runtime** already installed by most Windows 10/11 machines; bundle a fixed WebView2 runtime for a genuinely offline-standalone release if required.
- A Tauri desktop app uses the OS WebView engine; test WebView2 specifically rather than assuming Chrome/Firefox parity.
- Tauri v2 supports raw binary IPC using `InvokeResponseBody::Raw` / `ArrayBuffer`. This experiment doesn't need a localhost bridge or a binary transfer protocol.

## Release pipeline
`scripts/package-desktop.ps1` produces the portable ZIP, optionally the Inno Setup installer, and SHA256 checksums. This reproduces MediaSuite's **distribution pattern**, without copying Qt, Python or unrelated MediaSuite code. Keep release/tag and main branch unchanged until owner acceptance.

## Multi-business preview (2026-11-02)

The v2.1.0 candidate now supports separate local business profiles, a multi-business overview and **native SQLite revisioned snapshots** via restricted Rust commands. The original browser workspace is kept under its historical storage keys; other businesses are namespaced. SQLite is a recoverable native mirror during this milestone, **not yet the sole authoritative store**. See [architecture and acceptance](../../docs/MULTI_BUSINESS_DESKTOP_V2_1_0.md) and [financial engine decision](../../docs/FINANCIAL_ENGINE_RUST_DECISION_2026-11-02.md).

The ZIP is **installation-free**, but its profile data are stored in the current Windows account's WebView2/Tauri application-data directories, **not in the extracted ZIP folder**. Copy your exported backups to move to another PC. WebView2 Runtime must be available.

The window title is now Precify Financy. GitHub Actions creates the desktop candidate and checks the frontend and native SQLite tests. The main branch remains untouched.
