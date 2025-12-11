import { NextResponse } from 'next/server';
import { Order } from '@/domain/models/order';
import { getKitchenEstimateMinutes } from '@/domain/orders/kitchenEstimate';
import { formatDate, getOrdersForDate, saveOrdersForDate } from '@/infra/fs/ordersRepo';
import { loadSettings } from '@/infra/fs/settingsRepo';

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
    const now = new Date();
    const nowMs = now.getTime();
    const [orders, settings] = await Promise.all([getOrdersForDate(date), loadSettings()]);

    let hasChanges = false;

    const updatedOrders = orders.map((order) => {
      if (order.kitchenCompletedAt) return order;

      const created = new Date(order.createdAt);
      const elapsedSeconds = (nowMs - created.getTime()) / 1000;

      const estimateMinutes = getKitchenEstimateMinutes(order, settings);
      const estimateSeconds = estimateMinutes * 60;
      const GRACE_SECONDS = 30;
      const FORCE_CLEAR_SECONDS = 2 * 60 * 60;

      const shouldAutoComplete =
        elapsedSeconds >= estimateSeconds + GRACE_SECONDS || elapsedSeconds >= FORCE_CLEAR_SECONDS;

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
        return !isClosed && !isCompleted;
      })
      .sort(sortOrdersByTicketAndTime);

    const nowForResponse = Date.now();

    return NextResponse.json({
      orders: openOrders.map((order) => {
        const estimateMinutes = getKitchenEstimateMinutes(order, settings);
        const targetMs = order.targetReadyAt
          ? new Date(order.targetReadyAt).getTime()
          : new Date(order.createdAt).getTime() + estimateMinutes * 60_000;

        const diffSeconds = Math.round((targetMs - nowForResponse) / 1000);
        const secondsRemaining = Math.max(diffSeconds, 0);
        const isOverdue = diffSeconds < 0;

        return {
          id: order.orderNumber,
          orderNumber: order.orderNumber,
          ticketNumber: order.ticketNumber ?? null,
          createdAt: order.createdAt,
          items: order.items,
          estimatedPrepMinutes: estimateMinutes,
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
