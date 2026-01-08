# @wordforge/desktop/src-tauri - Rust Backend

Tauri 2 backend. OpenCode sidecar management + WordPress site connections.

## Structure

```
src/
├── main.rs       # Entry (delegates to lib::run)
├── lib.rs        # Commands, event handlers, app setup
├── state.rs      # AppState (wraps OpenCodeManager)
├── opencode.rs   # Binary download/spawn/monitor
└── sites.rs      # WordPress site CRUD, token exchange
```

## Commands

### OpenCode Lifecycle

```rust
get_status()              // → Status
get_installed_version()   // → Option<String>
download_opencode()       // Downloads binary
start_opencode()          // → u16 (port)
stop_opencode()           // Kills process
get_opencode_port()       // → Option<u16>
```

### Site Management

```rust
list_sites()              // → Vec<WordPressSite>
get_active_site()         // → Option<WordPressSite>
set_active_site(id)       // Sets active site
remove_site(id)           // Removes site
connect_site(url, token)  // Token exchange → WordPressSite
```

## State Pattern

```rust
// Two managed states
app.manage(Arc<Mutex<AppState>>);      // OpenCode
app.manage(Arc<Mutex<SiteManager>>);   // Sites

// In commands
async fn start_opencode(
    state: tauri::State<'_, Arc<Mutex<AppState>>>,
) -> Result<u16, String> {
    let mut state = state.lock().await;
    // ...
}
```

**Lock discipline**: One lock at a time. Release before acquiring another.

## Events

```rust
app.emit("opencode:download-progress", json!({ "percent": N }));
app.emit("opencode:log", &line);
app.emit("opencode:error", &line);
app.emit("opencode:idle-shutdown", ());
app.emit("deep-link:connect", payload);
```

## Deep Link Protocol

`wordforge://connect?site=URL&token=TOKEN&name=NAME`

Flow:
1. Parse URL
2. POST to `/wp-json/wordforge/v1/desktop/exchange`
3. Receive credentials
4. Download config ZIP
5. Persist to `.sites.json`

## File Layout

```
~/.local/share/wordforge/
├── opencode/opencode     # Binary
├── opencode/.version     # Version tag
├── opencode/.port        # Persisted port
├── opencode-state/       # Isolated XDG dirs
├── .sites.json           # Credentials
└── sites/{name}/         # Per-site project dirs
```

## Platform Detection

```rust
fn get_platform_identifier() -> (&'static str, &'static str) {
    let os = match std::env::consts::OS {
        "macos" => "darwin",
        "linux" => "linux",
        "windows" => "win32",
        _ => "unknown"
    };
    let arch = match std::env::consts::ARCH {
        "x86_64" => "x64",
        "aarch64" => "arm64",
        _ => "unknown"
    };
    (os, arch)
}
```

## Anti-Patterns

| Don't | Why |
|-------|-----|
| Hold multiple locks | Deadlock |
| Block main thread | Use `tokio::spawn` |
| Missing `kill_on_drop` | Zombie processes |
| Hardcode paths | Use `dirs::data_local_dir()` |
| Sync I/O in async | Use `spawn_blocking` |

## Plugins

```toml
tauri-plugin-shell        # Process spawning
tauri-plugin-http         # HTTP requests
tauri-plugin-store        # Persistent storage
tauri-plugin-deep-link    # URL scheme
tauri-plugin-single-instance
```
