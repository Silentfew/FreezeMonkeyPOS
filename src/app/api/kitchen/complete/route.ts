import { NextResponse } from 'next/server';
import { markKitchenOrderCompleted } from '@/infra/fs/ordersRepo';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderNumber = body?.orderNumber;

    if (!orderNumber) {
      return NextResponse.json({ error: 'orderNumber is required' }, { status: 400 });
    }

    const updatedOrder = await markKitchenOrderCompleted(String(orderNumber));

    if (!updatedOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('Failed to complete kitchen order', error);
    return NextResponse.json({ error: 'Failed to complete kitchen order' }, { status: 500 });
  }
}
