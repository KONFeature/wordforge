import { createFileRoute, redirect } from '@tanstack/react-router';
import { invoke } from '@tauri-apps/api/core';
import type { WordPressSite } from '../types';

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const activeSite = await invoke<WordPressSite | null>('get_active_site');

    if (activeSite) {
      throw redirect({
        to: '/site/$siteId',
        params: { siteId: activeSite.id },
      });
    }

    throw redirect({ to: '/onboarding' });
  },
});
