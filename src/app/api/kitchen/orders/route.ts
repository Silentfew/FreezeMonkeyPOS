import { NextResponse } from 'next/server';
import { Order } from '@/domain/models/order';
import { formatDate, getOrdersForDate } from '@/infra/fs/ordersRepo';

export const dynamic = 'force-dynamic';

function sortOrdersByTicketAndTime(a: Order, b: Order) {
  const ticketA = typeof a.ticketNumber === 'number' ? a.ticketNumber : Number.MAX_SAFE_INTEGER;
  const ticketB = typeof b.ticketNumber === 'number' ? b.ticketNumber : Number.MAX_SAFE_INTEGER;

  if (ticketA !== ticketB) {
    return ticketA - ticketB;
  }

  const timeA = new Date(a.createdAt).getTime();
  const timeB = new Date(b.createdAt).getTime();
  return timeA - timeB;
}

const CLOSED_STATUSES = new Set(['COMPLETED', 'CANCELLED', 'REFUNDED']);

export async function GET() {
  try {
    const date = formatDate();
    const orders = await getOrdersForDate(date);

    const openOrders = orders
      .filter((order) => {
        const status = order.status;
        const isClosed = status ? CLOSED_STATUSES.has(status) : false;
        return order.kitchenStatus !== 'DONE' && !isClosed;
      })
      .sort(sortOrdersByTicketAndTime);

    const now = Date.now();

    return NextResponse.json({
      orders: openOrders.map((order) => {
        const targetMs = order.targetReadyAt
          ? new Date(order.targetReadyAt).getTime()
          : now;

        const diffSeconds = Math.round((targetMs - now) / 1000);
        const secondsRemaining = Math.max(diffSeconds, 0);
        const isOverdue = diffSeconds < 0;

        return {
          id: order.orderNumber,
          orderNumber: order.orderNumber,
          ticketNumber: order.ticketNumber ?? null,
          createdAt: order.createdAt,
          items: order.items,
          estimatedPrepMinutes: order.estimatedPrepMinutes ?? null,
          targetReadyAt: order.targetReadyAt ?? null,
          secondsRemaining,
          isOverdue,
          note: order.note ?? null,
        };
      }),
    });
  } catch (error) {
    console.error('Failed to fetch kitchen orders', error);
    return NextResponse.json({ date: formatDate(), orders: [] }, { status: 500 });
  }
}
