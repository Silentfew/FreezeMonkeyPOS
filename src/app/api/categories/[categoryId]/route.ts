import { NextResponse } from 'next/server';
import categories from '../../../../../data/categories.json';

export function GET(_request: Request, context: { params: { categoryId: string } }) {
  const category = Array.isArray(categories)
    ? categories.find((item) => item.id === context.params.categoryId)
    : undefined;

  if (!category) {
    return NextResponse.json({ error: 'Category not found' }, { status: 404 });
  }

  return NextResponse.json({ category });
}
