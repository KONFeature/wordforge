# @wordforge/desktop - Tauri Desktop App

Desktop application for WordForge using Tauri 2. Manages OpenCode as a sidecar process and connects to WordPress sites.

## Sub-Package Docs

| Directory | Description |
|-----------|-------------|
| `src/AGENTS.md` | React frontend (TanStack Router/Query, Tauri IPC) |
| `src-tauri/AGENTS.md` | Rust backend (OpenCode manager, site connections) |

## Commands

```bash
bun run tauri:dev         # Start dev mode with HMR
bun run tauri:build       # Build production app
bun run typecheck         # Type-check TypeScript
```

## Architecture

```
Frontend (React)              Backend (Rust)
┌─────────────────┐          ┌─────────────────────┐
│  TanStack Query │──invoke──│  AppState           │
│  + Router       │          │  └─ OpenCodeManager │
│                 │          │                     │
│  useOpenCode()  │──invoke──│  SiteManager        │
│  useSites()     │          │                     │
└────────┬────────┘          └──────────┬──────────┘
         │                              │
    listen()                       emit()
         │                              │
         └──────── Tauri Events ────────┘
```

## Key Flows

### WordPress Connection
1. User clicks "Connect" in WordPress admin
2. WordPress generates temporary token
3. Opens `wordforge://connect?site=URL&token=TOKEN`
4. Desktop exchanges token for app password
5. Downloads OpenCode config to project dir
6. Site appears in sidebar

### OpenCode Lifecycle
1. Check if binary installed (`~/.local/share/wordforge/opencode/`)
2. If not: download from `sst/opencode` GitHub releases
3. Start with `opencode serve --port={N} --cors={site_url}`
4. Poll health endpoint until ready
5. Sync port to WordPress for browser connection
6. Monitor for 30min idle → auto-shutdown

## File Locations

```
~/.local/share/wordforge/
├── opencode/
│   ├── opencode           # Binary
│   ├── .version           # Installed version
│   └── .port              # Persisted port
├── opencode-state/        # Isolated XDG dirs
└── sites/
    └── {site-name}/       # Per-site project dir
        └── opencode.json  # Config from WordPress
```

## Code Style

### TypeScript (src/)
- Standard React imports (NOT `@wordpress/element`)
- TanStack Query for server state
- TanStack Router with hash history
- `invoke()` for all backend calls

### Rust (src-tauri/)
- Async commands with `tokio`
- `Arc<Mutex<T>>` for shared state
- `thiserror` for error types
- Single-lock discipline (never hold multiple)

## Common Pitfalls

1. **Wrong React imports** - Use standard `react`, not `@wordpress/element`
2. **Path-based routing** - Must use hash history (no web server)
3. **Editing routeTree.gen.ts** - Auto-generated, don't modify
4. **Multiple lock acquisition** - Release one before acquiring another
5. **Sync I/O in async** - Use `spawn_blocking` for file operations
