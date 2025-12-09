'use client';

import { useState } from 'react';
import { AdminNav } from '@/components/AdminNav';

type CloseoutSummary = {
  orderCount: number;
  taxableCents: number;
  taxCents: number;
  grossCents: number;
  cashCents: number;
  cardCents: number;
  otherCents: number;
  discountCentsTotal: number;
};

type ReportResponse = {
  date: string;
  summary: CloseoutSummary;
};

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default function DailyCloseoutReportPage() {
  const [date, setDate] = useState<string>(() => formatDateInput(new Date()));
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load report';
      setError(message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!report) return;
    const { summary } = report;
    const csv = [
      'date,orderCount,taxable,tax,gross,cash,card,other,discounts',
      `${report.date},${summary.orderCount},${formatDollars(summary.taxableCents)},${formatDollars(summary.taxCents)},${formatDollars(summary.grossCents)},${formatDollars(summary.cashCents)},${formatDollars(summary.cardCents)},${formatDollars(summary.otherCents)},${formatDollars(summary.discountCentsTotal)}`,
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `daily-closeout-${report.date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B1222] via-[#0e1528] to-[#1E1E1E] text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#E9F9FF]/60">Admin · Reports</p>
            <h1 className="text-3xl font-black text-[#E9F9FF]">Daily Closeout</h1>
            <p className="text-sm text-white/70">Review payments, tax, and discounts for a single day.</p>
          </div>
          <AdminNav />
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

        {report && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-2xl bg-white/5 p-5 shadow-lg ring-1 ring-white/10">
              <h2 className="text-xl font-black text-[#E9F9FF]">Totals</h2>
              <div className="space-y-2 text-lg">
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
                  <span className="text-white/70">Taxable (ex GST)</span>
                  <span className="font-black text-[#FFE561]">${formatDollars(report.summary.taxableCents)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
                  <span className="text-white/70">GST</span>
                  <span className="font-black text-[#FFE561]">${formatDollars(report.summary.taxCents)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/30 px-4 py-3 ring-1 ring-white/10">
                  <span className="text-white">Total incl. GST</span>
                  <span className="text-2xl font-black text-[#00C2FF]">${formatDollars(report.summary.grossCents)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3 text-base">
                  <span className="text-white/70">Orders</span>
                  <span className="font-black text-white">{report.summary.orderCount}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3 text-base">
                  <span className="text-white/70">Discounts</span>
                  <span className="font-black text-white">${formatDollars(report.summary.discountCentsTotal)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl bg-white/5 p-5 shadow-lg ring-1 ring-white/10">
              <h2 className="text-xl font-black text-[#E9F9FF]">Payments</h2>
              <div className="space-y-2 text-lg">
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
                  <span className="text-white/70">Cash</span>
                  <span className="font-black text-[#FFE561]">${formatDollars(report.summary.cashCents)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
                  <span className="text-white/70">Card</span>
                  <span className="font-black text-[#FFE561]">${formatDollars(report.summary.cardCents)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
                  <span className="text-white/70">Other</span>
                  <span className="font-black text-[#FFE561]">${formatDollars(report.summary.otherCents)}</span>
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
