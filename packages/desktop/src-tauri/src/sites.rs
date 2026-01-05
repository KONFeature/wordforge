use deunicode::deunicode;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::PathBuf;
use thiserror::Error;
use uuid::Uuid;
use zip::ZipArchive;

#[derive(Debug, Error)]
pub enum SiteError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("ZIP error: {0}")]
    Zip(#[from] zip::result::ZipError),
    #[error("Token exchange failed: {0}")]
    TokenExchange(String),
    #[error("Config download failed: {0}")]
    ConfigDownload(String),
    #[error("Site not found: {0}")]
    NotFound(String),
    #[error("Invalid URL: {0}")]
    InvalidUrl(String),
    #[error("API error: {0}")]
    ApiError(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordPressSite {
    pub id: String,
    pub name: String,
    pub url: String,
    pub rest_url: String,
    pub mcp_endpoint: String,
    pub abilities_url: String,
    pub username: String,
    pub app_password: String,
    pub auth: String,
    pub project_dir: PathBuf,
    pub created_at: u64,
    pub last_used_at: u64,
    #[serde(default)]
    pub config_hash: Option<String>,
    #[serde(default)]
    pub config_updated_at: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct ExchangeResponse {
    success: bool,
    credentials: Credentials,
    site: SiteInfo,
}

#[derive(Debug, Deserialize)]
struct Credentials {
    username: String,
    #[serde(rename = "appPassword")]
    app_password: String,
    auth: String,
}

#[derive(Debug, Deserialize)]
struct SiteInfo {
    name: String,
    url: String,
    #[serde(rename = "restUrl")]
    rest_url: String,
    #[serde(rename = "mcpEndpoint")]
    mcp_endpoint: String,
    #[serde(rename = "abilitiesUrl")]
    abilities_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigHashResponse {
    pub hash: String,
    pub components: ConfigHashComponents,
    pub generated: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigHashComponents {
    pub plugins_hash: String,
    pub theme_hash: String,
    pub agents_hash: String,
    pub providers_hash: String,
    pub woo_active: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct ConfigSyncStatus {
    pub update_available: bool,
    pub current_hash: Option<String>,
    pub remote_hash: Option<String>,
    pub last_checked: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SitesStore {
    pub sites: HashMap<String, WordPressSite>,
    pub active_site_id: Option<String>,
    pub device_id: Option<String>,
}

pub struct SiteManager {
    client: Client,
    store: SitesStore,
    store_path: PathBuf,
}

impl SiteManager {
    pub fn new() -> Self {
        let store_path = dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("wordforge")
            .join(".sites.json");

        let store = Self::load_store(&store_path).unwrap_or_default();

        Self {
            client: Client::new(),
            store,
            store_path,
        }
    }

    fn load_store(path: &PathBuf) -> Option<SitesStore> {
        let content = std::fs::read_to_string(path).ok()?;
        serde_json::from_str(&content).ok()
    }

    async fn save_store(&self) -> Result<(), SiteError> {
        let path = self.store_path.clone();
        let content = serde_json::to_string_pretty(&self.store)?;
        
        tokio::task::spawn_blocking(move || {
            if let Some(parent) = path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            std::fs::write(&path, content)?;
            Ok::<(), SiteError>(())
        })
        .await
        .map_err(|e| SiteError::Io(std::io::Error::other(format!("Task join error: {e}"))))?
    }

    pub async fn exchange_token(&mut self, site_url: &str, token: &str) -> Result<WordPressSite, SiteError> {
        let base_url = site_url.trim_end_matches('/');
        let exchange_url = format!("{}/wp-json/wordforge/v1/desktop/exchange", base_url);
        
        tracing::info!("Exchanging token with: {}", exchange_url);
        
        let response = self.client
            .post(&exchange_url)
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({ "token": token }))
            .send()
            .await?;

        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        
        tracing::info!("Exchange response status: {}", status);

        if !status.is_success() {
            return Err(SiteError::TokenExchange(format!("HTTP {}: {}", status, body)));
        }

        let exchange_response: ExchangeResponse = serde_json::from_str(&body)
            .map_err(|e| SiteError::TokenExchange(format!("Failed to parse response: {}. Body: {}", e, &body[..body.len().min(200)])))?;

        if !exchange_response.success {
            return Err(SiteError::TokenExchange("Exchange failed".into()));
        }

        let site_id = Uuid::new_v4().to_string();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let project_dir = self.create_project_dir(&exchange_response.site.name)?;
        Self::ensure_opencode_project(&project_dir)?;
        
        self.download_and_extract_config(
            base_url,
            &exchange_response.credentials.auth,
            &project_dir,
        ).await?;

        let temp_site = WordPressSite {
            id: site_id.clone(),
            name: exchange_response.site.name.clone(),
            url: exchange_response.site.url.clone(),
            rest_url: exchange_response.site.rest_url.clone(),
            mcp_endpoint: exchange_response.site.mcp_endpoint.clone(),
            abilities_url: exchange_response.site.abilities_url.clone(),
            username: exchange_response.credentials.username.clone(),
            app_password: exchange_response.credentials.app_password.clone(),
            auth: exchange_response.credentials.auth.clone(),
            project_dir: project_dir.clone(),
            created_at: now,
            last_used_at: now,
            config_hash: None,
            config_updated_at: None,
        };

        let config_hash = self.check_config_hash(&temp_site).await.ok().map(|r| r.hash);

        let site = WordPressSite {
            id: site_id.clone(),
            name: exchange_response.site.name,
            url: exchange_response.site.url,
            rest_url: exchange_response.site.rest_url,
            mcp_endpoint: exchange_response.site.mcp_endpoint,
            abilities_url: exchange_response.site.abilities_url,
            username: exchange_response.credentials.username,
            app_password: exchange_response.credentials.app_password,
            auth: exchange_response.credentials.auth,
            project_dir,
            created_at: now,
            last_used_at: now,
            config_hash,
            config_updated_at: Some(now),
        };

        self.store.sites.insert(site_id.clone(), site.clone());
        self.store.active_site_id = Some(site_id);
        self.save_store().await?;

        Ok(site)
    }

    pub async fn sync_port_to_wordpress(&self, site: &WordPressSite, port: u16, device_id: &str) -> Result<(), SiteError> {
        let settings_url = format!("{}/wp-json/wordforge/v1/opencode/local-settings", site.url.trim_end_matches('/'));
        let project_id = Self::generate_opencode_project_id(&site.project_dir);
        let project_dir = site.project_dir.to_string_lossy().to_string();
        
        tracing::info!("Syncing port {} (device: {}, project: {}) to WordPress", port, device_id, project_id);

        let response = self.client
            .post(&settings_url)
            .header("Authorization", format!("Basic {}", site.auth))
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "port": port,
                "device_id": device_id,
                "enabled": true,
                "project_id": project_id,
                "project_dir": project_dir
            }))
            .send()
            .await?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(SiteError::ApiError(format!("Failed to sync settings: {}", body)));
        }

        tracing::info!("Settings synced successfully");
        Ok(())
    }

    async fn download_and_extract_config(
        &self,
        base_url: &str,
        auth: &str,
        project_dir: &PathBuf,
    ) -> Result<(), SiteError> {
        // Use runtime=bun to get the MCP server as plain JavaScript
        // OpenCode's bundled Bun runtime will execute it
        let config_url = format!(
            "{}/wp-json/wordforge/v1/opencode/local-config?runtime=bun",
            base_url
        );
        
        tracing::info!("Downloading config from: {}", config_url);

        let response = self.client
            .get(&config_url)
            .header("Authorization", format!("Basic {}", auth))
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(SiteError::ConfigDownload(format!("HTTP {}: {}", status, body)));
        }

        let bytes = response.bytes().await?;
        tracing::info!("Downloaded {} bytes", bytes.len());

        let cursor = std::io::Cursor::new(bytes.as_ref());
        let mut archive = ZipArchive::new(cursor)?;

        for i in 0..archive.len() {
            let mut file = archive.by_index(i)?;
            let outpath = project_dir.join(file.name());

            if file.name().ends_with('/') {
                std::fs::create_dir_all(&outpath)?;
            } else {
                if let Some(parent) = outpath.parent() {
                    std::fs::create_dir_all(parent)?;
                }
                let mut outfile = std::fs::File::create(&outpath)?;
                let mut contents = Vec::new();
                file.read_to_end(&mut contents)?;
                outfile.write_all(&contents)?;
            }

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Some(mode) = file.unix_mode() {
                    std::fs::set_permissions(&outpath, std::fs::Permissions::from_mode(mode))?;
                }
            }
        }

        tracing::info!("Extracted config to: {:?}", project_dir);
        
        Ok(())
    }

    fn create_project_dir(&self, site_name: &str) -> Result<PathBuf, SiteError> {
        let sanitized = Self::sanitize_site_name(site_name);

        let base_dir = dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("wordforge")
            .join("sites")
            .join(&sanitized);

        std::fs::create_dir_all(&base_dir)?;
        Ok(base_dir)
    }

    fn sanitize_site_name(site_name: &str) -> String {
        let ascii = deunicode(site_name);
        
        let sanitized: String = ascii
            .chars()
            .map(|c| {
                if c.is_ascii_alphanumeric() || c == '-' || c == '_' {
                    c.to_ascii_lowercase()
                } else {
                    '-'
                }
            })
            .collect();

        let mut result = String::new();
        let mut last_was_hyphen = true;
        for c in sanitized.chars() {
            if c == '-' {
                if !last_was_hyphen {
                    result.push(c);
                    last_was_hyphen = true;
                }
            } else {
                result.push(c);
                last_was_hyphen = false;
            }
        }

        if result.ends_with('-') {
            result.pop();
        }

        if result.is_empty() {
            return "wordpress-site".to_string();
        }

        result
    }

    pub fn get_site_folder(&self, id: &str) -> Option<PathBuf> {
        self.store.sites.get(id).map(|site| site.project_dir.clone())
    }

    pub async fn get_device_id(&mut self) -> String {
        if let Some(id) = &self.store.device_id {
            return id.clone();
        }
        
        let device_id = Uuid::new_v4().to_string();
        self.store.device_id = Some(device_id.clone());
        if let Err(e) = self.save_store().await {
            tracing::warn!("Failed to persist device ID: {}", e);
        }
        device_id
    }

    pub fn list_sites(&self) -> Vec<&WordPressSite> {
        self.store.sites.values().collect()
    }

    pub fn get_site(&self, id: &str) -> Option<&WordPressSite> {
        self.store.sites.get(id)
    }

    pub fn get_active_site(&self) -> Option<&WordPressSite> {
        self.store.active_site_id
            .as_ref()
            .and_then(|id| self.store.sites.get(id))
    }

    pub async fn set_active_site(&mut self, id: &str) -> Result<(), SiteError> {
        if !self.store.sites.contains_key(id) {
            return Err(SiteError::NotFound(id.to_string()));
        }
        self.store.active_site_id = Some(id.to_string());
        
        if let Some(site) = self.store.sites.get_mut(id) {
            site.last_used_at = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();
        }
        
        self.save_store().await?;
        Ok(())
    }

    pub async fn remove_site(&mut self, id: &str) -> Result<(), SiteError> {
        if let Some(site) = self.store.sites.get(id) {
            if let Err(e) = self.cleanup_opencode_project(&site.project_dir) {
                tracing::warn!("Failed to cleanup OpenCode project: {}", e);
            }
        }
        
        self.store.sites.remove(id);
        
        if self.store.active_site_id.as_deref() == Some(id) {
            self.store.active_site_id = self.store.sites.keys().next().cloned();
        }
        
        self.save_store().await?;
        Ok(())
    }

    pub fn parse_connect_url(url: &str) -> Result<(String, String, String), SiteError> {
        let parsed = url::Url::parse(url)
            .map_err(|e| SiteError::InvalidUrl(e.to_string()))?;

        if parsed.scheme() != "wordforge" {
            return Err(SiteError::InvalidUrl("Invalid scheme".into()));
        }

        let params: HashMap<String, String> = parsed
            .query_pairs()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();

        let token = params.get("token")
            .ok_or_else(|| SiteError::InvalidUrl("Missing token".into()))?
            .clone();

        let site = params.get("site")
            .ok_or_else(|| SiteError::InvalidUrl("Missing site".into()))?
            .clone();

        let name = params.get("name")
            .map(|n| urlencoding::decode(n).unwrap_or_default().to_string())
            .unwrap_or_else(|| "WordPress Site".to_string());

        Ok((site, token, name))
    }

    pub async fn check_config_hash(&self, site: &WordPressSite) -> Result<ConfigHashResponse, SiteError> {
        let hash_url = format!("{}/wp-json/wordforge/v1/desktop/config-hash", site.url.trim_end_matches('/'));
        
        tracing::info!("Checking config hash from: {}", hash_url);

        let response = self.client
            .get(&hash_url)
            .header("Authorization", format!("Basic {}", site.auth))
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(SiteError::ApiError(format!("HTTP {}: {}", status, body)));
        }

        let hash_response: ConfigHashResponse = response.json().await?;
        tracing::info!("Remote config hash: {}", hash_response.hash);
        
        Ok(hash_response)
    }

    pub fn get_config_sync_status(&self, site: &WordPressSite, remote_hash: Option<&str>) -> ConfigSyncStatus {
        let current_hash = site.config_hash.clone();
        let update_available = match (&current_hash, remote_hash) {
            (Some(current), Some(remote)) => current != remote,
            (None, Some(_)) => true,
            _ => false,
        };

        ConfigSyncStatus {
            update_available,
            current_hash,
            remote_hash: remote_hash.map(String::from),
            last_checked: Some(std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs()),
        }
    }

    pub async fn refresh_site_config(&mut self, site_id: &str) -> Result<String, SiteError> {
        let site = self.store.sites.get(site_id)
            .ok_or_else(|| SiteError::NotFound(site_id.to_string()))?
            .clone();

        let hash_response = self.check_config_hash(&site).await?;
        
        self.download_and_extract_config(
            site.url.trim_end_matches('/'),
            &site.auth,
            &site.project_dir,
        ).await?;

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        if let Some(stored_site) = self.store.sites.get_mut(site_id) {
            stored_site.config_hash = Some(hash_response.hash.clone());
            stored_site.config_updated_at = Some(now);
        }
        
        self.save_store().await?;
        
        tracing::info!("Refreshed config for site {}, new hash: {}", site_id, hash_response.hash);
        Ok(hash_response.hash)
    }

    pub fn generate_opencode_project_id(project_dir: &PathBuf) -> String {
        let path_str = project_dir.to_string_lossy();
        let mut hasher = Sha256::new();
        hasher.update(path_str.as_bytes());
        let result = hasher.finalize();
        hex::encode(&result[..20])
    }

    pub fn ensure_opencode_project(project_dir: &PathBuf) -> Result<String, SiteError> {
        let project_id = Self::generate_opencode_project_id(project_dir);
        let git_dir = project_dir.join(".git");
        let opencode_file = git_dir.join("opencode");

        std::fs::create_dir_all(&git_dir)?;
        std::fs::write(&opencode_file, &project_id)?;

        tracing::info!("Created OpenCode project {} at {:?}", project_id, project_dir);
        Ok(project_id)
    }

    pub fn cleanup_opencode_project(&self, project_dir: &PathBuf) -> Result<(), SiteError> {
        let project_id = Self::generate_opencode_project_id(project_dir);
        
        let git_dir = project_dir.join(".git");
        if git_dir.exists() {
            std::fs::remove_dir_all(&git_dir)?;
            tracing::info!("Removed .git directory from {:?}", project_dir);
        }

        let opencode_storage = dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("wordforge")
            .join("opencode-state")
            .join("data")
            .join("storage");

        let project_file = opencode_storage.join("project").join(format!("{}.json", project_id));
        if project_file.exists() {
            std::fs::remove_file(&project_file)?;
            tracing::info!("Removed OpenCode project file: {:?}", project_file);
        }

        let session_dir = opencode_storage.join("session").join(&project_id);
        if session_dir.exists() {
            std::fs::remove_dir_all(&session_dir)?;
            tracing::info!("Removed OpenCode sessions for project: {}", project_id);
        }

        Ok(())
    }

}
