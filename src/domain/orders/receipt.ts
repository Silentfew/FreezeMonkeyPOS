import type { Order } from '../models/order';

export interface ReceiptLine {
  type: 'text' | 'total' | 'separator';
  value: string;
}

function toCents(value: number | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

export function buildReceiptLines(order: Order): ReceiptLine[] {
  const lines: ReceiptLine[] = [];

  lines.push({ type: 'text', value: `Freeze Monkey POS` });
  lines.push({ type: 'text', value: `Ticket ${order.orderNumber}` });
  lines.push({ type: 'text', value: new Date(order.createdAt).toLocaleString() });
  lines.push({ type: 'separator', value: '------------------------------' });

  for (const item of order.items) {
    lines.push({
      type: 'text',
      value: `${item.quantity} x ${item.name}  $${(item.basePrice ?? 0).toFixed(2)}`,
    });
  }

  lines.push({ type: 'separator', value: '------------------------------' });

  const subtotal = toCents(order.totals?.subtotal ?? 0);
  const tax = toCents(order.totals?.tax ?? 0);
  const total = toCents(order.totals?.total ?? subtotal + tax);

  lines.push({ type: 'text', value: `Subtotal: $${(subtotal / 100).toFixed(2)}` });
  if (order.discountCents && order.discountCents > 0) {
    lines.push({
      type: 'text',
      value: `Discount: -$${(order.discountCents / 100).toFixed(2)}`,
    });
  }
  lines.push({ type: 'text', value: `GST: $${(tax / 100).toFixed(2)}` });
  lines.push({ type: 'total', value: `TOTAL: $${(total / 100).toFixed(2)}` });

  return lines;
}
