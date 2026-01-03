import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import type { WordPressSite } from '../types';

const siteKeys = {
  all: ['sites'] as const,
  list: () => [...siteKeys.all, 'list'] as const,
  active: () => [...siteKeys.all, 'active'] as const,
};

async function fetchSites(): Promise<WordPressSite[]> {
  return invoke<WordPressSite[]>('list_sites');
}

async function fetchActiveSite(): Promise<WordPressSite | null> {
  return invoke<WordPressSite | null>('get_active_site');
}

export function useSites() {
  const queryClient = useQueryClient();

  const sitesQuery = useQuery({
    queryKey: siteKeys.list(),
    queryFn: fetchSites,
  });

  const activeSiteQuery = useQuery({
    queryKey: siteKeys.active(),
    queryFn: fetchActiveSite,
  });

  const connectMutation = useMutation({
    mutationFn: async ({
      siteUrl,
      token,
    }: { siteUrl: string; token: string }) => {
      return invoke<WordPressSite>('connect_site', { siteUrl, token });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
    },
  });

  const setActiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await invoke('set_active_site', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.active() });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await invoke('remove_site', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
    },
  });

  const openSiteFolder = async (id: string) => {
    await invoke('open_site_folder', { id });
  };

  return {
    sites: sitesQuery.data ?? [],
    activeSite: activeSiteQuery.data ?? null,
    isLoading: sitesQuery.isLoading || activeSiteQuery.isLoading,
    error: sitesQuery.error?.message || activeSiteQuery.error?.message || null,

    connectSite: connectMutation.mutateAsync,
    isConnecting: connectMutation.isPending,
    connectError: connectMutation.error?.message || null,

    setActive: setActiveMutation.mutateAsync,
    removeSite: removeMutation.mutateAsync,
    openSiteFolder,

    refreshSites: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.all });
    },
  };
}
