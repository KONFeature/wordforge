use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Stdio;
use tauri::{AppHandle, Emitter};
use thiserror::Error;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tracing::{error, info};

const GITHUB_REPO: &str = "sst/opencode";
const GITHUB_API_URL: &str = "https://api.github.com";

#[derive(Debug, Error)]
pub enum Error {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON parse error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("OpenCode is not installed")]
    NotInstalled,
    #[error("OpenCode is already running")]
    AlreadyRunning,
    #[error("Failed to find available port")]
    NoAvailablePort,
    #[error("Unsupported platform: {0}")]
    UnsupportedPlatform(String),
    #[error("Archive extraction failed: {0}")]
    ExtractionFailed(String),
    #[error("Download failed: {0}")]
    DownloadFailed(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Status {
    NotInstalled,
    Stopped,
    Starting,
    Running,
    Error(String),
}

#[derive(Debug, Deserialize)]
struct GitHubRelease {
    tag_name: String,
    assets: Vec<GitHubAsset>,
}

#[derive(Debug, Deserialize)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
}

pub struct OpenCodeManager {
    app: AppHandle,
    client: Client,
    process: Option<Child>,
    port: Option<u16>,
    install_dir: PathBuf,
}

impl OpenCodeManager {
    pub fn new(app: AppHandle) -> Self {
        let base_dir = dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("wordforge");
        
        let install_dir = base_dir.join("opencode");

        Self {
            app,
            client: Client::new(),
            process: None,
            port: None,
            install_dir,
        }
    }
    
    fn isolated_state_dir(&self) -> PathBuf {
        self.install_dir.parent()
            .unwrap_or(&self.install_dir)
            .join("opencode-state")
    }

    pub async fn get_status(&self) -> Status {
        if !self.is_installed().await {
            return Status::NotInstalled;
        }

        if self.process.is_some() && self.port.is_some() {
            Status::Running
        } else {
            Status::Stopped
        }
    }

    pub async fn is_installed(&self) -> bool {
        self.binary_path().exists()
    }

    pub async fn get_installed_version(&self) -> Option<String> {
        let version_file = self.install_dir.join(".version");
        tokio::fs::read_to_string(version_file).await.ok()
    }

    pub async fn get_latest_version(&self) -> Result<String, Error> {
        let release = self.fetch_latest_release().await?;
        Ok(release.tag_name)
    }

    pub async fn check_update_available(&self) -> Result<bool, Error> {
        let installed = self.get_installed_version().await;
        let latest = self.get_latest_version().await?;

        match installed {
            Some(v) => Ok(v.trim() != latest.trim()),
            None => Ok(true),
        }
    }

    pub async fn download(&mut self, app: &AppHandle) -> Result<(), Error> {
        info!("Starting OpenCode download");
        self.emit_progress(app, "Fetching release info...", 0);

        let release = self.fetch_latest_release().await?;
        let asset = self.find_platform_asset(&release)?;

        self.emit_progress(app, "Creating directories...", 10);
        tokio::fs::create_dir_all(&self.install_dir).await?;

        self.emit_progress(app, "Downloading OpenCode...", 20);
        let archive_path = self.install_dir.join(&asset.name);
        self.download_file(&asset.browser_download_url, &archive_path, app)
            .await?;

        self.emit_progress(app, "Extracting archive...", 80);
        self.extract_archive(&archive_path).await?;

        self.emit_progress(app, "Saving version info...", 95);
        let version_file = self.install_dir.join(".version");
        tokio::fs::write(&version_file, &release.tag_name).await?;

        tokio::fs::remove_file(&archive_path).await.ok();

        self.emit_progress(app, "Download complete!", 100);
        info!("OpenCode {} installed successfully", release.tag_name);

        Ok(())
    }

    pub async fn start(
        &mut self, 
        cors_origin: Option<String>,
        project_dir: Option<std::path::PathBuf>,
    ) -> Result<u16, Error> {
        if self.process.is_some() {
            return Err(Error::AlreadyRunning);
        }

        if !self.is_installed().await {
            return Err(Error::NotInstalled);
        }

        let port = self.get_or_assign_port().await?;
        info!("Starting OpenCode on port {}", port);

        let binary = self.binary_path();
        let mut cmd = Command::new(&binary);
        cmd.args(["serve", "--port", &port.to_string()]);
        
        if let Some(cors) = cors_origin {
            cmd.args(["--cors", &cors]);
        }
        
        cmd.env("OPENCODE_CLIENT", "wordforge-desktop");
        cmd.env("OPENCODE_AUTO_SHARE", "false");
        cmd.env("OPENCODE_DISABLE_AUTOUPDATE", "true");
        cmd.env("OPENCODE_DISABLE_LSP_DOWNLOAD", "true");
        cmd.env("OPENCODE_FAKE_VCS", "git");
        
        let state_dir = self.isolated_state_dir();
        cmd.env("XDG_DATA_HOME", state_dir.join("data").to_string_lossy().to_string());
        cmd.env("XDG_CONFIG_HOME", state_dir.join("config").to_string_lossy().to_string());
        cmd.env("XDG_STATE_HOME", state_dir.join("state").to_string_lossy().to_string());
        cmd.env("XDG_CACHE_HOME", state_dir.join("cache").to_string_lossy().to_string());
        
        if let Some(ref dir) = project_dir {
            cmd.current_dir(dir);
            cmd.env("OPENCODE_CONFIG_DIR", dir.to_string_lossy().to_string());
        }
        
        cmd.stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);

        let mut child = cmd.spawn()?;

        self.spawn_log_handler(&mut child);
        self.process = Some(child);
        self.port = Some(port);

        self.wait_for_ready(port).await?;

        Ok(port)
    }

    pub async fn stop(&mut self) -> Result<(), Error> {
        if let Some(mut process) = self.process.take() {
            info!("Stopping OpenCode");
            process.kill().await.ok();
            self.port = None;
        }
        Ok(())
    }

    pub fn get_port(&self) -> Option<u16> {
        self.port
    }

    async fn get_or_assign_port(&self) -> Result<u16, Error> {
        let port_file = self.install_dir.join(".port");
        
        if let Ok(content) = tokio::fs::read_to_string(&port_file).await {
            if let Ok(saved_port) = content.trim().parse::<u16>() {
                if portpicker::is_free(saved_port) {
                    info!("Reusing saved port {}", saved_port);
                    return Ok(saved_port);
                }
                info!("Saved port {} is in use, picking new one", saved_port);
            }
        }
        
        let new_port = portpicker::pick_unused_port().ok_or(Error::NoAvailablePort)?;
        tokio::fs::write(&port_file, new_port.to_string()).await.ok();
        info!("Assigned new port {}", new_port);
        
        Ok(new_port)
    }

    fn binary_path(&self) -> PathBuf {
        #[cfg(target_os = "windows")]
        let name = "opencode.exe";
        #[cfg(not(target_os = "windows"))]
        let name = "opencode";

        self.install_dir.join(name)
    }

    async fn fetch_latest_release(&self) -> Result<GitHubRelease, Error> {
        let url = format!("{}/repos/{}/releases/latest", GITHUB_API_URL, GITHUB_REPO);
        let response = self
            .client
            .get(&url)
            .header("User-Agent", "wordforge-desktop")
            .send()
            .await?
            .error_for_status()?
            .json::<GitHubRelease>()
            .await?;
        Ok(response)
    }

    fn find_platform_asset<'a>(&self, release: &'a GitHubRelease) -> Result<&'a GitHubAsset, Error> {
        let (os, arch) = get_platform_identifier()?;
        let pattern = format!("{}-{}", os, arch);

        release
            .assets
            .iter()
            .find(|a| a.name.contains(&pattern) && (a.name.ends_with(".tar.gz") || a.name.ends_with(".zip")))
            .ok_or_else(|| Error::UnsupportedPlatform(format!("{}-{}", os, arch)))
    }

    async fn download_file(
        &self,
        url: &str,
        path: &PathBuf,
        app: &AppHandle,
    ) -> Result<(), Error> {
        let response = self
            .client
            .get(url)
            .header("User-Agent", "wordforge-desktop")
            .send()
            .await?
            .error_for_status()?;

        let total_size = response.content_length().unwrap_or(0);
        let mut downloaded: u64 = 0;
        let mut file = tokio::fs::File::create(path).await?;
        let mut stream = response.bytes_stream();

        while let Some(chunk) = stream.next().await {
            let chunk = chunk?;
            tokio::io::AsyncWriteExt::write_all(&mut file, &chunk).await?;
            downloaded += chunk.len() as u64;

            if total_size > 0 {
                let progress = 20 + ((downloaded as f64 / total_size as f64) * 60.0) as u32;
                self.emit_progress(app, "Downloading...", progress);
            }
        }

        Ok(())
    }

    async fn extract_archive(&self, archive_path: &PathBuf) -> Result<(), Error> {
        let archive_name = archive_path.to_string_lossy().to_string();
        let install_dir = self.install_dir.clone();

        tokio::task::spawn_blocking(move || {
            if archive_name.ends_with(".tar.gz") {
                extract_tar_gz(&PathBuf::from(&archive_name), &install_dir)
            } else if archive_name.ends_with(".zip") {
                extract_zip(&PathBuf::from(&archive_name), &install_dir)
            } else {
                Err(Error::ExtractionFailed("Unknown archive format".into()))
            }
        })
        .await
        .map_err(|e| Error::ExtractionFailed(e.to_string()))??;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let binary = self.binary_path();
            let mut perms = std::fs::metadata(&binary)?.permissions();
            perms.set_mode(0o755);
            std::fs::set_permissions(&binary, perms)?;
        }

        Ok(())
    }

    fn spawn_log_handler(&self, child: &mut Child) {
        if let Some(stdout) = child.stdout.take() {
            let app = self.app.clone();
            tokio::spawn(async move {
                let reader = BufReader::new(stdout);
                let mut lines = reader.lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    info!("[opencode stdout] {}", line);
                    app.emit("opencode:log", &line).ok();
                }
            });
        }

        if let Some(stderr) = child.stderr.take() {
            let app = self.app.clone();
            tokio::spawn(async move {
                let reader = BufReader::new(stderr);
                let mut lines = reader.lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    error!("[opencode stderr] {}", line);
                    app.emit("opencode:error", &line).ok();
                }
            });
        }
    }

    async fn wait_for_ready(&self, port: u16) -> Result<(), Error> {
        let url = format!("http://localhost:{}/", port);
        let max_attempts = 30;

        for _ in 0..max_attempts {
            if self.client.get(&url).send().await.is_ok() {
                info!("OpenCode is ready on port {}", port);
                return Ok(());
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
        }

        Err(Error::DownloadFailed(
            "OpenCode failed to start within timeout".into(),
        ))
    }

    fn emit_progress(&self, app: &AppHandle, message: &str, percent: u32) {
        app.emit("opencode:download-progress", serde_json::json!({
            "message": message,
            "percent": percent
        }))
        .ok();
    }
}

fn get_platform_identifier() -> Result<(&'static str, &'static str), Error> {
    let os = match std::env::consts::OS {
        "macos" => "darwin",
        "linux" => "linux",
        "windows" => "win32",
        other => return Err(Error::UnsupportedPlatform(other.into())),
    };

    let arch = match std::env::consts::ARCH {
        "x86_64" => "x64",
        "aarch64" => "arm64",
        other => return Err(Error::UnsupportedPlatform(other.into())),
    };

    Ok((os, arch))
}

fn extract_tar_gz(archive: &PathBuf, dest: &PathBuf) -> Result<(), Error> {
    use flate2::read::GzDecoder;
    use tar::Archive;

    let file = std::fs::File::open(archive)?;
    let decoder = GzDecoder::new(file);
    let mut archive = Archive::new(decoder);
    archive.unpack(dest)?;
    Ok(())
}

fn extract_zip(archive: &PathBuf, dest: &PathBuf) -> Result<(), Error> {
    let file = std::fs::File::open(archive)?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| Error::ExtractionFailed(e.to_string()))?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| Error::ExtractionFailed(e.to_string()))?;
        let outpath = dest.join(file.name());

        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath)?;
        } else {
            if let Some(parent) = outpath.parent() {
                std::fs::create_dir_all(parent)?;
            }
            let mut outfile = std::fs::File::create(&outpath)?;
            std::io::copy(&mut file, &mut outfile)?;
        }
    }

    Ok(())
}
