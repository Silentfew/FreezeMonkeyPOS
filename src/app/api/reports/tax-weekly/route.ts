import { NextResponse } from 'next/server';
import { calculateIncomeSummary } from '@/domain/orders/taxSummary';
import { getOrdersBetween } from '@/infra/fs/ordersRepo';

function isValidDateString(value: string | null): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  if (!isValidDateString(startDateParam) || !isValidDateString(endDateParam)) {
    return NextResponse.json({ error: 'startDate and endDate are required (YYYY-MM-DD).' }, { status: 400 });
  }

  if (startDateParam > endDateParam) {
    return NextResponse.json({ error: 'startDate must be before or equal to endDate.' }, { status: 400 });
  }

  try {
    const orders = await getOrdersBetween(startDateParam, endDateParam);
    const summary = calculateIncomeSummary(orders, startDateParam, endDateParam);

    return NextResponse.json({
      range: { startDate: startDateParam, endDate: endDateParam },
      summary,
    });
  } catch (error) {
    console.error('Failed to build weekly income summary', error);
    return NextResponse.json({ error: 'Failed to build weekly income summary' }, { status: 500 });
  }
}
