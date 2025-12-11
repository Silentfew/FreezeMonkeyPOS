import { Modifier } from '@/lib/modifier_manager';

export type PaymentType = 'CASH' | 'CARD' | 'OTHER';

export type OrderStatus = 'PAID' | 'CANCELLED' | 'REFUNDED';

export interface Payment {
  type: PaymentType | string;
  amountCents: number;
  givenCents?: number;
  changeCents?: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  basePrice: number;
  quantity: number;
  categoryId?: string | number;
  modifiers: Modifier[];
  lineTotal: number;
}

export interface RefundInfo {
  refundedAt: string;
  method: PaymentType;
  reason?: string;
  refundedBy?: string;
}

export interface OrderTotals {
  subtotal: number;
  tax: number;
  total: number;
}

export type KitchenStatus = 'OPEN' | 'DONE';

export interface Order {
  orderNumber: string;
  createdAt: string;
  kitchenDueAt?: string;
  items: OrderItem[];
  totals: OrderTotals;
  taxFree: boolean;
  status?: OrderStatus;
  note?: string;
  payments?: Payment[];
  discountCents?: number;
  ticketNumber?: number;
  kitchenStatus?: KitchenStatus;
  estimatedPrepMinutes?: number;
  targetReadyAt?: string;
  kitchenCompletedAt?: string;
  refund?: RefundInfo;
}

export function isOrderTaxable(order: Order): boolean {
  return order.status !== 'REFUNDED' && order.status !== 'CANCELLED';
}
