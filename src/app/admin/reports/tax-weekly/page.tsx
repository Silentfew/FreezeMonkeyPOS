"use client";

import { useMemo, useState } from 'react';
import type { TaxSummary } from '@/domain/orders/taxSummary';
import { AdminNav } from '@/components/AdminNav';

interface ReportResponse {
  range: { startDate: string; endDate: string };
  summary: TaxSummary;
}

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getMonday(date: Date): string {
  const result = new Date(date);
  const day = result.getDay();
  const diff = (day + 6) % 7;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return formatDateInput(result);
}

function addDays(dateString: string, days: number): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + days);
  return formatDateInput(date);
}

function formatDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default function WeeklyTaxReportPage() {
  const [weekStart, setWeekStart] = useState<string>(() => getMonday(new Date()));
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const setThisWeek = () => setWeekStart(getMonday(new Date()));
  const setLastWeek = () => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    setWeekStart(getMonday(lastWeek));
  };

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!weekStart) {
        throw new Error('Please choose a week start date.');
      }
      const weekEndDate = addDays(weekStart, 6);
      if (!weekEndDate) {
        throw new Error('Invalid week range.');
      }
      const response = await fetch(`/api/reports/tax-weekly?startDate=${weekStart}&endDate=${weekEndDate}`);
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
      'startDate,endDate,orderCount,taxable,tax,gross,cash,card,other',
      `${weekStart},${weekEnd},${summary.orderCount},${formatDollars(summary.totalTaxableCents)},${formatDollars(summary.totalTaxCents)},${formatDollars(summary.totalGrossCents)},${formatDollars(summary.byPaymentType.CASH)},${formatDollars(summary.byPaymentType.CARD)},${formatDollars(summary.byPaymentType.OTHER)}`,
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `weekly-tax-${weekStart}-to-${weekEnd}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B1222] via-[#0e1528] to-[#1E1E1E] text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#E9F9FF]/60">Admin · Reports</p>
            <h1 className="text-3xl font-black text-[#E9F9FF]">Weekly Tax Report</h1>
            <p className="text-sm text-white/70">Review GST totals for any seven-day window.</p>
          </div>
          <AdminNav />
        </div>

        <div className="rounded-2xl bg-white/5 p-5 shadow-lg ring-1 ring-white/10">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex flex-col text-sm text-white/80">
              <span className="text-xs uppercase tracking-[0.2em] text-white/60">Week starting</span>
              <input
                type="date"
                value={weekStart}
                onChange={(event) => setWeekStart(event.target.value)}
                className="rounded-xl border border-white/10 bg-[#0B1222] px-3 py-2 text-white outline-none focus:border-[#00C2FF]/60"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={setThisWeek}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                This week
              </button>
              <button
                type="button"
                onClick={setLastWeek}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Last week
              </button>
              <button
                type="button"
                onClick={loadReport}
                disabled={loading}
                className="rounded-full bg-[#00C2FF] px-4 py-2 text-sm font-semibold text-[#0b1222] shadow-lg ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-[#4dd9ff] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Loading…' : 'Load report'}
              </button>
              {report && (
                <button
                  type="button"
                  onClick={exportCsv}
                  className="rounded-full bg-[#FFE561] px-4 py-2 text-sm font-semibold text-[#0b1222] shadow-lg ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-[#ffeb85]"
                >
                  Export CSV
                </button>
              )}
            </div>
          </div>
          <p className="mt-3 text-sm text-white/70">Week of {weekStart} to {weekEnd}</p>
          {error && (
            <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}
        </div>

        {report && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-2xl bg-white/5 p-5 shadow-lg ring-1 ring-white/10">
              <h2 className="text-xl font-black text-[#E9F9FF]">Totals</h2>
              <div className="space-y-2 text-lg">
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
                  <span className="text-white/70">Taxable sales</span>
                  <span className="font-black text-[#FFE561]">${formatDollars(report.summary.totalTaxableCents)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
                  <span className="text-white/70">Earthrealm Tax (GST)</span>
                  <span className="font-black text-[#FFE561]">${formatDollars(report.summary.totalTaxCents)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/30 px-4 py-3 ring-1 ring-white/10">
                  <span className="text-white">Total incl. tax</span>
                  <span className="text-2xl font-black text-[#00C2FF]">${formatDollars(report.summary.totalGrossCents)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3 text-base">
                  <span className="text-white/70">Orders</span>
                  <span className="font-black text-white">{report.summary.orderCount}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl bg-white/5 p-5 shadow-lg ring-1 ring-white/10">
              <h2 className="text-xl font-black text-[#E9F9FF]">Payments</h2>
              <div className="space-y-2 text-lg">
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
                  <span className="text-white/70">Cash</span>
                  <span className="font-black text-[#FFE561]">${formatDollars(report.summary.byPaymentType.CASH)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
                  <span className="text-white/70">Card</span>
                  <span className="font-black text-[#FFE561]">${formatDollars(report.summary.byPaymentType.CARD)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-black/20 px-4 py-3">
                  <span className="text-white/70">Other</span>
                  <span className="font-black text-[#FFE561]">${formatDollars(report.summary.byPaymentType.OTHER)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {!report && !error && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-5 py-10 text-center text-white/70">
            Load a week to view its tax summary.
          </div>
        )}
      </div>
    </main>
  );
}
