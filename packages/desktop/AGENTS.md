# @wordforge/desktop - Tauri Desktop App

Desktop app managing OpenCode sidecar and WordPress site connections.

## Sub-Package Docs

| Directory | Content |
|-----------|---------|
| `src/AGENTS.md` | React frontend |
| `src-tauri/AGENTS.md` | Rust backend |

## Commands

```bash
bun run tauri:dev     # Dev mode (HMR)
bun run tauri:build   # Production build
bun run typecheck     # Type-check TS
```

## Architecture

```
React Frontend              Rust Backend
┌─────────────┐            ┌─────────────────┐
│ TanStack    │──invoke()──│ AppState        │
│ Query/Router│            │ └─OpenCodeMgr   │
│             │            │                 │
│ useOpenCode │──invoke()──│ SiteManager     │
│ useSites    │            │                 │
└─────┬───────┘            └────────┬────────┘
      │                             │
  listen()                      emit()
      └────── Tauri Events ─────────┘
```

## Key Flows

### WordPress Connection
1. User clicks "Connect" in WP admin
2. WP generates temp token, opens `wordforge://connect?site=URL&token=TOKEN`
3. Desktop exchanges token for app password
4. Downloads OpenCode config to project dir

### OpenCode Lifecycle
1. Check binary at `~/.local/share/wordforge/opencode/`
2. If missing: download from `sst/opencode` releases
3. Start: `opencode serve --port={N} --cors={site}`
4. Poll health until ready
5. 30min idle → auto-shutdown

## File Locations

```
~/.local/share/wordforge/
├── opencode/
│   ├── opencode(.exe)    # Binary
│   ├── .version          # Installed version
│   └── .port             # Persisted port
├── opencode-state/       # Isolated XDG dirs
└── sites/
    └── {site-name}/
        └── opencode.json # Config from WordPress
```

## Code Style

| Layer | Convention |
|-------|------------|
| React (`src/`) | Standard `react` imports, TanStack Query/Router |
| Rust (`src-tauri/`) | Async tokio, `Arc<Mutex<T>>`, thiserror |

## Anti-Patterns

| Don't | Why |
|-------|-----|
| `@wordpress/element` in React | Standard React only |
| Path-based routing | Must use hash history (file://) |
| Edit `routeTree.gen.ts` | Auto-generated |
| Hold multiple Rust locks | Deadlock risk |
| Sync I/O in async | Use `spawn_blocking` |
