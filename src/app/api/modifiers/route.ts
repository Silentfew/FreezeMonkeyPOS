import { NextResponse } from 'next/server';
import { readModifiers } from '@/lib/modifier_manager';

export async function GET() {
  const modifiers = await readModifiers();
  return NextResponse.json({ modifiers });
}
