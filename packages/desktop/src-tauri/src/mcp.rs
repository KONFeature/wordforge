use std::path::PathBuf;
use thiserror::Error;
use tracing::info;

#[derive(Debug, Error)]
pub enum McpError {
    #[error("MCP sidecar not found at expected location")]
    SidecarNotFound,
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Failed to resolve sidecar path")]
    PathResolutionFailed,
}

pub struct McpSidecar;

impl McpSidecar {
    pub fn get_sidecar_path() -> Result<PathBuf, McpError> {
        let exe_path = std::env::current_exe().map_err(|_| McpError::PathResolutionFailed)?;
        let exe_dir = exe_path.parent().ok_or(McpError::PathResolutionFailed)?;

        #[cfg(target_os = "windows")]
        let sidecar_name = "wordforge-mcp.exe";
        #[cfg(not(target_os = "windows"))]
        let sidecar_name = "wordforge-mcp";

        let sidecar_path = exe_dir.join(sidecar_name);

        if sidecar_path.exists() {
            info!("Found MCP sidecar at: {:?}", sidecar_path);
            Ok(sidecar_path)
        } else {
            info!("MCP sidecar not found at: {:?}", sidecar_path);
            Err(McpError::SidecarNotFound)
        }
    }

    pub fn is_available() -> bool {
        Self::get_sidecar_path().is_ok()
    }

    pub fn copy_to_project_dir(project_dir: &PathBuf) -> Result<PathBuf, McpError> {
        let sidecar_path = Self::get_sidecar_path()?;

        #[cfg(target_os = "windows")]
        let dest_name = "wordforge-mcp.exe";
        #[cfg(not(target_os = "windows"))]
        let dest_name = "wordforge-mcp";

        let opencode_dir = project_dir.join(".opencode");
        std::fs::create_dir_all(&opencode_dir)?;

        let dest_path = opencode_dir.join(dest_name);

        if dest_path.exists() {
            let src_meta = std::fs::metadata(&sidecar_path)?;
            let dest_meta = std::fs::metadata(&dest_path)?;

            if src_meta.len() == dest_meta.len() {
                info!(
                    "MCP binary already exists at {:?} with same size, skipping copy",
                    dest_path
                );
                return Ok(dest_path);
            }
        }

        std::fs::copy(&sidecar_path, &dest_path)?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = std::fs::metadata(&dest_path)?.permissions();
            perms.set_mode(0o755);
            std::fs::set_permissions(&dest_path, perms)?;
        }

        info!("Copied MCP sidecar to: {:?}", dest_path);
        Ok(dest_path)
    }

    pub fn get_command_for_config() -> Vec<String> {
        #[cfg(target_os = "windows")]
        let binary = "./.opencode/wordforge-mcp.exe";
        #[cfg(not(target_os = "windows"))]
        let binary = "./.opencode/wordforge-mcp";

        vec![binary.to_string()]
    }
}
