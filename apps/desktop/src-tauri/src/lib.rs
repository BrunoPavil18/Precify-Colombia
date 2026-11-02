//! Minimal desktop bridge. Financial calculations remain in the shared TypeScript core.
//! Never expose tokens, privileged filesystem commands or arbitrary URL fetching over IPC.
use serde::Serialize;
mod native_snapshots;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopRuntime {
    platform: &'static str,
    architecture: &'static str,
    app_version: &'static str,
    runtime: &'static str,
}

#[tauri::command]
fn desktop_runtime() -> DesktopRuntime {
    DesktopRuntime {
        platform: std::env::consts::OS,
        architecture: std::env::consts::ARCH,
        app_version: env!("CARGO_PKG_VERSION"),
        runtime: "tauri-v2",
    }
}

/// A tiny raw-byte IPC probe; consumers receive ArrayBuffer rather than a JSON string.
#[tauri::command]
fn ipc_probe() -> tauri::ipc::Response {
    tauri::ipc::Response::new(b"precify-ipc-v2".to_vec())
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![desktop_runtime, ipc_probe, native_snapshots::desktop_snapshot_get, native_snapshots::desktop_snapshot_put])
        .run(tauri::generate_context!())
        .expect("failed to run Precify Financy desktop");
}
