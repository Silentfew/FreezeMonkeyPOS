'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Order, OrderItem } from '@/domain/models/order';
import type { Product } from '@/domain/models/product';

interface KitchenApiResponse {
  date: string;
  orders: Order[];
}

const INCLUDE_DRINKS = false;

const BASE_KITCHEN_CATEGORY_IDS = ['1', '2', '3', '5'];

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildItemLabel(item: OrderItem) {
  const modifierText = item.modifiers?.length
    ? ` (${item.modifiers.map((modifier) => modifier.name).join(', ')})`
    : '';
  return `${item.quantity} x ${item.name}${modifierText}`;
}

export default function KitchenBoardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [productMap, setProductMap] = useState<Record<string, Product>>({});

  const allowedCategories = useMemo(() => {
    const ids = new Set(BASE_KITCHEN_CATEGORY_IDS);
    if (INCLUDE_DRINKS) {
      ids.add('4');
    }
    return ids;
  }, []);

  useEffect(() => {
    let active = true;
    const loadProducts = async () => {
      try {
        const response = await fetch('/api/products?includeInactive=true', { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        const map: Record<string, Product> = {};
        if (Array.isArray(data?.products)) {
          data.products.forEach((product: Product) => {
            map[product.id] = product;
          });
        }
        setProductMap(map);
      } catch (error) {
        console.error('Failed to load products for kitchen board', error);
      }
    };

    loadProducts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchOrders = async () => {
      try {
        const response = await fetch('/api/kitchen/orders', { cache: 'no-store' });
        if (!response.ok) return;
        const data: KitchenApiResponse = await response.json();
        if (!active) return;
        setOrders(Array.isArray(data?.orders) ? data.orders : []);
      } catch (error) {
        console.error('Failed to load kitchen orders', error);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const kitchenOrders = useMemo(() => {
    return orders
      .map((order) => {
        const kitchenItems = order.items.filter((item) => {
          const categoryId = productMap[item.productId]?.categoryId;
          return categoryId ? allowedCategories.has(categoryId) : false;
        });

        if (!kitchenItems.length) return null;

        return {
          ...order,
          items: kitchenItems,
        } satisfies Order;
      })
      .filter(Boolean) as Order[];
  }, [orders, productMap, allowedCategories]);

  return (
    <div className="min-h-screen bg-black text-white px-6 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-black tracking-wide md:text-4xl">
          FREEZE MONKEY — KITCHEN BOARD
        </h1>
        <p className="mt-2 text-lg text-white/70">Auto-updating every 5 seconds</p>
      </header>

      {kitchenOrders.length === 0 ? (
        <div className="flex h-[70vh] items-center justify-center">
          <p className="text-3xl font-bold text-white/70">Waiting for orders… ❄️</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {kitchenOrders.map((order) => (
            <div
              key={order.orderNumber}
              className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#0b0b0f] p-6 shadow-2xl"
            >
              <div className="mb-4 border-b border-white/10 pb-4">
                <div className="text-center text-6xl font-black tracking-tight">
                  TICKET {order.ticketNumber ?? order.orderNumber}
                </div>
              </div>

              <div className="flex-1 space-y-3">
                {order.items.map((item) => (
                  <div key={`${order.orderNumber}-${item.productId}-${item.name}`} className="text-2xl font-semibold">
                    {buildItemLabel(item)}
                  </div>
                ))}

                {order.note ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xl text-white/80">
                    Note: {order.note}
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex items-center justify-end text-2xl font-bold text-white/70">
                {formatTime(order.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
