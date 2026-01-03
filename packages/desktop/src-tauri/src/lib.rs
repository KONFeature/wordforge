mod opencode;
mod sites;
mod state;

use sites::{SiteManager, WordPressSite};
use state::AppState;
use std::sync::Arc;
use tauri::{Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;
use tokio::sync::Mutex;
use tracing::info;

#[derive(Clone, serde::Serialize)]
struct DeepLinkPayload {
    url: String,
    site_url: String,
    token: String,
    name: String,
}



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
    site_manager: tauri::State<'_, Arc<Mutex<SiteManager>>>,
) -> Result<u16, String> {
    let mut state = state.lock().await;
    let site_manager = site_manager.lock().await;
    
    let cors_origin = site_manager
        .get_active_site()
        .map(|s| s.url.clone());
    
    let project_dir = site_manager
        .get_active_site()
        .map(|s| s.project_dir.clone());
    
    state.start_opencode_with_config(cors_origin, project_dir).await.map_err(|e| e.to_string())
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

#[tauri::command]
async fn list_sites(
    site_manager: tauri::State<'_, Arc<Mutex<SiteManager>>>,
) -> Result<Vec<WordPressSite>, String> {
    let manager = site_manager.lock().await;
    Ok(manager.list_sites().into_iter().cloned().collect())
}

#[tauri::command]
async fn get_active_site(
    site_manager: tauri::State<'_, Arc<Mutex<SiteManager>>>,
) -> Result<Option<WordPressSite>, String> {
    let manager = site_manager.lock().await;
    Ok(manager.get_active_site().cloned())
}

#[tauri::command]
async fn set_active_site(
    site_manager: tauri::State<'_, Arc<Mutex<SiteManager>>>,
    id: String,
) -> Result<(), String> {
    let mut manager = site_manager.lock().await;
    manager.set_active_site(&id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn remove_site(
    site_manager: tauri::State<'_, Arc<Mutex<SiteManager>>>,
    id: String,
) -> Result<(), String> {
    let mut manager = site_manager.lock().await;
    manager.remove_site(&id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn connect_site(
    site_manager: tauri::State<'_, Arc<Mutex<SiteManager>>>,
    site_url: String,
    token: String,
) -> Result<WordPressSite, String> {
    let mut manager = site_manager.lock().await;
    manager.exchange_token(&site_url, &token).await.map_err(|e| e.to_string())
}

fn handle_deep_link(app: &tauri::AppHandle, urls: Vec<url::Url>) {
    for url in urls {
        let url_str = url.to_string();
        info!("Received deep link: {}", url_str);

        match SiteManager::parse_connect_url(&url_str) {
            Ok((site_url, token, name)) => {
                app.emit("deep-link:connect", DeepLinkPayload {
                    url: url_str,
                    site_url,
                    token,
                    name,
                }).ok();
                
                if let Some(window) = app.get_webview_window("main") {
                    window.set_focus().ok();
                }
            }
            Err(e) => {
                info!("Failed to parse deep link: {}", e);
            }
        }
    }
}

fn handle_cli_deep_link(app: &tauri::AppHandle, args: &[String]) {
    for arg in args {
        if arg.starts_with("wordforge://") {
            if let Ok(url) = url::Url::parse(arg) {
                handle_deep_link(app, vec![url]);
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            info!("Single instance callback: {:?}", argv);
            handle_cli_deep_link(app, &argv);
            
            if let Some(window) = app.get_webview_window("main") {
                window.set_focus().ok();
                window.unminimize().ok();
            }
        }))
        .setup(|app| {
            let app_state = Arc::new(Mutex::new(AppState::new(app.handle().clone())));
            app.manage(app_state);
            
            let site_manager = Arc::new(Mutex::new(SiteManager::new()));
            app.manage(site_manager);

            #[cfg(any(target_os = "linux", target_os = "windows"))]
            {
                if let Err(e) = app.deep_link().register_all() {
                    info!("Failed to register deep links: {}", e);
                }
            }

            if let Ok(Some(urls)) = app.deep_link().get_current() {
                info!("App started via deep link: {:?}", urls);
                handle_deep_link(app.handle(), urls);
            }

            let app_handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                let urls = event.urls();
                info!("Deep link event: {:?}", urls);
                handle_deep_link(&app_handle, urls);
            });

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
            list_sites,
            get_active_site,
            set_active_site,
            remove_site,
            connect_site,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
