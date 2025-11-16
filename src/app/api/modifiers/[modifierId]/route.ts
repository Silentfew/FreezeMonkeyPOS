import { NextResponse } from 'next/server';
import modifiers from '../../../../../data/modifiers.json';

export function GET(_request: Request, context: { params: { modifierId: string } }) {
  const modifier = Array.isArray(modifiers)
    ? modifiers.find((item) => item.id === context.params.modifierId)
    : undefined;

  if (!modifier) {
    return NextResponse.json({ error: 'Modifier not found' }, { status: 404 });
  }

  return NextResponse.json({ modifier });
}
