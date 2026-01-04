import { createFileRoute } from '@tanstack/react-router';
import { ExternalLink, Package, ShoppingCart } from 'lucide-react';
import {
  Badge,
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui';
import { useWooCommerce } from '../../../hooks/useWooCommerce';
import type { WCOrder, WCProduct } from '../../../types';
import styles from './woocommerce.module.css';

export const Route = createFileRoute('/site/$siteId/woocommerce')({
  component: WooCommercePage,
});

function WooCommercePage() {
  const { site } = Route.useRouteContext();
  const { products, orders, isLoading, isAvailable } = useWooCommerce(site);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Commerce</h1>
          <p className={styles.subtitle}>Loading store data...</p>
        </div>
        <Skeleton height={300} />
        <Skeleton height={300} />
      </div>
    );
  }

  if (isAvailable === false) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Commerce</h1>
          <p className={styles.subtitle}>
            Manage your store orders and products
          </p>
        </div>
        <div className={styles.emptyState}>
          <ShoppingCart size={48} strokeWidth={1.5} />
          <h3>WooCommerce Not Installed</h3>
          <p>
            Install and activate WooCommerce on your WordPress site to manage
            products, orders, and customers from this dashboard.
          </p>
          <Button
            variant="primary"
            onClick={() =>
              window.open('https://woocommerce.com/start/', '_blank')
            }
          >
            Learn about WooCommerce
            <ExternalLink size={14} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Commerce</h1>
        <p className={styles.subtitle}>Manage your store orders and products</p>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <ShoppingCart size={14} />
          <span>Recent Orders</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders && orders.length > 0 ? (
              orders.map((order: WCOrder) => (
                <TableRow key={order.id}>
                  <TableCell>#{order.id}</TableCell>
                  <TableCell>
                    <Badge variant={getOrderBadgeVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(order.total, order.currency)}
                  </TableCell>
                  <TableCell>{formatDate(order.date_created)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableEmpty colSpan={4} message="No orders found" />
            )}
          </TableBody>
        </Table>
        {orders && orders.length > 0 && (
          <TableFooter>
            <Button variant="ghost" size="sm">
              Show All Orders
            </Button>
          </TableFooter>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Package size={14} />
          <span>Products</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products && products.length > 0 ? (
              products.map((product: WCProduct) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{formatPrice(product.price)}</TableCell>
                  <TableCell>
                    <Badge variant={getStockBadgeVariant(product.stock_status)}>
                      {getStockLabel(product.stock_status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableEmpty colSpan={3} message="No products found" />
            )}
          </TableBody>
        </Table>
        {products && products.length > 0 && (
          <TableFooter>
            <Button variant="ghost" size="sm">
              Show All Products
            </Button>
          </TableFooter>
        )}
      </section>
    </div>
  );
}

function getOrderBadgeVariant(
  status: string,
): 'success' | 'primary' | 'warning' | 'default' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'processing':
      return 'primary';
    case 'pending':
    case 'on-hold':
      return 'warning';
    default:
      return 'default';
  }
}

function getStockBadgeVariant(status: string): 'success' | 'warning' {
  return status === 'instock' ? 'success' : 'warning';
}

function getStockLabel(status: string): string {
  return status === 'instock' ? 'In Stock' : 'Out of Stock';
}

function formatCurrency(amount: string, currency: string): string {
  const num = Number.parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatPrice(price: string): string {
  if (!price) return '-';
  const num = Number.parseFloat(price);
  if (Number.isNaN(num)) return price;
  return `$${num.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
}
