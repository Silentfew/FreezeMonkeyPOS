import { NextResponse } from 'next/server';
import modifiers from '../../../../data/modifiers.json';

export function GET() {
  const payload = Array.isArray(modifiers) ? modifiers : [];
  return NextResponse.json({ modifiers: payload });
}
