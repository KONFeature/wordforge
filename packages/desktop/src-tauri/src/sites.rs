use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum SiteError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Token exchange failed: {0}")]
    TokenExchange(String),
    #[error("Site not found: {0}")]
    NotFound(String),
    #[error("Invalid URL: {0}")]
    InvalidUrl(String),
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SiteConfig {
    pub opencode: serde_json::Value,
    pub agent_files: HashMap<String, String>,
    pub context: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct ExchangeResponse {
    success: bool,
    credentials: Credentials,
    site: SiteInfo,
    config: SiteConfig,
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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SitesStore {
    pub sites: HashMap<String, WordPressSite>,
    pub active_site_id: Option<String>,
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
            .join("sites.json");

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

    fn save_store(&self) -> Result<(), SiteError> {
        if let Some(parent) = self.store_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let content = serde_json::to_string_pretty(&self.store)?;
        std::fs::write(&self.store_path, content)?;
        Ok(())
    }

    pub async fn exchange_token(&mut self, site_url: &str, token: &str) -> Result<WordPressSite, SiteError> {
        let exchange_url = format!("{}/wp-json/wordforge/v1/desktop/exchange", site_url.trim_end_matches('/'));
        
        let response = self.client
            .post(&exchange_url)
            .json(&serde_json::json!({ "token": token }))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(SiteError::TokenExchange(format!("HTTP {}: {}", status, body)));
        }

        let exchange_response: ExchangeResponse = response.json().await?;

        if !exchange_response.success {
            return Err(SiteError::TokenExchange("Exchange failed".into()));
        }

        let site_id = Uuid::new_v4().to_string();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let project_dir = self.create_project_dir(&exchange_response.site.name)?;
        self.write_config_files(&project_dir, &exchange_response.config)?;

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
        };

        self.store.sites.insert(site_id.clone(), site.clone());
        self.store.active_site_id = Some(site_id);
        self.save_store()?;

        Ok(site)
    }

    fn create_project_dir(&self, site_name: &str) -> Result<PathBuf, SiteError> {
        let sanitized = site_name
            .chars()
            .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
            .collect::<String>()
            .to_lowercase();

        let base_dir = dirs::document_dir()
            .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")))
            .join("WordForge")
            .join(&sanitized);

        std::fs::create_dir_all(&base_dir)?;
        Ok(base_dir)
    }

    fn write_config_files(&self, project_dir: &PathBuf, config: &SiteConfig) -> Result<(), SiteError> {
        let opencode_dir = project_dir.join(".opencode");
        let agent_dir = opencode_dir.join("agent");
        let context_dir = opencode_dir.join("context");

        std::fs::create_dir_all(&agent_dir)?;
        std::fs::create_dir_all(&context_dir)?;

        let opencode_json = serde_json::to_string_pretty(&config.opencode)?;
        std::fs::write(project_dir.join("opencode.json"), opencode_json)?;

        for (filename, content) in &config.agent_files {
            let file_path = if filename.starts_with("context/") {
                opencode_dir.join(filename)
            } else if filename.starts_with("agent/") {
                opencode_dir.join(filename)
            } else {
                project_dir.join(filename)
            };

            if let Some(parent) = file_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            std::fs::write(file_path, content)?;
        }

        Ok(())
    }

    pub fn list_sites(&self) -> Vec<&WordPressSite> {
        self.store.sites.values().collect()
    }

    #[allow(dead_code)]
    pub fn get_site(&self, id: &str) -> Option<&WordPressSite> {
        self.store.sites.get(id)
    }

    pub fn get_active_site(&self) -> Option<&WordPressSite> {
        self.store.active_site_id
            .as_ref()
            .and_then(|id| self.store.sites.get(id))
    }

    pub fn set_active_site(&mut self, id: &str) -> Result<(), SiteError> {
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
        
        self.save_store()?;
        Ok(())
    }

    pub fn remove_site(&mut self, id: &str) -> Result<(), SiteError> {
        self.store.sites.remove(id);
        
        if self.store.active_site_id.as_deref() == Some(id) {
            self.store.active_site_id = self.store.sites.keys().next().cloned();
        }
        
        self.save_store()?;
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
}
