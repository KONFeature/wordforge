# @wordforge/desktop/src-tauri - Rust Backend

Tauri 2 backend managing OpenCode sidecar process and WordPress site connections.

## Structure

```
src/
├── main.rs           # Entry point (delegates to lib::run)
├── lib.rs            # Tauri app setup, commands, event handlers
├── state.rs          # AppState (wraps OpenCodeManager)
├── opencode.rs       # OpenCode binary download/spawn/monitor
└── sites.rs          # WordPress site management, token exchange
```

## Tauri Commands

Commands exposed to frontend via `#[tauri::command]`:

### OpenCode Lifecycle
```rust
get_status()              // → Status (NotInstalled/Stopped/Running)
get_installed_version()   // → Option<String>
get_latest_version()      // → String (from GitHub API)
download_opencode()       // Downloads from sst/opencode releases
start_opencode()          // → u16 (port)
stop_opencode()           // Kills process
get_opencode_port()       // → Option<u16>
open_opencode_view(url?)  // Opens WebviewWindow
check_update_available()  // → bool
```

### Site Management
```rust
list_sites()              // → Vec<WordPressSite>
get_active_site()         // → Option<WordPressSite>
set_active_site(id)       // Sets active + updates last_used_at
remove_site(id)           // Removes site (stops OpenCode if active)
connect_site(site_url, token)  // Token exchange → WordPressSite
open_site_folder(id)      // Opens project dir in file manager
check_config_update(site_id?)  // → ConfigSyncStatus
refresh_site_config(site_id?, restart_opencode)  // Re-downloads config
```

## State Architecture

```rust
// Two managed states
app.manage(Arc<Mutex<AppState>>);      // OpenCode process
app.manage(Arc<Mutex<SiteManager>>);   // WordPress sites

// Access in commands
async fn start_opencode(
    state: tauri::State<'_, Arc<Mutex<AppState>>>,
    site_manager: tauri::State<'_, Arc<Mutex<SiteManager>>>,
) -> Result<u16, String> {
    let mut state = state.lock().await;
    // ...
}
```

**Lock Discipline**: Acquire one lock, complete work, release before acquiring another. Avoid holding multiple locks simultaneously.

## OpenCode Manager

Binary lifecycle in `opencode.rs`:

```
~/.local/share/wordforge/
├── opencode/
│   ├── opencode(.exe)    # Downloaded binary
│   ├── .version          # Installed version tag
│   └── .port             # Persisted port number
└── opencode-state/       # Isolated XDG dirs
    ├── data/
    ├── config/
    ├── state/
    └── cache/
```

**Key Behaviors**:
- Downloads platform-specific binary from `sst/opencode` GitHub releases
- Persists port across restarts (reuses if available)
- Spawns with isolated XDG directories (no shared state)
- Idle monitor shuts down after 30min inactivity
- Emits progress events during download

## Site Manager

WordPress connections in `sites.rs`:

```
~/.local/share/wordforge/
├── .sites.json           # Persisted site credentials
└── sites/
    └── {sanitized-name}/ # Per-site project dir
        └── opencode.json # Downloaded from WordPress
```

**Deep Link Protocol**: `wordforge://connect?site=URL&token=TOKEN&name=NAME`

**Token Exchange Flow**:
1. Parse `wordforge://` URL
2. POST token to `/wp-json/wordforge/v1/desktop/exchange`
3. Receive credentials + site info
4. Download config ZIP from `/wp-json/wordforge/v1/opencode/local-config`
5. Extract to project dir
6. Persist to `.sites.json`

## Events Emitted

```rust
app.emit("opencode:download-progress", json!({ "message": "...", "percent": N }));
app.emit("opencode:log", &line);        // stdout
app.emit("opencode:error", &line);      // stderr
app.emit("opencode:idle-shutdown", ()); // Idle timeout
app.emit("deep-link:connect", payload); // WordPress connection
app.emit("config:updated", &hash);      // Config refresh
```

## Error Handling

```rust
#[derive(Debug, Error)]
pub enum Error {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("OpenCode is not installed")]
    NotInstalled,
    // ...
}

// Commands return Result<T, String>
async fn start_opencode(...) -> Result<u16, String> {
    state.start_opencode().await.map_err(|e| e.to_string())
}
```

## Plugins Used

```toml
# Cargo.toml
tauri-plugin-shell       # Process spawning
tauri-plugin-http        # HTTP requests
tauri-plugin-store       # Persistent storage
tauri-plugin-deep-link   # URL scheme handling
tauri-plugin-single-instance  # Prevent duplicate instances
```

## Anti-Patterns

1. **Holding multiple locks** - Acquire, complete, release before next lock
2. **Blocking main thread** - Use `tokio::spawn` for long operations
3. **Missing `kill_on_drop`** - Child processes must have `.kill_on_drop(true)`
4. **Hardcoded paths** - Use `dirs::data_local_dir()` for platform paths
5. **Sync in async context** - Use `tokio::task::spawn_blocking` for sync I/O

## Platform Specifics

```rust
fn get_platform_identifier() -> (&'static str, &'static str) {
    let os = match std::env::consts::OS {
        "macos" => "darwin",
        "linux" => "linux",
        "windows" => "win32",
    };
    let arch = match std::env::consts::ARCH {
        "x86_64" => "x64",
        "aarch64" => "arm64",
    };
    (os, arch)
}
```

Windows: Binary is `opencode.exe`, archives are `.zip`
Unix: Binary is `opencode`, archives are `.tar.gz`, needs chmod 755
