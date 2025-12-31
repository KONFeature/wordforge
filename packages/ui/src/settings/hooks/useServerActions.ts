import { useMutation } from '@tanstack/react-query';
import apiFetch from '@wordpress/api-fetch';

type ServerAction = 'download' | 'start' | 'stop';

export const useServerAction = (onSuccess?: () => void) => {
  return useMutation({
    mutationFn: async (action: ServerAction) => {
      await apiFetch({
        path: `/wordforge/v1/opencode/${action}`,
        method: 'POST',
      });
      return action;
    },
    onSuccess: (_action) => {
      setTimeout(() => onSuccess?.(), 1000);
    },
  });
};
