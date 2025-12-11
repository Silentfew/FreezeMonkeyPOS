'use client';

import { useState } from 'react';
import { AdminHeader } from '@/components/AdminHeader';
import { DailyCloseoutSummary } from '@/domain/reports/dailyCloseout';

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDollars(cents: number | undefined): string {
  if (typeof cents !== 'number') return '0.00';
  return (cents / 100).toFixed(2);
}

interface ReportResponse {
  summary: DailyCloseoutSummary;
}

export default function DailyCloseoutReportPage() {
  const [date, setDate] = useState<string>(() => formatDateInput(new Date()));
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [countedCash, setCountedCash] = useState('');
  const [notes, setNotes] = useState('');

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      if (!date) {
        throw new Error('Please choose a date.');
      }
      const response = await fetch(`/api/reports/daily-closeout?date=${date}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? 'Failed to load report');
      }
      const data = (await response.json()) as ReportResponse;
      setReport(data);
      setCountedCash(
        typeof data.summary.countedCashCents === 'number'
          ? (data.summary.countedCashCents / 100).toFixed(2)
          : '',
      );
      setNotes(data.summary.notes ?? '');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load report';
      setError(message);
      setReport(null);
      setCountedCash('');
      setNotes('');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!report) return;
    const { summary } = report;
    const csv = [
      'date,orders,taxable,gst,total,cash,card,other,discounts,countedCash,difference,notes',
      `${summary.date},${summary.orderCount ?? 0},${formatDollars(summary.taxableSalesCents)},${formatDollars(summary.gstCents)},${formatDollars(summary.totalInclTaxCents)},${formatDollars(summary.payments.cashCents)},${formatDollars(summary.payments.cardCents)},${formatDollars(summary.payments.otherCents)},${formatDollars(summary.discountCentsTotal ?? 0)},${formatDollars(summary.countedCashCents)},${formatDollars(summary.cashDifferenceCents)},"${summary.notes ?? ''}"`,
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daily-closeout-${summary.date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!report) return;
    const parsedCounted = Number(countedCash);
    if (Number.isNaN(parsedCounted)) {
      setError('Enter a valid counted cash amount.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const countedCashCents = Math.round(parsedCounted * 100);
      const saveResponse = await fetch(`/api/reports/daily-closeout?date=${date}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countedCashCents, notes }),
      });

      if (!saveResponse.ok) {
        const payload = await saveResponse.json().catch(() => ({}));
        throw new Error(payload?.error ?? 'Failed to save closeout');
      }

      const data = (await saveResponse.json()) as ReportResponse;
      setReport(data);
      setStatus('Closeout saved.');
      setCountedCash(
        typeof data.summary.countedCashCents === 'number'
          ? (data.summary.countedCashCents / 100).toFixed(2)
          : '',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save closeout';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const expectedCash = report?.summary.payments.cashCents ?? 0;
  const hasCountedCash = typeof report?.summary.countedCashCents === 'number';
  const difference = hasCountedCash ? report?.summary.cashDifferenceCents ?? 0 : 0;
  const differencePositive = difference > 0;

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B1222] via-[#0e1528] to-[#1E1E1E] text-white">
      <AdminHeader />
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#E9F9FF]/60">Admin · Reports</p>
            <h1 className="text-3xl font-black text-[#E9F9FF]">Daily Closeout</h1>
            <p className="text-sm text-white/70">Review payments, tax, and cash counted at the end of the day.</p>
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
              onClick={loadReport}
              disabled={loading}
              className="rounded-xl bg-[#00C2FF] px-4 py-2 text-sm font-semibold text-[#0b1222] shadow-lg transition hover:bg-[#4dd9ff] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Loading...' : 'Load'}
            </button>

            {report && (
              <button
                type="button"
                onClick={exportCsv}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Export CSV
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {status && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {status}
          </div>
        )}

        {report && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-2xl bg-white/5 p-5 shadow-lg ring-1 ring-white/10">
              <h2 className="text-xl font-black text-[#E9F9FF]">Totals</h2>
              <div className="space-y-2 text-lg">
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
                  <span className="text-white/70">Taxable (ex GST)</span>
                  <span className="font-black text-[#FFE561]">${formatDollars(report.summary.taxableSalesCents)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
                  <span className="text-white/70">GST</span>
                  <span className="font-black text-[#FFE561]">${formatDollars(report.summary.gstCents)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/30 px-4 py-3 ring-1 ring-white/10">
                  <span className="text-white">Total incl. GST</span>
                  <span className="text-2xl font-black text-[#00C2FF]">${formatDollars(report.summary.totalInclTaxCents)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3 text-base">
                  <span className="text-white/70">Orders</span>
                  <span className="font-black text-white">{report.summary.orderCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3 text-base">
                  <span className="text-white/70">Discounts</span>
                  <span className="font-black text-white">${formatDollars(report.summary.discountCentsTotal ?? 0)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl bg-white/5 p-5 shadow-lg ring-1 ring-white/10">
              <h2 className="text-xl font-black text-[#E9F9FF]">Payments & Cash-up</h2>
              <div className="space-y-2 text-lg">
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
                  <span className="text-white/70">Cash (expected)</span>
                  <span className="font-black text-[#FFE561]">${formatDollars(report.summary.payments.cashCents)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
                  <span className="text-white/70">Card</span>
                  <span className="font-black text-[#FFE561]">${formatDollars(report.summary.payments.cardCents)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
                  <span className="text-white/70">Other</span>
                  <span className="font-black text-[#FFE561]">${formatDollars(report.summary.payments.otherCents)}</span>
                </div>
              </div>

              <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <label className="flex flex-col gap-2 text-sm text-white/80">
                  <span className="text-xs uppercase tracking-[0.2em] text-white/60">Counted cash (till)</span>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={countedCash}
                    onChange={(event) => setCountedCash(event.target.value)}
                    className="rounded-xl border border-white/10 bg-[#0B1222] px-3 py-2 text-white outline-none focus:border-[#00C2FF]/60"
                    placeholder="0.00"
                  />
                </label>

                <label className="mt-3 flex flex-col gap-2 text-sm text-white/80">
                  <span className="text-xs uppercase tracking-[0.2em] text-white/60">Notes</span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    className="rounded-xl border border-white/10 bg-[#0B1222] px-3 py-2 text-white outline-none focus:border-[#00C2FF]/60"
                    placeholder="Short $3. Suspect miskeyed fries."
                  />
                </label>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading || !report}
                  className="mt-4 w-full rounded-xl bg-emerald-400 px-4 py-3 text-base font-bold text-black shadow-lg transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Saving...' : 'Save closeout'}
                </button>
              </div>

              <div className="space-y-2 rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                <div className="flex items-center justify-between text-base">
                  <span className="text-white/70">Expected cash</span>
                  <span className="font-black text-white">${formatDollars(expectedCash)}</span>
                </div>
                <div className="flex items-center justify-between text-base">
                  <span className="text-white/70">Counted cash</span>
                  <span className="font-black text-white">
                    {hasCountedCash ? `$${formatDollars(report.summary.countedCashCents)}` : 'Not recorded'}
                  </span>
                </div>
                <div
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-base font-black ${
                    !hasCountedCash
                      ? 'bg-white/10 text-white/70'
                      : difference === 0
                        ? 'bg-emerald-500/20 text-emerald-100'
                        : 'bg-amber-500/20 text-amber-100'
                  }`}
                >
                  <span>Difference</span>
                  <span>
                    {hasCountedCash ? `${differencePositive ? '+' : ''}${formatDollars(difference)}` : 'Not recorded'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!report && !error && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-5 py-10 text-center text-white/70">
            Load a date to view its closeout summary.
          </div>
        )}
      </div>
    </main>
  );
}
