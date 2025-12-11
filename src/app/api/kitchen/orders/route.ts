import { NextResponse } from 'next/server';
import { Order } from '@/domain/models/order';
import { getKitchenEstimateMinutes } from '@/domain/orders/kitchenEstimate';
import { formatDate, getOrdersForDate } from '@/infra/fs/ordersRepo';
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

function resolveDueMs(order: Order, prepMinutesFallback: number): number | null {
  const createdAtMs = new Date(order.createdAt).getTime();
  if (Number.isNaN(createdAtMs)) return null;

  const baseMinutes = Math.max(prepMinutesFallback, 1);
  if (order.kitchenDueAt) {
    const due = new Date(order.kitchenDueAt).getTime();
    if (!Number.isNaN(due)) return due;
  }

  if (order.targetReadyAt) {
    const due = new Date(order.targetReadyAt).getTime();
    if (!Number.isNaN(due)) return due;
  }

  const fallbackMinutes = order.estimatedPrepMinutes ?? baseMinutes;
  return createdAtMs + fallbackMinutes * 60_000;
}

export async function GET() {
  try {
    const date = formatDate();
    const now = new Date();
    const [orders, settings] = await Promise.all([getOrdersForDate(date), loadSettings()]);
    const nowMs = now.getTime();
    const staleCutoffMs = 12 * 60 * 60 * 1000;
    const overdueCutoffMs = 120 * 60 * 1000;
    const prepMinutes = Math.max(settings.kitchenPrepMinutes ?? 7, 1);

    const openOrders = orders
      .filter((order) => order.status === 'PAID' && !order.kitchenCompletedAt)
      .map((order) => {
        const dueMs = resolveDueMs(order, prepMinutes);
        return { order, dueMs };
      })
      .filter(({ order, dueMs }) => {
        if (!dueMs) return false;
        const createdMs = new Date(order.createdAt).getTime();
        if (Number.isNaN(createdMs) || nowMs - createdMs > staleCutoffMs) return false;
        if (dueMs + overdueCutoffMs < nowMs) return false;
        return dueMs > nowMs;
      })
      .sort(({ order: a, dueMs: dueA }, { order: b, dueMs: dueB }) => {
        if (dueA !== dueB) return (dueA ?? 0) - (dueB ?? 0);
        return sortOrdersByTicketAndTime(a, b);
      })
      .map(({ order }) => ({
        ...order,
        kitchenEstimateMinutes: getKitchenEstimateMinutes(order, settings),
      }));

    return NextResponse.json({
      orders: openOrders,
    });
  } catch (error) {
    console.error('Failed to fetch kitchen orders', error);
    return NextResponse.json({ date: formatDate(), orders: [] }, { status: 500 });
  }
}
