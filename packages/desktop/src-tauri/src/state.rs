use crate::opencode::{OpenCodeManager, Status};
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

    pub async fn get_latest_version(&self) -> Result<String, crate::opencode::Error> {
        self.opencode.get_latest_version().await
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
}
