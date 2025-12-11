import { calculateModifierImpact, Modifier } from './modifier_manager';

export interface SaleProduct {
  id: string;
  name: string;
  price: number;
  categoryId?: string | number;
}

export interface OrderItem {
  uid: string;
  productId: string;
  name: string;
  basePrice: number;
  quantity: number;
  categoryId?: string | number;
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
    categoryId: product.categoryId,
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
  taxRatePercent = 15,
  pricesIncludeTax = false,
): Totals {
  const lineTotalsCents = items.reduce(
    (sum, item) => sum + Math.round(calculateItemTotal(item) * 100),
    0,
  );

  if (taxFree || !taxRatePercent || taxRatePercent <= 0) {
    return {
      subtotal: lineTotalsCents / 100,
      tax: 0,
      total: lineTotalsCents / 100,
    };
  }

  const rate = taxRatePercent / 100;

  if (pricesIncludeTax) {
    const totalCents = lineTotalsCents;
    const subtotalCents = Math.round(totalCents / (1 + rate));
    const taxCents = totalCents - subtotalCents;
    return {
      subtotal: subtotalCents / 100,
      tax: taxCents / 100,
      total: totalCents / 100,
    };
  }

  const subtotalCents = lineTotalsCents;
  const taxCents = Math.round(subtotalCents * rate);
  const totalCents = subtotalCents + taxCents;

  return {
    subtotal: subtotalCents / 100,
    tax: taxCents / 100,
    total: totalCents / 100,
  };
}
