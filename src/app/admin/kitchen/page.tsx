"use client";

import { useEffect, useMemo, useState } from 'react';
import { AdminHeader } from '@/components/AdminHeader';
import type { KitchenSettings, Settings } from '@/domain/models/settings';

const CATEGORY_LABELS: Record<number, string> = {
  1: 'Burgers',
  2: 'Hotdogs',
  3: 'Fries',
  4: 'Slush & Floats',
};

const CATEGORY_ORDER = [1, 2, 3, 4];

const DEFAULT_KITCHEN: KitchenSettings = {
  defaultMinutes: 7,
  categories: [
    { categoryId: 1, minutes: 10 },
    { categoryId: 2, minutes: 8 },
    { categoryId: 3, minutes: 7 },
    { categoryId: 4, minutes: 5 },
  ],
};

export default function KitchenSettingsPage() {
  const [kitchen, setKitchen] = useState<KitchenSettings>(DEFAULT_KITCHEN);
  const [prepMinutes, setPrepMinutes] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/settings', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to load settings');
        const data = await response.json();
        const loadedSettings: Settings | null = data?.settings ?? null;
        setKitchen(loadedSettings?.kitchen ?? DEFAULT_KITCHEN);
        setPrepMinutes(loadedSettings?.kitchenPrepMinutes ?? 7);
      } catch (error) {
        console.error('Failed to load settings', error);
        setStatus({ type: 'error', message: 'Unable to load kitchen settings' });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const kitchenMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const category of kitchen.categories ?? []) {
      const id = Number(category.categoryId);
      if (!Number.isNaN(id)) {
        map.set(id, category.minutes);
      }
    }
    return map;
  }, [kitchen.categories]);

  const updateCategoryMinutes = (categoryId: number, minutes: number) => {
    setKitchen((current) => {
      const remaining = (current.categories ?? []).filter(
        (category) => Number(category.categoryId) !== categoryId,
      );

      return {
        ...current,
        categories: [...remaining, { categoryId, minutes: Math.max(0, minutes) }],
      };
    });
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setStatus(null);
    try {
      const fullCategories = CATEGORY_ORDER.map((categoryId) => ({
        categoryId,
        minutes: kitchenMap.get(categoryId) ?? kitchen.defaultMinutes ?? 0,
      }));

      const payload = {
        kitchen: { ...kitchen, categories: fullCategories },
        kitchenPrepMinutes: Math.min(Math.max(Math.round(prepMinutes) || 1, 1), 60),
      };
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save kitchen settings');
      }

      const data = await response.json();
      const updatedSettings: Settings | null = data?.settings ?? null;
      setKitchen(updatedSettings?.kitchen ?? kitchen);
      setPrepMinutes(updatedSettings?.kitchenPrepMinutes ?? prepMinutes);
      setStatus({ type: 'success', message: 'Kitchen times updated' });
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Unable to save kitchen settings' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B1222] via-[#0e1528] to-[#1E1E1E] text-white">
      <AdminHeader />
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#E9F9FF]/60">Admin</p>
            <h1 className="text-3xl font-black text-[#E9F9FF]">Kitchen Times</h1>
            <p className="text-sm text-white/70">
              Adjust prep times by category. These estimates power the kitchen queue auto-clear.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="rounded-xl bg-[#FFE561] px-5 py-3 text-base font-semibold text-[#0b1222] shadow-lg transition hover:bg-[#ffeb85] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        {status && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              status.type === 'success'
                ? 'border-green-400/30 bg-green-500/10 text-green-100'
                : 'border-red-400/30 bg-red-500/10 text-red-100'
            }`}
          >
            {status.message}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-white/5 shadow-lg ring-1 ring-white/10">
          <div className="grid gap-6 border-b border-white/10 bg-white/5 p-6 sm:grid-cols-2 sm:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#E9F9FF]/60">Global prep time</p>
              <p className="text-lg font-semibold text-white">Kitchen prep time (minutes)</p>
              <p className="text-sm text-white/70">Used for new orders and the kitchen queue countdown.</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={60}
                value={prepMinutes}
                onChange={(event) => setPrepMinutes(Math.max(1, Math.min(60, Number(event.target.value) || 1)))}
                className="w-32 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-lg text-white outline-none ring-0 focus:border-[#00C2FF]/60"
              />
              <span className="text-sm text-white/60">minutes</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-white/60">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Prep time (minutes)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr className="hover:bg-white/5">
                  <td className="px-4 py-4 text-base font-semibold text-white/80">Default (fallback)</td>
                  <td className="px-4 py-4">
                    <input
                      type="number"
                      min={0}
                      value={kitchen.defaultMinutes ?? 0}
                      onChange={(event) =>
                        setKitchen((current) => ({
                          ...current,
                          defaultMinutes: Math.max(0, Number(event.target.value) || 0),
                        }))
                      }
                      className="w-32 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-lg text-white outline-none ring-0 focus:border-[#00C2FF]/60"
                    />
                  </td>
                </tr>
                {CATEGORY_ORDER.map((categoryId) => {
                  const label = CATEGORY_LABELS[categoryId] ?? `Category ${categoryId}`;
                  const minutes = kitchenMap.get(categoryId) ?? kitchen.defaultMinutes ?? 0;
                  return (
                    <tr key={categoryId} className="hover:bg-white/5">
                      <td className="px-4 py-4 text-base font-semibold text-white/80">{label}</td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min={0}
                          value={minutes}
                          onChange={(event) =>
                            updateCategoryMinutes(categoryId, Number(event.target.value) || 0)
                          }
                          className="w-32 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-lg text-white outline-none ring-0 focus:border-[#00C2FF]/60"
                        />
                      </td>
                    </tr>
                  );
                })}
                {loading && (
                  <tr>
                    <td colSpan={2} className="px-4 py-4 text-center text-white/70">
                      Loading kitchen settings…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
