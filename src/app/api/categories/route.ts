import { NextResponse } from 'next/server';
import categories from '../../../../data/categories.json';

export function GET() {
  const ordered = Array.isArray(categories)
    ? [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];
  return NextResponse.json({ categories: ordered });
}
