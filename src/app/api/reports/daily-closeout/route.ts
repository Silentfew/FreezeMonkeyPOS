import { NextResponse } from 'next/server';
import type { Order } from '@/domain/models/order';
import { formatDate, getOrdersForDate } from '@/infra/fs/ordersRepo';

function isValidDateString(value: string | null): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toCents(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

type PaymentType = 'CASH' | 'CARD' | 'OTHER';

type PaymentLike = {
  type?: string;
  amountCents?: number;
  amount?: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const date = isValidDateString(dateParam) ? dateParam : formatDate();

  try {
    const orders = await getOrdersForDate(date);

    const summary = orders.reduce(
      (acc, order) => {
        const subtotal = toCents(order.totals?.subtotal ?? 0);
        const tax = toCents(order.totals?.tax ?? 0);
        acc.orderCount += 1;
        acc.taxableCents += subtotal;
        acc.taxCents += tax;
        acc.grossCents += subtotal + tax;
        acc.discountCentsTotal += typeof order.discountCents === 'number' ? order.discountCents : 0;

        const payments = Array.isArray((order as Order).payments)
          ? ((order as Order).payments as PaymentLike[])
          : [];

        payments.forEach((payment) => {
          const type = (payment.type?.toUpperCase() as PaymentType) ?? 'OTHER';
          const key: PaymentType = type === 'CASH' || type === 'CARD' ? type : 'OTHER';
          const amount = typeof payment.amountCents === 'number' ? payment.amountCents : toCents(payment.amount);
          acc[`${key.toLowerCase()}Cents` as 'cashCents' | 'cardCents' | 'otherCents'] += amount;
        });

        return acc;
      },
      {
        orderCount: 0,
        taxableCents: 0,
        taxCents: 0,
        grossCents: 0,
        cashCents: 0,
        cardCents: 0,
        otherCents: 0,
        discountCentsTotal: 0,
      },
    );

    return NextResponse.json({
      date,
      summary,
    });
  } catch (error) {
    console.error('Failed to build daily closeout report', error);
    return NextResponse.json({ error: 'Failed to build daily closeout report' }, { status: 500 });
  }
}
