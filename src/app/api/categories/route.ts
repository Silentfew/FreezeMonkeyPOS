import { NextResponse } from 'next/server';
import { readCategories } from '@/lib/categories-store';

export async function GET() {
  const categories = await readCategories();
  return NextResponse.json({ categories });
}
