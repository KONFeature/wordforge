import { useQuery } from '@tanstack/react-query';
import { wpFetch } from '../lib/wpFetch';
import type { WCOrder, WCProduct, WordPressSite } from '../types';

interface WooCommerceData {
  products: WCProduct[];
  orders: WCOrder[];
  isAvailable: boolean;
}

export function useWooCommerce(site: WordPressSite) {
  const { rest_url, auth } = site;

  const dataQuery = useQuery({
    queryKey: ['woocommerce', site.id],
    queryFn: async (): Promise<WooCommerceData> => {
      const [productsRes, ordersRes] = await Promise.all([
        wpFetch<WCProduct[]>(rest_url, '/wp-json/wc/v3/products', auth, {
          per_page: '10',
          status: 'publish',
        }),
        wpFetch<WCOrder[]>(rest_url, '/wp-json/wc/v3/orders', auth, {
          per_page: '10',
        }),
      ]);

      const isAvailable = !productsRes.error && !ordersRes.error;

      return {
        products: productsRes.data || [],
        orders: ordersRes.data || [],
        isAvailable,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    products: dataQuery.data?.products,
    orders: dataQuery.data?.orders,
    isAvailable: dataQuery.data?.isAvailable ?? null,
    isLoading: dataQuery.isLoading,
    isError: dataQuery.isError,
  };
}
