import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import type { WordPressSite } from '../types';

const siteKeys = {
  all: ['sites'] as const,
  list: () => [...siteKeys.all, 'list'] as const,
  active: () => [...siteKeys.all, 'active'] as const,
};

export function useSitesList() {
  const sitesQuery = useQuery({
    queryKey: siteKeys.list(),
    queryFn: () => invoke<WordPressSite[]>('list_sites'),
  });

  return {
    sites: sitesQuery.data ?? [],
    isLoading: sitesQuery.isLoading,
    error: sitesQuery.error?.message ?? null,
  };
}

export function useActiveSite() {
  const activeSiteQuery = useQuery({
    queryKey: siteKeys.active(),
    queryFn: () => invoke<WordPressSite | null>('get_active_site'),
  });

  return {
    activeSite: activeSiteQuery.data ?? null,
    isLoading: activeSiteQuery.isLoading,
    error: activeSiteQuery.error?.message ?? null,
  };
}

export function useSiteMutations() {
  const queryClient = useQueryClient();

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
    connectSite: connectMutation.mutateAsync,
    isConnecting: connectMutation.isPending,
    connectError: connectMutation.error?.message ?? null,

    setActive: setActiveMutation.mutateAsync,
    isSettingActive: setActiveMutation.isPending,

    removeSite: removeMutation.mutateAsync,
    isRemoving: removeMutation.isPending,

    openSiteFolder,
  };
}

export function useSiteInvalidation() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: siteKeys.all }),
    invalidateActive: () =>
      queryClient.invalidateQueries({ queryKey: siteKeys.active() }),
  };
}

export function useSites() {
  const { sites, isLoading: isListLoading, error: listError } = useSitesList();
  const {
    activeSite,
    isLoading: isActiveLoading,
    error: activeError,
  } = useActiveSite();
  const mutations = useSiteMutations();

  return {
    sites,
    activeSite,
    isLoading: isListLoading || isActiveLoading,
    error: listError || activeError,
    ...mutations,
    refreshSites: useSiteInvalidation().invalidateAll,
  };
}
