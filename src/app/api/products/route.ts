import { NextResponse } from 'next/server';
import { writeJSON } from '@/infra/fs/jsonStore';
import {
  Product,
  PRODUCTS_FILE,
  loadAllProducts,
  normalizeProducts,
} from '@/lib/products-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId');
  const includeInactive = searchParams.get('includeInactive') === 'true';

  const allProducts = await loadAllProducts();

  const filtered = allProducts.filter(
    (product) =>
      (categoryId ? product.categoryId === categoryId : true) &&
      (includeInactive || product.active !== false),
  );

  return NextResponse.json({ products: filtered });
}

export async function PUT(request: Request) {
  const payload = await request.json();

  if (!Array.isArray(payload)) {
    return NextResponse.json(
      { error: 'Products payload must be an array' },
      { status: 400 },
    );
  }

  const products = normalizeProducts(payload);
  await writeJSON(PRODUCTS_FILE, products);

  return NextResponse.json({ products });
}
