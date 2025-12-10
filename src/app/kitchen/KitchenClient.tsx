"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { OrderItem } from '@/domain/models/order';

interface KitchenOrder {
  id: string;
  orderNumber: string;
  ticketNumber: number | null;
  createdAt: string;
  items: OrderItem[];
  estimatedPrepMinutes: number | null;
  targetReadyAt: string | null;
  secondsRemaining: number;
  isOverdue: boolean;
  note: string | null;
}

interface KitchenApiResponse {
  orders: KitchenOrder[];
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
  let diffSeconds: number;

  if (order.targetReadyAt) {
    diffSeconds = Math.round((new Date(order.targetReadyAt).getTime() - nowMs) / 1000);
  } else if (order.estimatedPrepMinutes) {
    const target = new Date(order.createdAt).getTime() + order.estimatedPrepMinutes * 60_000;
    diffSeconds = Math.round((target - nowMs) / 1000);
  } else {
    const fallback = order.isOverdue ? -order.secondsRemaining : order.secondsRemaining;
    diffSeconds = typeof fallback === 'number' ? fallback : 0;
  }

  const isOverdue = diffSeconds < 0 || order.isOverdue;
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

  useEffect(() => {
    setNow(new Date());

    const id = setInterval(() => {
      setNow(new Date());
    }, 1000);

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

  const handleComplete = useCallback(
    async (orderNumber: number | string) => {
      try {
        await fetch('/api/kitchen/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderNumber }),
        });
        await fetchOrders();
      } catch (error) {
        console.error('Failed to mark order as complete', error);
      }
    },
    [fetchOrders],
  );

  const sortedOrders = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const timeA = getSortTimestamp(a);
        const timeB = getSortTimestamp(b);
        if (timeA !== timeB) return timeA - timeB;

        const ticketA = typeof a.ticketNumber === 'number' ? a.ticketNumber : Number.MAX_SAFE_INTEGER;
        const ticketB = typeof b.ticketNumber === 'number' ? b.ticketNumber : Number.MAX_SAFE_INTEGER;
        return ticketA - ticketB;
      }),
    [orders],
  );

  const nowMs = now?.getTime() ?? Date.now();

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <header className="mb-8 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-white/50">Kitchen</p>
          <h1 className="text-3xl font-black md:text-4xl">Order Queue</h1>
          <p className="text-sm text-white/60">Auto-refreshes every 5 seconds</p>
        </div>
        <div className="rounded-full bg-white/5 px-4 py-2 text-sm text-white/70 ring-1 ring-white/10">
          <div suppressHydrationWarning>
            {now
              ? now.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : ''}
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex h-[70vh] items-center justify-center text-2xl text-white/60">
          Loading orders…
        </div>
      ) : sortedOrders.length === 0 ? (
        <div className="flex h-[70vh] items-center justify-center text-3xl font-semibold text-white/60">
          Waiting for orders…
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sortedOrders.map((order) => {
            const countdown = formatCountdown(order, nowMs);

            return (
              <div
                key={order.id}
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
                    <div key={`${order.id}-${item.productId}-${item.name}`}>{buildItemLabel(item)}</div>
                  ))}
                  {order.note ? (
                    <div className="mt-3 rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-base font-medium text-amber-100">
                      Note: {order.note}
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex items-center justify-between text-sm text-white/60">
                  <span>Placed at {formatTime(order.createdAt)}</span>
                  {order.estimatedPrepMinutes ? (
                    <span>Estimate: {order.estimatedPrepMinutes} min</span>
                  ) : (
                    <span>Live</span>
                  )}
                </div>
                <button
                  className="mt-4 w-full rounded-xl bg-emerald-500/20 px-4 py-3 text-lg font-semibold text-emerald-100 transition hover:bg-emerald-500/30"
                  onClick={() => handleComplete(order.orderNumber)}
                >
                  Mark Complete
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
