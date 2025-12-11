import { NextResponse } from 'next/server';
import { isOrderTaxable, Order, PaymentType } from '@/domain/models/order';
import { DailyCloseoutSummary } from '@/domain/reports/dailyCloseout';
import { readDailyCloseout, saveDailyCloseout } from '@/infra/fs/closeoutRepo';
import { formatDate, getOrdersForDate } from '@/infra/fs/ordersRepo';

function isValidDateString(value: string | null): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toCents(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

type PaymentLike = {
  type?: string;
  amountCents?: number;
  amount?: number;
};

function buildBaseSummary(date: string, orders: Order[]): DailyCloseoutSummary {
  const paidOrders = orders.filter(isOrderTaxable);

  const summary = paidOrders.reduce(
    (acc, order) => {
      const subtotal = toCents(order.totals?.subtotal ?? 0);
      const tax = toCents(order.totals?.tax ?? 0);
      acc.taxableSalesCents += subtotal;
      acc.gstCents += tax;
      acc.totalInclTaxCents += subtotal + tax;
      // Safely handle possibly-undefined orderCount for TypeScript
      acc.orderCount = (acc.orderCount ?? 0) + 1;

      const discount = typeof order.discountCents === 'number' ? order.discountCents : 0;

      acc.discountCentsTotal = (acc.discountCentsTotal ?? 0) + discount;

      const payments = Array.isArray((order as Order).payments)
        ? ((order as Order).payments as PaymentLike[])
        : [];

      payments.forEach((payment) => {
        const type = (payment.type?.toUpperCase() as PaymentType) ?? 'OTHER';
        const key: PaymentType = type === 'CASH' || type === 'CARD' ? type : 'OTHER';
        const amount = typeof payment.amountCents === 'number' ? payment.amountCents : toCents(payment.amount);
        acc.payments[`${key.toLowerCase()}Cents` as 'cashCents' | 'cardCents' | 'otherCents'] += amount;
      });

      return acc;
    },
    {
      date,
      taxableSalesCents: 0,
      gstCents: 0,
      totalInclTaxCents: 0,
      payments: { cashCents: 0, cardCents: 0, otherCents: 0 },
      orderCount: 0,
      discountCentsTotal: 0,
    } as DailyCloseoutSummary & { payments: { cashCents: number; cardCents: number; otherCents: number } },
  );

  return summary;
}

function mergeSavedValues(base: DailyCloseoutSummary, saved: DailyCloseoutSummary | null): DailyCloseoutSummary {
  if (!saved) return base;

  const countedCashCents = typeof saved.countedCashCents === 'number' ? saved.countedCashCents : undefined;
  const notes = typeof saved.notes === 'string' ? saved.notes : undefined;
  const cashDifferenceCents =
    typeof countedCashCents === 'number' ? countedCashCents - base.payments.cashCents : undefined;

  return {
    ...base,
    countedCashCents,
    cashDifferenceCents,
    notes,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const date = isValidDateString(dateParam) ? dateParam : formatDate();

  try {
    const orders = await getOrdersForDate(date);
    const baseSummary = buildBaseSummary(date, orders);
    const saved = await readDailyCloseout(date);
    const summary = mergeSavedValues(baseSummary, saved);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Failed to build daily closeout report', error);
    return NextResponse.json({ error: 'Failed to build daily closeout report' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const date = isValidDateString(dateParam) ? dateParam : formatDate();

  try {
    const payload = await request.json().catch(() => ({}));
    const countedCashCentsRaw = payload?.countedCashCents;
    const notes = typeof payload?.notes === 'string' ? payload.notes : undefined;

    if (typeof countedCashCentsRaw !== 'number' || Number.isNaN(countedCashCentsRaw)) {
      return NextResponse.json({ error: 'countedCashCents must be provided as a number.' }, { status: 400 });
    }

    const countedCashCents = Math.round(countedCashCentsRaw);

    const orders = await getOrdersForDate(date);
    const baseSummary = buildBaseSummary(date, orders);

    const summary: DailyCloseoutSummary = {
      ...baseSummary,
      countedCashCents,
      cashDifferenceCents: countedCashCents - baseSummary.payments.cashCents,
      notes,
    };

    await saveDailyCloseout(summary);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Failed to save daily closeout report', error);
    return NextResponse.json({ error: 'Failed to save daily closeout report' }, { status: 500 });
  }
}
