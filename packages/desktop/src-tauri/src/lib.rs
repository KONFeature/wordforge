mod opencode;
mod sites;
mod state;

use sites::{ConfigSyncStatus, SiteManager, WordPressSite};
use state::AppState;
use std::collections::HashSet;
use std::sync::Arc;
use tauri::{Emitter, Listener, Manager, RunEvent};
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

struct ProcessedTokens {
    tokens: HashSet<String>,
}

impl ProcessedTokens {
    fn new() -> Self {
        Self {
            tokens: HashSet::new(),
        }
    }

    fn is_new(&mut self, token: &str) -> bool {
        self.tokens.insert(token.to_string())
    }
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
    let mut site_manager = site_manager.lock().await;
    
    let device_id = site_manager.get_device_id();
    let active_site = site_manager.get_active_site().cloned();
    
    let cors_origin = active_site.as_ref().map(|s| s.url.clone());
    let project_dir = active_site.as_ref().map(|s| s.project_dir.clone());
    
    let port = state.start_opencode_with_config(cors_origin, project_dir).await.map_err(|e| e.to_string())?;
    
    if let Some(site) = active_site {
        if let Err(e) = site_manager.sync_port_to_wordpress(&site, port, &device_id).await {
            tracing::warn!("Failed to sync port to WordPress: {}", e);
        }
    }
    
    Ok(port)
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
    state: tauri::State<'_, Arc<Mutex<AppState>>>,
    site_manager: tauri::State<'_, Arc<Mutex<SiteManager>>>,
    id: String,
) -> Result<(), String> {
    let mut manager = site_manager.lock().await;
    
    let is_active_site = manager.get_active_site().map(|s| s.id.as_str()) == Some(&id);
    if is_active_site {
        drop(manager);
        let mut app_state = state.lock().await;
        app_state.stop_opencode().await.ok();
        drop(app_state);
        manager = site_manager.lock().await;
    }
    
    manager.remove_site(&id).map_err(|e| e.to_string())
}

#[tauri::command]
async fn open_site_folder(
    site_manager: tauri::State<'_, Arc<Mutex<SiteManager>>>,
    id: String,
) -> Result<(), String> {
    let manager = site_manager.lock().await;
    let folder = manager.get_site_folder(&id)
        .ok_or_else(|| "Site not found".to_string())?;
    
    open::that(&folder).map_err(|e| e.to_string())
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

#[tauri::command]
async fn check_config_update(
    site_manager: tauri::State<'_, Arc<Mutex<SiteManager>>>,
    site_id: Option<String>,
) -> Result<ConfigSyncStatus, String> {
    let manager = site_manager.lock().await;
    
    let site = match site_id {
        Some(id) => manager.get_site(&id).cloned(),
        None => manager.get_active_site().cloned(),
    };
    
    let site = site.ok_or_else(|| "No site found".to_string())?;
    
    let remote_hash = manager.check_config_hash(&site)
        .await
        .map(|r| r.hash)
        .ok();
    
    Ok(manager.get_config_sync_status(&site, remote_hash.as_deref()))
}

#[tauri::command]
async fn refresh_site_config(
    app: tauri::AppHandle,
    state: tauri::State<'_, Arc<Mutex<AppState>>>,
    site_manager: tauri::State<'_, Arc<Mutex<SiteManager>>>,
    site_id: Option<String>,
    restart_opencode: bool,
) -> Result<String, String> {
    let mut manager = site_manager.lock().await;
    
    let id = match site_id {
        Some(id) => id,
        None => manager.get_active_site()
            .map(|s| s.id.clone())
            .ok_or_else(|| "No active site".to_string())?,
    };
    
    if restart_opencode {
        drop(manager);
        let mut app_state = state.lock().await;
        let was_running = app_state.get_port().is_some();
        
        if was_running {
            app_state.stop_opencode().await.map_err(|e| e.to_string())?;
        }
        drop(app_state);
        
        manager = site_manager.lock().await;
        let new_hash = manager.refresh_site_config(&id).await.map_err(|e| e.to_string())?;
        drop(manager);
        
        if was_running {
            let mut app_state = state.lock().await;
            let mut site_mgr = site_manager.lock().await;
            
            let device_id = site_mgr.get_device_id();
            let active_site = site_mgr.get_active_site().cloned();
            let cors_origin = active_site.as_ref().map(|s| s.url.clone());
            let project_dir = active_site.as_ref().map(|s| s.project_dir.clone());
            
            let port = app_state.start_opencode_with_config(cors_origin, project_dir)
                .await
                .map_err(|e| e.to_string())?;
            
            if let Some(site) = active_site {
                site_mgr.sync_port_to_wordpress(&site, port, &device_id).await.ok();
            }
        }
        
        app.emit("config:updated", &new_hash).ok();
        Ok(new_hash)
    } else {
        let new_hash = manager.refresh_site_config(&id).await.map_err(|e| e.to_string())?;
        app.emit("config:updated", &new_hash).ok();
        Ok(new_hash)
    }
}

fn handle_deep_link(app: &tauri::AppHandle, processed: &Arc<std::sync::Mutex<ProcessedTokens>>, urls: Vec<url::Url>) {
    for url in urls {
        let url_str = url.to_string();
        info!("Received deep link: {}", url_str);

        match SiteManager::parse_connect_url(&url_str) {
            Ok((site_url, token, name)) => {
                let mut processed = processed.lock().unwrap();
                if !processed.is_new(&token) {
                    info!("Token already processed, skipping: {}", &token[..8.min(token.len())]);
                    continue;
                }
                drop(processed);

                info!("Processing new token for site: {}", site_url);
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

fn handle_cli_deep_link(app: &tauri::AppHandle, processed: &Arc<std::sync::Mutex<ProcessedTokens>>, args: &[String]) {
    for arg in args {
        if arg.starts_with("wordforge://") {
            if let Ok(url) = url::Url::parse(arg) {
                handle_deep_link(app, processed, vec![url]);
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let processed_tokens = Arc::new(std::sync::Mutex::new(ProcessedTokens::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_deep_link::init())
        .plugin({
            let processed = processed_tokens.clone();
            tauri_plugin_single_instance::init(move |app, argv, _cwd| {
                info!("Single instance callback: {:?}", argv);
                handle_cli_deep_link(app, &processed, &argv);
                
                if let Some(window) = app.get_webview_window("main") {
                    window.set_focus().ok();
                    window.unminimize().ok();
                }
            })
        })
        .setup(move |app| {
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
                handle_deep_link(app.handle(), &processed_tokens, urls);
            }

            let app_handle = app.handle().clone();
            let processed = processed_tokens.clone();
            app.deep_link().on_open_url(move |event| {
                let urls = event.urls();
                info!("Deep link event: {:?}", urls);
                handle_deep_link(&app_handle, &processed, urls);
            });

            let app_handle = app.handle().clone();
            app.listen("opencode:idle-shutdown", move |_| {
                info!("Received idle-shutdown event, stopping OpenCode");
                let app = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    let state = app.state::<Arc<Mutex<AppState>>>();
                    let mut state = state.lock().await;
                    state.stop_opencode().await.ok();
                });
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
            open_site_folder,
            check_config_update,
            refresh_site_config,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                info!("App exiting, stopping OpenCode");
                let state = app.state::<Arc<Mutex<AppState>>>();
                tauri::async_runtime::block_on(async {
                    let mut state = state.lock().await;
                    state.stop_opencode().await.ok();
                });
            }
        });
}
