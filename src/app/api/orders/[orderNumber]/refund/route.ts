import { NextResponse } from 'next/server';
import { RefundInfo, PaymentType } from '@/domain/models/order';
import { updateOrderStatus } from '@/infra/fs/ordersRepo';
import { getSessionUser } from '@/lib/session';

function isValidDateString(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeMethod(value: unknown): PaymentType {
  const upper = typeof value === 'string' ? value.toUpperCase() : '';
  if (upper === 'CASH' || upper === 'CARD') return upper;
  return 'OTHER';
}

export async function POST(request: Request, { params }: { params: { orderNumber: string } }) {
  const session = getSessionUser();
  if (!session || session.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = await request.json().catch(() => ({}));
  const date = typeof payload?.date === 'string' ? payload.date : undefined;
  const method = normalizeMethod(payload?.method);
  const reason = typeof payload?.reason === 'string' ? payload.reason : undefined;

  if (!isValidDateString(date)) {
    return NextResponse.json({ error: 'date is required (YYYY-MM-DD).' }, { status: 400 });
  }

  if (!params?.orderNumber) {
    return NextResponse.json({ error: 'orderNumber is required.' }, { status: 400 });
  }

  const refundInfo: RefundInfo = {
    refundedAt: new Date().toISOString(),
    method,
    reason,
    refundedBy: session.name,
  };

  const updated = await updateOrderStatus(date, params.orderNumber, 'REFUNDED', refundInfo);

  if (!updated) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
