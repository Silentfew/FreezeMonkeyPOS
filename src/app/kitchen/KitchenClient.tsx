"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Order, OrderItem } from '@/domain/models/order';

type KitchenOrder = Order & { kitchenEstimateMinutes?: number };

interface KitchenApiResponse {
  orders: KitchenOrder[];
}

function getEstimateMinutes(order: KitchenOrder) {
  return order.kitchenEstimateMinutes ?? order.estimatedPrepMinutes ?? 7;
}

function getDueTimestamp(order: KitchenOrder): number | null {
  if (order.kitchenDueAt) {
    const parsed = new Date(order.kitchenDueAt).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }

  if (order.targetReadyAt) {
    const parsed = new Date(order.targetReadyAt).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }

  const estimateMinutes = getEstimateMinutes(order);
  const created = new Date(order.createdAt).getTime();
  if (Number.isNaN(created)) return null;
  return created + estimateMinutes * 60_000;
}

function buildItemLabel(item: OrderItem) {
  const modifierText = item.modifiers?.length
    ? ` (${item.modifiers.map((modifier) => modifier.name).join(', ')})`
    : '';
  return `${item.quantity} x ${item.name}${modifierText}`;
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function computeTime(order: KitchenOrder, nowMs: number) {
  const due = getDueTimestamp(order);
  const diffSeconds = due ? Math.round((due - nowMs) / 1000) : -1;

  const isOverdue = diffSeconds < 0;
  const remainingSeconds = Math.max(diffSeconds, 0);
  const overdueSeconds = Math.max(-diffSeconds, 0);

  return { isOverdue, remainingSeconds, overdueSeconds };
}

function formatCountdown(order: KitchenOrder, nowMs: number) {
  const { isOverdue, remainingSeconds, overdueSeconds } = computeTime(order, nowMs);

  if (isOverdue) {
    const minutes = Math.max(1, Math.ceil(overdueSeconds / 60));
    return {
      label: `Overdue ${minutes} min`,
      isOverdue: true,
    };
  }

  if (remainingSeconds >= 3600) {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    return { label: `${hours}h ${minutes.toString().padStart(2, '0')}m`, isOverdue: false };
  }

  if (remainingSeconds >= 60) {
    const minutes = Math.ceil(remainingSeconds / 60);
    return { label: `${minutes} min`, isOverdue: false };
  }

  return { label: `${remainingSeconds}s`, isOverdue: false };
}

function getSortTimestamp(order: KitchenOrder) {
  if (order.targetReadyAt) return new Date(order.targetReadyAt).getTime();
  return new Date(order.createdAt).getTime();
}

export default function KitchenClient() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date | null>(null);
  const [clock, setClock] = useState<string>('');

  useEffect(() => {
    const updateNow = () => {
      const current = new Date();
      setNow(current);
      setClock(
        current.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    };

    updateNow();

    const id = setInterval(updateNow, 1000);

    return () => clearInterval(id);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/kitchen/orders', { cache: 'no-store' });
      if (!response.ok) return;
      const data: KitchenApiResponse = await response.json();
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch (error) {
      console.error('Failed to load kitchen orders', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const wrappedFetch = async () => {
      if (!active) return;
      await fetchOrders();
    };

    wrappedFetch();
    const interval = setInterval(wrappedFetch, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [fetchOrders]);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const timeA = getDueTimestamp(a) ?? getSortTimestamp(a);
        const timeB = getDueTimestamp(b) ?? getSortTimestamp(b);
        if (timeA !== timeB) return timeA - timeB;

        const ticketA = typeof a.ticketNumber === 'number' ? a.ticketNumber : Number.MAX_SAFE_INTEGER;
        const ticketB = typeof b.ticketNumber === 'number' ? b.ticketNumber : Number.MAX_SAFE_INTEGER;
        return ticketA - ticketB;
      }),
    [orders],
  );

  const nowMs = now?.getTime() ?? Date.now();
  const visibleOrders = useMemo(
    () =>
      sortedOrders.filter((order) => {
        const due = getDueTimestamp(order);
        if (!due) return false;
        return due > nowMs;
      }),
    [sortedOrders, nowMs],
  );

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <header className="mb-8 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">Kitchen</p>
          <h1 className="text-3xl font-black md:text-4xl">Order Queue</h1>
          <p className="text-sm text-white/60">Auto-refreshes every 5 seconds</p>
        </div>
        <div className="rounded-full bg-white/5 px-4 py-2 text-sm text-white/70 ring-1 ring-white/10">
          <div suppressHydrationWarning>{clock || '--:--:--'}</div>
        </div>
      </header>

      {loading ? (
        <div className="flex h-[70vh] items-center justify-center text-2xl text-white/60">
          Loading orders…
        </div>
      ) : visibleOrders.length === 0 ? (
        <div className="flex h-[70vh] items-center justify-center text-3xl font-semibold text-white/60">
          Waiting for orders…
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {visibleOrders.map((order) => {
            const countdown = formatCountdown(order, nowMs);
            const estimateMinutes = getEstimateMinutes(order);

            return (
              <div
                key={order.orderNumber}
                className="flex h-full flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">Order</p>
                    <p className="text-3xl font-black md:text-4xl">#{order.ticketNumber ?? order.orderNumber}</p>
                  </div>
                  <div
                    className={`rounded-xl px-4 py-3 text-2xl font-black md:text-3xl ${
                      countdown.isOverdue ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-200'
                    }`}
                  >
                    {countdown.label}
                  </div>
                </div>

                <div className="flex-1 space-y-2 text-xl font-semibold">
                  {order.items.map((item) => (
                    <div key={`${order.orderNumber}-${item.productId}-${item.name}`}>{buildItemLabel(item)}</div>
                  ))}
                  {order.note ? (
                    <div className="mt-3 rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-base font-medium text-amber-100">
                      Note: {order.note}
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex items-center justify-between text-sm text-white/60">
                  <span>Placed at {formatTime(order.createdAt)}</span>
                  <span>Estimate: {estimateMinutes} min</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
