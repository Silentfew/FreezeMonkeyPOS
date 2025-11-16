import { calculateModifierImpact, Modifier } from './modifier_manager';

export interface SaleProduct {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  uid: string;
  productId: string;
  name: string;
  basePrice: number;
  quantity: number;
  modifiers: Modifier[];
}

export interface Totals {
  subtotal: number;
  tax: number;
  total: number;
}

export function createOrderItem(
  product: SaleProduct,
  modifiers: Modifier[] = [],
  quantity = 1,
): OrderItem {
  const uid = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? (crypto as Crypto).randomUUID()
    : `item-${Date.now()}-${Math.random()}`;

  return {
    uid,
    productId: product.id,
    name: product.name,
    basePrice: product.price,
    quantity,
    modifiers,
  };
}

export function updateItemQuantity(items: OrderItem[], uid: string, delta: number): OrderItem[] {
  return items
    .map((item) =>
      item.uid === uid
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item,
    )
    .filter((item) => item.quantity > 0);
}

export function removeItem(items: OrderItem[], uid: string): OrderItem[] {
  return items.filter((item) => item.uid !== uid);
}

export function updateItemModifiers(
  items: OrderItem[],
  uid: string,
  modifiers: Modifier[],
): OrderItem[] {
  return items.map((item) => (item.uid === uid ? { ...item, modifiers } : item));
}

export function replaceItem(items: OrderItem[], replacement: OrderItem): OrderItem[] {
  const existingIndex = items.findIndex((item) => item.uid === replacement.uid);
  if (existingIndex === -1) {
    return [...items, replacement];
  }
  const clone = [...items];
  clone[existingIndex] = replacement;
  return clone;
}

export function calculateItemTotal(item: OrderItem): number {
  const modifierImpact = calculateModifierImpact(item.modifiers);
  const unitPrice = item.basePrice + modifierImpact;
  return unitPrice * item.quantity;
}

export function calculateTotals(
  items: OrderItem[],
  taxFree: boolean,
  taxRate = 0.15,
): Totals {
  const subtotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  const tax = taxFree ? 0 : subtotal * taxRate;
  const total = subtotal + tax;
  return { subtotal, tax, total };
}
