import type { Order } from '../models/order';
import { isOrderTaxable } from '../models/order';

export interface IncomeSummary {
  fromDate: string;
  toDate: string;
  totalSalesCents: number;
  orderCount: number;
  payments: {
    cashCents: number;
    cardCents: number;
    otherCents: number;
  };
  discountCents?: number;
}

type PaymentType = 'CASH' | 'CARD' | 'OTHER';

interface PaymentLike {
  type?: string;
  amountCents?: number;
  amount?: number;
}

function toCents(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

export function calculateIncomeSummary(orders: Order[], fromDate: string, toDate: string): IncomeSummary {
  const summary: IncomeSummary = {
    fromDate,
    toDate,
    orderCount: 0,
    totalSalesCents: 0,
    payments: {
      cashCents: 0,
      cardCents: 0,
      otherCents: 0,
    },
    discountCents: 0,
  };

  orders.filter(isOrderTaxable).forEach((order) => {
    summary.orderCount += 1;
    const total = toCents(order.totals?.total ?? 0);
    summary.totalSalesCents += total;

    if (typeof order.discountCents === 'number') {
      summary.discountCents = (summary.discountCents ?? 0) + order.discountCents;
    }

    const payments = Array.isArray((order as unknown as { payments?: PaymentLike[] }).payments)
      ? (order as unknown as { payments?: PaymentLike[] }).payments
      : [];

    payments.forEach((payment) => {
      const type = (payment.type?.toUpperCase() as PaymentType) ?? 'OTHER';
      const key: PaymentType = type === 'CASH' || type === 'CARD' ? type : 'OTHER';
      const amount = typeof payment.amountCents === 'number'
        ? payment.amountCents
        : toCents(payment.amount);
      if (key === 'CASH') summary.payments.cashCents += amount;
      if (key === 'CARD') summary.payments.cardCents += amount;
      if (key === 'OTHER') summary.payments.otherCents += amount;
    });
  });

  if (summary.discountCents === 0) {
    summary.discountCents = undefined;
  }

  return summary;
}
