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

export async function GET() {
  try {
    const date = formatDate();
    const orders = await getOrdersForDate(date);

    const openOrders = orders
      .filter((order) => order.kitchenStatus !== 'DONE')
      .sort(sortOrdersByTicketAndTime);

    return NextResponse.json({ date, orders: openOrders });
  } catch (error) {
    console.error('Failed to fetch kitchen orders', error);
    return NextResponse.json({ date: formatDate(), orders: [] }, { status: 500 });
  }
}
