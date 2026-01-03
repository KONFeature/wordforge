import { useMutation, useQuery } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

interface ConnectUrlResponse {
  connectUrl: string;
  token: string;
  expiresIn: number;
}

export const useDesktopConnectUrl = () =>
  useMutation({
    mutationFn: async (): Promise<ConnectUrlResponse> =>
      apiFetch<ConnectUrlResponse>({
        path: '/wordforge/v1/desktop/connect-url',
        method: 'GET',
      }),
  });

export const useGenerateConnectToken = () =>
  useMutation({
    mutationFn: async (): Promise<ConnectUrlResponse> =>
      apiFetch<ConnectUrlResponse>({
        path: '/wordforge/v1/desktop/connect-token',
        method: 'POST',
      }),
  });
