use crate::opencode::{GlobalConfig, OpenCodeManager, Status};
use serde_json::Value;
use std::path::PathBuf;
use tauri::AppHandle;

pub struct AppState {
    opencode: OpenCodeManager,
}

impl AppState {
    pub fn new(app: AppHandle) -> Self {
        Self {
            opencode: OpenCodeManager::new(app),
        }
    }

    pub async fn get_status(&self) -> Status {
        self.opencode.get_status().await
    }

    pub async fn get_installed_version(&self) -> Option<String> {
        self.opencode.get_installed_version().await
    }

    pub fn get_target_version(&self) -> String {
        self.opencode.get_target_version()
    }

    pub async fn download_opencode(&mut self, app: &AppHandle) -> Result<(), crate::opencode::Error> {
        self.opencode.download(app).await
    }

    pub async fn start_opencode_with_config(
        &mut self, 
        cors_origin: Option<String>,
        project_dir: Option<PathBuf>,
    ) -> Result<u16, crate::opencode::Error> {
        self.opencode.start(cors_origin, project_dir).await
    }

    pub async fn stop_opencode(&mut self) -> Result<(), crate::opencode::Error> {
        self.opencode.stop().await
    }

    pub fn get_port(&self) -> Option<u16> {
        self.opencode.get_port()
    }

    pub async fn check_update_available(&self) -> Result<bool, crate::opencode::Error> {
        self.opencode.check_update_available().await
    }

    pub async fn get_global_config(&self) -> GlobalConfig {
        self.opencode.get_global_config().await
    }

    pub async fn set_global_config(&self, config: Value) -> Result<(), crate::opencode::Error> {
        self.opencode.set_global_config(config).await
    }
}
