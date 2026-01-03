# @wordforge/desktop - Tauri Desktop App

## Overview
Desktop application for WordForge using Tauri 2. Downloads and manages OpenCode as a sidecar process.

## Architecture
```
packages/desktop/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── hooks/              # React hooks (useOpenCode)
│   └── styles/             # CSS
├── src-tauri/              # Rust backend
│   └── src/
│       ├── lib.rs          # Tauri commands
│       ├── state.rs        # App state management
│       └── opencode.rs     # OpenCode sidecar manager
└── package.json
```

## Commands

```bash
# Development
bun run tauri:dev           # Start Tauri dev mode with HMR

# Build
bun run tauri:build         # Build production app

# Type checking
bun run typecheck           # Check TypeScript types
```

## Key Components

### Rust Backend (src-tauri/)
- **OpenCodeManager**: Downloads OpenCode from GitHub releases, spawns/stops server
- **Tauri Commands**: `get_status`, `download_opencode`, `start_opencode`, `stop_opencode`, `open_opencode_view`

### React Frontend (src/)
- **useOpenCode hook**: State management for OpenCode lifecycle
- **OpenCodePanel**: Main UI for server control

## OpenCode Sidecar
- Binary downloaded from `sst/opencode` GitHub releases
- Stored in `~/.local/share/wordforge/opencode/` (platform-specific)
- Spawned with `opencode serve --port={dynamic}`
- Auto-detects platform (darwin/linux/win32) and architecture (x64/arm64)

## Events
- `opencode:download-progress` - Download progress updates
- `opencode:log` - Server stdout
- `opencode:error` - Server stderr
