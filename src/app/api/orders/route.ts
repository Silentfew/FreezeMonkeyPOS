import { NextResponse } from 'next/server';
import { appendOrderFromDraft, formatDate, getOrdersForDate } from '@/infra/fs/ordersRepo';
import { OrderDraft } from '@/domain/orders/createOrderFromDraft';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const payments = Array.isArray(payload?.payments) ? payload.payments : undefined;
    const draft: OrderDraft = {
      items: Array.isArray(payload?.items) ? payload.items : [],
      taxFree: Boolean(payload?.taxFree),
      note: typeof payload?.note === 'string' ? payload.note : undefined,
      taxRate: typeof payload?.taxRate === 'number' ? payload.taxRate : undefined,
      payments,
    };

    if (!draft.items.length) {
      return NextResponse.json({ error: 'Order must include at least one item.' }, { status: 400 });
    }

    const order = await appendOrderFromDraft(draft);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Failed to save order', error);
    return NextResponse.json({ error: 'Failed to save order' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const date = dateParam ?? formatDate();
    const orders = await getOrdersForDate(date);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Failed to fetch orders', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
