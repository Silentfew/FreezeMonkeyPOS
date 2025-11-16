import { NextResponse } from 'next/server';
import products from '../../../../../data/products.json';

export function GET(_request: Request, context: { params: { productId: string } }) {
  const product = Array.isArray(products)
    ? products.find((item) => item.id === context.params.productId)
    : undefined;

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  return NextResponse.json({ product });
}
