'use client';

import { useEffect, useState } from 'react';
import { PinUser } from '@/domain/models/settings';
import { AdminHeader } from '@/components/AdminHeader';

type PinUserWithKey = PinUser & { _key: string };

function withStableKey(pin: PinUser): PinUserWithKey {
  const randomId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36);
  return { ...pin, _key: randomId };
}

function createEmptyPin(): PinUserWithKey {
  return withStableKey({ name: '', pin: '', role: 'STAFF' });
}

export default function StaffAdminPage() {
  const [pins, setPins] = useState<PinUserWithKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadPins = async (resetStatus = true) => {
    if (resetStatus) {
      setStatus(null);
    }
    setLoading(true);
    try {
      const response = await fetch('/api/settings', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }
      const data = await response.json();
      const loadedPins: PinUser[] = Array.isArray(data?.settings?.pins) ? data.settings.pins : [];
      setPins(loadedPins.map((pin) => withStableKey(pin)));
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Unable to load staff pins' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPins();
  }, []);

  const updatePin = (index: number, field: keyof PinUser, value: string) => {
    setPins((current) =>
      current.map((pin, i) => (i === index ? { ...pin, [field]: value } : pin)),
    );
  };

  const handlePinChange = (index: number, value: string) => {
    const numericPin = value.replace(/\D/g, "");
    updatePin(index, "pin", numericPin);
  };

  const addPin = () => {
    setPins((current) => [...current, createEmptyPin()]);
  };

  const removePin = (index: number) => {
    setPins((current) => current.filter((_, i) => i !== index));
  };

  const savePins = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const seenPins = new Set<string>();
      let hasOwner = false;

      const payloadPins = pins.map(({ _key, ...rest }) => rest);

      for (const pin of payloadPins) {
        const trimmedPin = pin.pin.trim();
        const trimmedName = pin.name.trim();
        if (!trimmedName || !trimmedPin) {
          throw new Error("Each staff member requires a name and PIN.");
        }
        if (!/^\d+$/.test(trimmedPin)) {
          throw new Error("Pins must be numeric.");
        }
        if (trimmedPin.length < 4) {
          throw new Error("Pins must be at least 4 digits.");
        }
        if (seenPins.has(trimmedPin)) {
          throw new Error("Pins must be unique.");
        }
        if (pin.role === "OWNER") {
          hasOwner = true;
        }
        seenPins.add(trimmedPin);
      }

      if (!hasOwner) {
        throw new Error("At least one owner pin is required.");
      }

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pins: payloadPins }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save staff');
      }
      setStatus({ type: 'success', message: 'Staff updated successfully' });
      loadPins(false);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Failed to save staff';
      setStatus({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B1222] via-[#0e1528] to-[#1E1E1E] text-white">
      <AdminHeader />
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#E9F9FF]/60">Admin</p>
            <h1 className="text-3xl font-black text-[#E9F9FF]">Manage Staff Pins</h1>
            <p className="text-sm text-white/70">Add, edit, or remove staff access pins.</p>
            <p className="text-xs text-amber-100/80">Only owners can change pins. Owner role rows represent admin access.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 justify-end">
            <button
              type="button"
              onClick={addPin}
              className="rounded-xl bg-[#00C2FF] px-4 py-2 text-sm font-semibold text-[#0b1222] shadow-lg hover:bg-[#4dd9ff]"
            >
              + Add staff
            </button>
            <button
              type="button"
              onClick={savePins}
              disabled={saving}
              className="rounded-xl bg-[#FFE561] px-4 py-2 text-sm font-semibold text-[#0b1222] shadow-lg hover:bg-[#ffeb85] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-white/60">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">PIN</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-white/70">
                      Loading staff...
                    </td>
                  </tr>
                ) : pins.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-white/70">
                      No staff pins yet. Add a team member to begin.
                    </td>
                  </tr>
                ) : (
                  pins.map((pin, index) => (
                    <tr key={pin._key || pin.pin || index} className="hover:bg-white/5">
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={pin.name}
                          onChange={(event) => updatePin(index, 'name', event.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#00C2FF]/60"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={pin.pin}
                          onChange={(event) => handlePinChange(index, event.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#00C2FF]/60"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={pin.role}
                          onChange={(event) => updatePin(index, 'role', event.target.value as PinUser['role'])}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#00C2FF]/60"
                        >
                          <option value="OWNER">Owner</option>
                          <option value="STAFF">Staff</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => removePin(index)}
                          className="rounded-lg border border-red-400/40 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
