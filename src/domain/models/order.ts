import { Modifier } from '@/lib/modifier_manager';

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

export interface Order {
  orderNumber: string;
  createdAt: string;
  items: OrderItem[];
  totals: OrderTotals;
  taxFree: boolean;
  note?: string;
}
