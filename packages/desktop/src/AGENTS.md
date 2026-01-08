# @wordforge/desktop/src - React Frontend

Tauri desktop app frontend. Standard React + TanStack Router/Query.

## Structure

```
src/
├── main.tsx              # Entry (QueryClient + RouterProvider)
├── router.tsx            # Hash-based router config
├── routeTree.gen.ts      # AUTO-GENERATED - don't edit
├── components/           # UI components
│   └── ui/               # Reusable primitives
├── hooks/                # useOpenCode, useSites, etc.
├── context/              # OpenCodeClientContext
├── routes/               # File-based routing
│   ├── __root.tsx        # Root layout
│   ├── index.tsx         # Home
│   └── site/$siteId/     # Site routes
├── lib/                  # wpFetch, utils
└── types.ts              # Shared types
```

## CRITICAL: Standard React

```typescript
// CORRECT
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// WRONG - This is for @wordforge/ui only
import { useState } from '@wordpress/element';  // NO!
```

## Tauri IPC

### Commands (invoke)

```typescript
import { invoke } from '@tauri-apps/api/core';

// Call Rust
const port = await invoke<number>('start_opencode');
const sites = await invoke<WordPressSite[]>('list_sites');
await invoke('set_active_site', { id: site.id });
```

Available commands:
- `get_status`, `start_opencode`, `stop_opencode`, `download_opencode`
- `list_sites`, `get_active_site`, `set_active_site`, `remove_site`, `connect_site`
- `check_config_update`, `refresh_site_config`

### Events (listen)

```typescript
import { listen } from '@tauri-apps/api/event';

useEffect(() => {
  const unlisten = listen<DownloadProgress>('opencode:download-progress', (e) => {
    setProgress(e.payload);
  });
  return () => { unlisten.then(fn => fn()); };
}, []);
```

Events: `opencode:log`, `opencode:error`, `opencode:idle-shutdown`, `deep-link:connect`, `config:updated`

## Hooks Pattern

```typescript
const siteKeys = {
  all: ['sites'] as const,
  list: () => [...siteKeys.all, 'list'] as const,
};

export function useSites() {
  const { sites } = useSitesList();
  const { activeSite } = useActiveSite();
  return { sites, activeSite, ...useSiteMutations() };
}
```

## Routing (Hash History)

```typescript
// routes/site/$siteId/index.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/site/$siteId/')({
  component: SiteDashboard,
});

const { siteId } = Route.useParams();
```

Hash history required - Tauri loads from `file://`.

## Anti-Patterns

| Don't | Why |
|-------|-----|
| `@wordpress/element` | Standard React only |
| Path-based routing | No web server, use hash |
| Edit `routeTree.gen.ts` | Auto-generated |
| Direct `fetch()` for WP | Use `invoke()` or `wpFetch` |
| Forget listener cleanup | Memory leaks |
