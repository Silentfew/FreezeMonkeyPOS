import type { OrderItem } from '../models/order';
import type { Product } from '../models/product';

interface EstimateOptions {
  globalBufferMinutes?: number;
  perExtraItemBufferMinutes?: number;
}

export function estimateOrderPrepMinutes(
  items: OrderItem[],
  allProducts: Product[],
  options: EstimateOptions = {},
): number {
  const { globalBufferMinutes = 2, perExtraItemBufferMinutes = 1 } = options;

  let maxPrep = 0;
  let totalItems = 0;

  for (const item of items) {
    totalItems += item.quantity;

    const product = allProducts.find((p) => p.id === item.productId);
    const prep = product?.prepMinutes ?? 1;

    if (prep > maxPrep) {
      maxPrep = prep;
    }
  }

  const extraItems = Math.max(totalItems - 1, 0);

  return maxPrep + extraItems * perExtraItemBufferMinutes + globalBufferMinutes;
}
