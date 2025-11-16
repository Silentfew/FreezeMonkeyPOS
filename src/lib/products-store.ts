import { SaleProduct } from './order_manager';

export interface Product extends SaleProduct {
  categoryId: string;
  hasModifiers?: boolean;
}

export async function fetchProducts(categoryId?: string): Promise<Product[]> {
  const search = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
  const response = await fetch(`/api/products${search}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to load products');
  }
  const data = await response.json();
  const products: Product[] = Array.isArray(data?.products)
    ? data.products.map((product: Product) => ({ ...product, hasModifiers: true }))
    : [];
  return products;
}
