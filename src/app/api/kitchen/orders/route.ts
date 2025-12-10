import { NextResponse } from 'next/server';
import { Order } from '@/domain/models/order';
import { formatDate, getOrdersForDate, saveOrdersForDate } from '@/infra/fs/ordersRepo';

export const dynamic = 'force-dynamic';

function getEstimateSeconds(order: Order): number | null {
  if (order.targetReadyAt) {
    const createdMs = new Date(order.createdAt).getTime();
    const targetMs = new Date(order.targetReadyAt).getTime();
    return Math.max(0, Math.round((targetMs - createdMs) / 1000));
  }

  if (typeof order.estimatedPrepMinutes === 'number') {
    return Math.max(0, Math.round(order.estimatedPrepMinutes * 60));
  }

  return null;
}

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
    const now = new Date();
    const nowMs = now.getTime();
    const orders = await getOrdersForDate(date);

    let hasChanges = false;

    const updatedOrders = orders.map((order) => {
      if (order.kitchenCompletedAt) return order;

      const estimateSeconds = getEstimateSeconds(order);
      if (estimateSeconds === null) return order;

      const elapsedSeconds = Math.round((nowMs - new Date(order.createdAt).getTime()) / 1000);
      const shouldAutoComplete = elapsedSeconds >= estimateSeconds + 30;

      if (!shouldAutoComplete) return order;

      hasChanges = true;
      return {
        ...order,
        kitchenStatus: 'DONE',
        kitchenCompletedAt: now.toISOString(),
      } satisfies Order;
    });

    if (hasChanges) {
      await saveOrdersForDate(date, updatedOrders);
    }

    const openOrders = updatedOrders
      .filter((order) => {
        const status = order.status;
        const isClosed = status ? CLOSED_STATUSES.has(status) : false;
        const isCompleted = Boolean(order.kitchenCompletedAt);
        return order.kitchenStatus !== 'DONE' && !isClosed && !isCompleted;
      })
      .sort(sortOrdersByTicketAndTime);

    const nowForResponse = Date.now();

    return NextResponse.json({
      orders: openOrders.map((order) => {
        const targetMs = order.targetReadyAt
          ? new Date(order.targetReadyAt).getTime()
          : nowForResponse;

        const diffSeconds = Math.round((targetMs - nowForResponse) / 1000);
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
