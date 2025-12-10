import { Modifier } from '@/lib/modifier_manager';

export type PaymentType = 'CASH' | 'CARD' | 'OTHER';

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
  modifiers: Modifier[];
  lineTotal: number;
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
  items: OrderItem[];
  totals: OrderTotals;
  taxFree: boolean;
  note?: string;
  payments?: Payment[];
  discountCents?: number;
  ticketNumber?: number;
  kitchenStatus?: KitchenStatus;
  estimatedPrepMinutes?: number;
  targetReadyAt?: string;
}
