import { NextResponse } from 'next/server';
import products from '../../../../data/products.json';

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('categoryId');

  const filtered = Array.isArray(products)
    ? products.filter((product) =>
        categoryId ? product.categoryId === categoryId : true,
      )
    : [];

  return NextResponse.json({ products: filtered });
}
