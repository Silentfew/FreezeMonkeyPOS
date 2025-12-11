'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminHeader } from '@/components/AdminHeader';
import { Order, PaymentType } from '@/domain/models/order';

interface OrdersResponse {
  orders: Order[];
}

interface RefundModalState {
  order: Order;
  method: PaymentType;
  reason: string;
}

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatCurrency(cents: number | undefined): string {
  if (typeof cents !== 'number' || Number.isNaN(cents)) return '$0.00';
  return `$${(cents / 100).toFixed(2)}`;
}

function normalizeTotalCents(order: Order): number {
  return Math.round((order.totals?.total ?? 0) * 100);
}

function paymentSummary(order: Order): string {
  const payments = Array.isArray(order.payments) ? order.payments : [];
  if (!payments.length) return '—';

  return payments
    .map((payment) => {
      const amountCents =
        typeof payment.amountCents === 'number'
          ? payment.amountCents
          : typeof (payment as any)?.amount === 'number'
            ? Math.round((payment as any).amount * 100)
            : 0;
      const label = typeof payment.type === 'string' ? payment.type : 'OTHER';
      return `${label} ${formatCurrency(amountCents)}`;
    })
    .join(', ');
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function OrdersReportPage() {
  const [date, setDate] = useState<string>(() => formatDateInput(new Date()));
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [modalState, setModalState] = useState<RefundModalState | null>(null);
  const [savingRefund, setSavingRefund] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const response = await fetch(`/api/orders?date=${date}`);
      const payload = (await response.json().catch(() => ({}))) as OrdersResponse;
      if (!response.ok) {
        throw new Error((payload as any)?.error ?? 'Failed to load orders');
      }
      setOrders(payload.orders ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load orders';
      setError(message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openRefundModal = (order: Order) => {
    setModalState({ order, method: 'CARD', reason: '' });
  };

  const closeModal = () => {
    setModalState(null);
    setSavingRefund(false);
  };

  const handleRefund = async () => {
    if (!modalState) return;
    setSavingRefund(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch(`/api/orders/${modalState.order.orderNumber}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, method: modalState.method, reason: modalState.reason }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((payload as any)?.error ?? 'Failed to refund order');
      }

      const updatedOrder = payload as Order;
      setOrders((prev) => prev.map((order) => (order.orderNumber === updatedOrder.orderNumber ? updatedOrder : order)));
      setStatus(`Order ${updatedOrder.orderNumber} marked as refunded.`);
      closeModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refund order';
      setError(message);
      setSavingRefund(false);
    }
  };

  const ordersForDisplay = useMemo(
    () =>
      orders.map((order) => ({
        ...order,
        status: order.status ?? 'PAID',
      })),
    [orders],
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B1222] via-[#0e1528] to-[#1E1E1E] text-white">
      <AdminHeader />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#E9F9FF]/60">Admin · Reports</p>
            <h1 className="text-3xl font-black text-[#E9F9FF]">Orders / Refunds</h1>
            <p className="text-sm text-white/70">Review daily orders and mark full refunds (admin only).</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 p-5 shadow-lg ring-1 ring-white/10">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col text-sm text-white/80">
              <span className="text-xs uppercase tracking-[0.2em] text-white/60">Date</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="rounded-xl border border-white/10 bg-[#0B1222] px-3 py-2 text-white outline-none focus:border-[#00C2FF]/60"
              />
            </label>

            <button
              type="button"
              onClick={loadOrders}
              disabled={loading}
              className="rounded-xl bg-[#00C2FF] px-4 py-2 text-sm font-semibold text-[#0b1222] shadow-lg transition hover:bg-[#4dd9ff] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Loading...' : 'Load'}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
        )}

        {status && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {status}
          </div>
        )}

        <div className="space-y-3 rounded-2xl bg-white/5 p-5 shadow-lg ring-1 ring-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-[#E9F9FF]">Orders for {date}</h2>
            <span className="text-sm text-white/60">{orders.length} order(s)</span>
          </div>

          {ordersForDisplay.length === 0 && !loading && (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-white/60">
              No orders recorded for this date.
            </div>
          )}

          <div className="space-y-3">
            {ordersForDisplay.map((order) => {
              const totalCents = normalizeTotalCents(order);
              const statusBadge =
                order.status === 'REFUNDED'
                  ? 'bg-amber-500/20 text-amber-100'
                  : order.status === 'CANCELLED'
                    ? 'bg-red-500/20 text-red-100'
                    : 'bg-emerald-500/20 text-emerald-100';

              return (
                <div
                  key={order.orderNumber}
                  className="rounded-2xl border border-white/5 bg-[#0B1222] p-4 shadow-sm ring-1 ring-white/10"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-[#E9F9FF]">Order {order.orderNumber}</h3>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadge}`}>
                          {order.status ?? 'PAID'}
                        </span>
                      </div>
                      <p className="text-sm text-white/70">Placed at {formatTime(order.createdAt)}</p>
                      <p className="text-sm text-white/60">Payments: {paymentSummary(order)}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/50">Total</p>
                      <p className="text-2xl font-black text-[#FFE561]">{formatCurrency(totalCents)}</p>
                      <p className="text-xs text-white/60">Items: {order.items?.length ?? 0}</p>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 md:w-48">
                      {order.status === 'REFUNDED' && order.refund ? (
                        <div className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-100">
                          Refunded {formatCurrency(totalCents)}
                          <br />
                          {order.refund.refundedBy ? `By ${order.refund.refundedBy}` : 'Refund recorded'}
                          <br />
                          {formatTime(order.refund.refundedAt)}
                          {order.refund.reason ? <><br />Reason: {order.refund.reason}</> : null}
                        </div>
                      ) : order.status === 'CANCELLED' ? (
                        <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-100">Cancelled</div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openRefundModal(order)}
                          className="rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-black shadow-lg transition hover:bg-rose-400 active:scale-95"
                        >
                          Refund order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {modalState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0B1222] p-6 text-white shadow-2xl ring-1 ring-white/10">
            <h3 className="text-xl font-black text-[#E9F9FF]">Refund {modalState.order.orderNumber}</h3>
            <p className="mt-1 text-sm text-white/70">
              This will mark the order as fully refunded for reporting.
            </p>

            <div className="mt-4 space-y-3">
              <label className="flex flex-col gap-2 text-sm text-white/80">
                <span className="text-xs uppercase tracking-[0.2em] text-white/60">Refund method</span>
                <select
                  value={modalState.method}
                  onChange={(event) =>
                    setModalState((prev) =>
                      prev ? { ...prev, method: event.target.value as PaymentType } : prev,
                    )
                  }
                  className="rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-white outline-none focus:border-[#00C2FF]/60"
                >
                  {(['CASH', 'CARD', 'OTHER'] as PaymentType[]).map((method) => (
                    <option key={method} value={method}>
                      {method === 'CARD' ? 'Card / EFTPOS' : method === 'CASH' ? 'Cash' : 'Other'}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm text-white/80">
                <span className="text-xs uppercase tracking-[0.2em] text-white/60">Reason (optional)</span>
                <textarea
                  value={modalState.reason}
                  onChange={(event) =>
                    setModalState((prev) => (prev ? { ...prev, reason: event.target.value } : prev))
                  }
                  rows={3}
                  className="rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-white outline-none focus:border-[#00C2FF]/60"
                  placeholder="Customer change of mind"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                disabled={savingRefund}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRefund}
                disabled={savingRefund}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-black shadow-lg transition hover:bg-rose-400 active:scale-95 disabled:opacity-60"
              >
                {savingRefund ? 'Processing...' : 'Confirm refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
