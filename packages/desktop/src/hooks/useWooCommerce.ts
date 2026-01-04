import { useQuery } from '@tanstack/react-query';
import { wpFetch } from '../lib/wpFetch';
import type { WCOrder, WCProduct, WordPressSite } from '../types';

export function useWooCommerce(site: WordPressSite) {
  const { rest_url, auth } = site;

  const productsQuery = useQuery({
    queryKey: ['wc-products', site.id],
    queryFn: async () => {
      const res = await wpFetch<WCProduct[]>(
        rest_url,
        '/wp-json/wc/v3/products',
        auth,
        {
          per_page: '10',
          status: 'publish',
        },
      );
      return res.data || [];
    },
  });

  const ordersQuery = useQuery({
    queryKey: ['wc-orders', site.id],
    queryFn: async () => {
      const res = await wpFetch<WCOrder[]>(
        rest_url,
        '/wp-json/wc/v3/orders',
        auth,
        {
          per_page: '10',
        },
      );
      return res.data || [];
    },
  });

  return {
    products: productsQuery.data,
    orders: ordersQuery.data,
    isLoading: productsQuery.isLoading || ordersQuery.isLoading,
    isError: productsQuery.isError || ordersQuery.isError,
  };
}
