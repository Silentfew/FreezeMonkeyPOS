import type { Order } from '../models/order';
import type { Settings } from '../models/settings';

export function getKitchenEstimateMinutes(order: Order, settings: Settings): number {
  const kitchen = settings.kitchen;
  if (!kitchen) return 7;

  const defaultMinutes = kitchen.defaultMinutes ?? 7;

  const firstItem = order.items[0];
  if (!firstItem) return defaultMinutes;

  const categoryId = Number(firstItem.categoryId);
  const categoryConfig = kitchen.categories?.find((c) => c.categoryId === categoryId);

  const minutes = categoryConfig?.minutes ?? defaultMinutes;
  return minutes > 0 ? minutes : defaultMinutes;
}
