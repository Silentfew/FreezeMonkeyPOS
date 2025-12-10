import { SaleProduct } from './order_manager';

export interface Product extends SaleProduct {
  categoryId: string;
  hasModifiers?: boolean;
  active?: boolean;
  prepMinutes?: number;
}

export const PRODUCTS_FILE = 'products.json';

export function normalizeProducts(products: Product[]): Product[] {
  return Array.isArray(products)
    ? products.map((product) => ({
        ...product,
        active: product.active ?? true,
        prepMinutes: typeof product.prepMinutes === 'number' ? product.prepMinutes : 1,
      }))
    : [];
}

export async function loadAllProducts(): Promise<Product[]> {
  const { readJSON } = await import('@/infra/fs/jsonStore');
  return normalizeProducts(await readJSON<Product[]>(PRODUCTS_FILE, []));
}

export async function readProducts(): Promise<Product[]> {
  const products = await loadAllProducts();
  return products.filter((product) => product.active !== false);
}

export async function fetchProducts(categoryId?: string): Promise<Product[]> {
  const search = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : '';
  const response = await fetch(`/api/products${search}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to load products');
  }
  const data = await response.json();
  const products: Product[] = Array.isArray(data?.products)
    ? normalizeProducts(data.products)
        .map((product: Product) => ({
          ...product,
          hasModifiers: true,
        }))
        .filter((product) => product.active !== false)
    : [];
  return products;
}
