mod opencode;
mod state;

use state::AppState;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;

#[tauri::command]
async fn get_status(state: tauri::State<'_, Arc<Mutex<AppState>>>) -> Result<opencode::Status, String> {
    let state = state.lock().await;
    Ok(state.get_status().await)
}

#[tauri::command]
async fn get_installed_version(
    state: tauri::State<'_, Arc<Mutex<AppState>>>,
) -> Result<Option<String>, String> {
    let state = state.lock().await;
    Ok(state.get_installed_version().await)
}

#[tauri::command]
async fn get_latest_version(
    state: tauri::State<'_, Arc<Mutex<AppState>>>,
) -> Result<String, String> {
    let state = state.lock().await;
    state.get_latest_version().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn download_opencode(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<Mutex<AppState>>>,
) -> Result<(), String> {
    let mut state = state.lock().await;
    state.download_opencode(&app).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn start_opencode(
    state: tauri::State<'_, Arc<Mutex<AppState>>>,
) -> Result<u16, String> {
    let mut state = state.lock().await;
    state.start_opencode().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn stop_opencode(
    state: tauri::State<'_, Arc<Mutex<AppState>>>,
) -> Result<(), String> {
    let mut state = state.lock().await;
    state.stop_opencode().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_opencode_port(
    state: tauri::State<'_, Arc<Mutex<AppState>>>,
) -> Result<Option<u16>, String> {
    let state = state.lock().await;
    Ok(state.get_port())
}

#[tauri::command]
async fn open_opencode_view(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<Mutex<AppState>>>,
) -> Result<(), String> {
    let state = state.lock().await;
    let port = state.get_port().ok_or("OpenCode is not running")?;

    if let Some(window) = app.get_webview_window("opencode") {
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    let url = format!("http://localhost:{}", port);
    tauri::WebviewWindowBuilder::new(&app, "opencode", tauri::WebviewUrl::External(url.parse().unwrap()))
        .title("OpenCode - WordForge")
        .inner_size(1400.0, 900.0)
        .min_inner_size(1000.0, 700.0)
        .center()
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn check_update_available(
    state: tauri::State<'_, Arc<Mutex<AppState>>>,
) -> Result<bool, String> {
    let state = state.lock().await;
    state.check_update_available().await.map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            let app_state = Arc::new(Mutex::new(AppState::new(app.handle().clone())));
            app.manage(app_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_status,
            get_installed_version,
            get_latest_version,
            download_opencode,
            start_opencode,
            stop_opencode,
            get_opencode_port,
            open_opencode_view,
            check_update_available,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
