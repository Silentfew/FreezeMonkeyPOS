import type { Order } from '../models/order';

export interface TaxSummary {
  orderCount: number;
  totalTaxableCents: number;
  totalTaxCents: number;
  totalGrossCents: number;
  byPaymentType: {
    CASH: number;
    CARD: number;
    OTHER: number;
  };
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

export function getTaxSummary(orders: Order[]): TaxSummary {
  const summary: TaxSummary = {
    orderCount: orders.length,
    totalTaxableCents: 0,
    totalTaxCents: 0,
    totalGrossCents: 0,
    byPaymentType: {
      CASH: 0,
      CARD: 0,
      OTHER: 0,
    },
  };

  orders.forEach((order) => {
    const subtotal = toCents(order.totals?.subtotal ?? 0);
    const tax = toCents(order.totals?.tax ?? 0);
    summary.totalTaxableCents += subtotal;
    summary.totalTaxCents += tax;
    summary.totalGrossCents += subtotal + tax;

    const payments = Array.isArray((order as unknown as { payments?: PaymentLike[] }).payments)
      ? (order as unknown as { payments?: PaymentLike[] }).payments
      : [];

    payments.forEach((payment) => {
      const type = (payment.type?.toUpperCase() as PaymentType) ?? 'OTHER';
      const key: PaymentType = type === 'CASH' || type === 'CARD' ? type : 'OTHER';
      const amount = typeof payment.amountCents === 'number'
        ? payment.amountCents
        : toCents(payment.amount);
      summary.byPaymentType[key] += amount;
    });
  });

  return summary;
}
