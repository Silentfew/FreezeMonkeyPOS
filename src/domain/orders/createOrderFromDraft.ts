import { Modifier } from '@/lib/modifier_manager';
import {
  OrderItem as DraftOrderItem,
  calculateItemTotal,
  calculateTotals,
} from '@/lib/order_manager';
import { Order, OrderItem, OrderTotals } from '../models/order';
import type { Payment } from '../models/order';
import { loadSettings } from '@/infra/fs/settingsRepo';
import { getKitchenEstimateMinutes } from './kitchenEstimate';

export interface OrderDraft {
  items: DraftOrderItem[];
  taxFree?: boolean;
  note?: string;
  taxRate?: number;
  payments?:
    | Payment[]
    | { type?: string; amountCents?: number; amount?: number; givenCents?: number; changeCents?: number }[];
  discountCents?: number;
}

interface BuildContext {
  orderNumber: string;
  createdAt?: string;
  ticketNumber?: number;
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
    categoryId: item.categoryId,
    modifiers: normalizeModifiers(item.modifiers),
    lineTotal: calculateItemTotal(item),
  }));
}

function buildTotals(items: DraftOrderItem[], taxFree: boolean, taxRate?: number): OrderTotals {
  return calculateTotals(items, taxFree, taxRate ?? 0.15);
}

export async function createOrderFromDraft(
  draft: OrderDraft,
  context: BuildContext,
): Promise<Order> {
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
            givenCents: typeof p.givenCents === 'number' ? p.givenCents : undefined,
            changeCents: typeof p.changeCents === 'number' ? p.changeCents : undefined,
          } as Payment;
        })
      : undefined;

  const discountCents =
    typeof draft.discountCents === 'number' && draft.discountCents > 0
      ? draft.discountCents
      : undefined;

  const settings = await loadSettings();

  const orderBase: Order = {
    orderNumber: context.orderNumber,
    createdAt,
    items,
    totals,
    taxFree,
    status: 'PAID',
    note: draft.note,
    payments,
    discountCents,
    ticketNumber: context.ticketNumber,
    kitchenStatus: 'OPEN',
  };

  const estimatedPrepMinutes = getKitchenEstimateMinutes(orderBase, settings);

  const targetReadyAtDate = new Date(createdAt);
  targetReadyAtDate.setTime(targetReadyAtDate.getTime() + estimatedPrepMinutes * 60_000);

  return {
    ...orderBase,
    estimatedPrepMinutes,
    targetReadyAt: targetReadyAtDate.toISOString(),
  };
}
