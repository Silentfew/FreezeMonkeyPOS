import PosClient from './PosClient';
import type { Category } from '@/lib/categories-store';
import { readCategories } from '@/lib/categories-store';
import type { Product } from '@/lib/products-store';
import { readProducts } from '@/lib/products-store';
import type { Modifier } from '@/lib/modifier_manager';
import { readModifiers } from '@/lib/modifier_manager';

export default async function PosPage() {
  const [categories, products, modifiers] = await Promise.all<[
    Category[],
    Product[],
    Modifier[],
  ]>([readCategories(), readProducts(), readModifiers()]);

  const productsWithBasePrice = products.map((product) => ({
    ...product,
    basePriceCents: Math.round(product.price * 100),
  }));

  return (
    <PosClient
      categories={categories}
      products={productsWithBasePrice}
      modifiers={modifiers}
    />
  );
}
