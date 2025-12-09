import { Modifier } from '@/lib/modifier_manager';
import {
  OrderItem as DraftOrderItem,
  calculateItemTotal,
  calculateTotals,
} from '@/lib/order_manager';
import { Order, OrderItem, OrderTotals } from '../models/order';
import type { Payment } from '../models/order';

export interface OrderDraft {
  items: DraftOrderItem[];
  taxFree?: boolean;
  note?: string;
  taxRate?: number;
  payments?: Payment[] | { type?: string; amountCents?: number; amount?: number }[];
}

interface BuildContext {
  orderNumber: string;
  createdAt?: string;
}

function normalizeModifiers(modifiers: Modifier[]): Modifier[] {
  return modifiers.map((modifier) => ({ ...modifier }));
}

function buildItems(items: DraftOrderItem[]): OrderItem[] {
  return items.map((item) => ({
    productId: item.productId,
    name: item.name,
    basePrice: item.basePrice,
    quantity: item.quantity,
    modifiers: normalizeModifiers(item.modifiers),
    lineTotal: calculateItemTotal(item),
  }));
}

function buildTotals(items: DraftOrderItem[], taxFree: boolean, taxRate?: number): OrderTotals {
  return calculateTotals(items, taxFree, taxRate ?? 0.15);
}

export function createOrderFromDraft(draft: OrderDraft, context: BuildContext): Order {
  const taxFree = draft.taxFree ?? false;
  const createdAt = context.createdAt ?? new Date().toISOString();
  const items = buildItems(draft.items);
  const totals = buildTotals(draft.items, taxFree, draft.taxRate);

  const payments =
    Array.isArray(draft.payments) && draft.payments.length > 0
      ? draft.payments.map((p: any) => {
          const amountCents =
            typeof p.amountCents === 'number'
              ? p.amountCents
              : typeof p.amount === 'number'
              ? Math.round(p.amount * 100)
              : 0;
          return {
            type: p.type ?? 'OTHER',
            amountCents,
          } as Payment;
        })
      : undefined;

  return {
    orderNumber: context.orderNumber,
    createdAt,
    items,
    totals,
    taxFree,
    note: draft.note,
    payments,
  };
}
