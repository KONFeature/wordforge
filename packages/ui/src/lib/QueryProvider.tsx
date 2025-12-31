import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from '@wordpress/element';
import { queryClient } from './query-client';

interface QueryProviderProps {
  children: ReactNode;
}

export const QueryProvider = ({ children }: QueryProviderProps) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
