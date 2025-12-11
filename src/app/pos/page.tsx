import PosClient from './PosClient';
import type { Category } from '@/lib/categories-store';
import { readCategories } from '@/lib/categories-store';
import type { Product } from '@/lib/products-store';
import { readProducts } from '@/lib/products-store';
import type { Modifier } from '@/lib/modifier_manager';
import { readModifiers } from '@/lib/modifier_manager';
import { getSessionUser } from '@/lib/session';
import { loadSettings } from '@/infra/fs/settingsRepo';

export default async function PosPage() {
  const [categories, products, modifiers, settings] = await Promise.all<[
    Category[],
    Product[],
    Modifier[],
    Awaited<ReturnType<typeof loadSettings>>,
  ]>([readCategories(), readProducts(), readModifiers(), loadSettings()]);

  const productsWithBasePrice = products.map((product) => ({
    ...product,
    basePriceCents: Math.round(product.price * 100),
  }));

  const currentUser = getSessionUser();

  const pricing = {
    pricesIncludeTax: settings.pricesIncludeTax ?? false,
    gstRatePercent: settings.gstRatePercent ?? settings.taxRatePercent ?? 15,
  };

  return (
    <PosClient
      categories={categories}
      products={productsWithBasePrice}
      modifiers={modifiers}
      currentUser={currentUser}
      pricing={pricing}
    />
  );
}
