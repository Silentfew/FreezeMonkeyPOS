import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/infra/fs/jsonStore';
import { Product } from '@/domain/models/product';

const PRODUCTS_FILE = 'products.json';

function normalizeProducts(products: Product[]): Product[] {
  return Array.isArray(products)
    ? products.map((product) => ({ ...product, active: product.active ?? true }))
    : [];
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId');
  const includeInactive = searchParams.get('includeInactive') === 'true';

  const allProducts = normalizeProducts(
    await readJSON<Product[]>(PRODUCTS_FILE, []),
  );

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
