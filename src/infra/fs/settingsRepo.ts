import { PinUser, Settings, KitchenSettings } from '@/domain/models/settings';
import { readJSON, writeJSON } from './jsonStore';

const SETTINGS_FILE = 'settings.json';

export const DEFAULT_SETTINGS: Settings = {
  currency: 'USD',
  taxRatePercent: 0,
  pricesIncludeTax: false,
  kitchenPrepMinutes: 7,
  pins: [],
  kitchen: {
    defaultMinutes: 7,
    categories: [
      { categoryId: 1, minutes: 10 },
      { categoryId: 2, minutes: 8 },
      { categoryId: 3, minutes: 7 },
      { categoryId: 4, minutes: 5 },
    ],
  },
};

function normalizePins(pins?: PinUser[]): PinUser[] {
  if (!Array.isArray(pins)) return [];

  return pins.map((pin) => ({
    name: pin?.name?.trim() ?? '',
    pin: pin?.pin?.trim() ?? '',
    role: pin?.role === 'OWNER' ? 'OWNER' : 'STAFF',
  }));
}

export function validatePins(pins: PinUser[]): string | null {
  if (!Array.isArray(pins)) {
    return 'Invalid payload. Expected an object with a pins array.';
  }

  const seenPins = new Set<string>();
  let hasOwner = false;

  for (const pin of pins) {
    const normalizedPin = pin.pin?.trim() ?? '';
    const normalizedName = pin.name?.trim() ?? '';

    if (!normalizedName) {
      return 'Each pin must include a name.';
    }

    if (!normalizedPin) {
      return 'Each pin must include a PIN.';
    }

    if (!/^\d+$/.test(normalizedPin)) {
      return 'Pins must be numeric.';
    }

    if (normalizedPin.length < 4) {
      return 'Pins must be at least 4 digits long.';
    }

    if (pin.role !== 'OWNER' && pin.role !== 'STAFF') {
      return 'Invalid role provided.';
    }

    if (seenPins.has(normalizedPin)) {
      return 'Pins must be unique.';
    }

    seenPins.add(normalizedPin);
    if (pin.role === 'OWNER') {
      hasOwner = true;
    }
  }

  if (!hasOwner) {
    return 'At least one owner pin is required.';
  }

  return null;
}

function normalizeKitchenSettings(kitchen?: KitchenSettings): KitchenSettings {
  const source = kitchen ?? DEFAULT_SETTINGS.kitchen;

  const defaultMinutes = source?.defaultMinutes && source.defaultMinutes > 0
    ? source.defaultMinutes
    : DEFAULT_SETTINGS.kitchen!.defaultMinutes;

  const categories = Array.isArray(source?.categories)
    ? source.categories
        .map((category) => ({
          categoryId: Number(category.categoryId),
          minutes: typeof category.minutes === 'number' ? category.minutes : defaultMinutes,
        }))
        .filter((category) => !Number.isNaN(category.categoryId) && category.minutes >= 0)
    : [];

  return {
    defaultMinutes,
    categories,
  };
}

export function normalizeSettings(settings: Partial<Settings>): Settings {
  const taxRatePercent = (() => {
    if (typeof settings.taxRatePercent === 'number') return settings.taxRatePercent;
    if (typeof (settings as { taxRate?: number })?.taxRate === 'number') {
      const legacyRate = (settings as { taxRate?: number }).taxRate!;
      return legacyRate > 1 ? legacyRate : legacyRate * 100;
    }
    return DEFAULT_SETTINGS.taxRatePercent;
  })();

  const pricesIncludeTax = (() => {
    if (typeof settings.pricesIncludeTax === 'boolean') return settings.pricesIncludeTax;
    if (typeof (settings as { taxInclusive?: boolean }).taxInclusive === 'boolean') {
      return Boolean((settings as { taxInclusive?: boolean }).taxInclusive);
    }
    return DEFAULT_SETTINGS.pricesIncludeTax;
  })();

  const kitchenPrepMinutes = (() => {
    const minutes = Number(settings.kitchenPrepMinutes ?? DEFAULT_SETTINGS.kitchenPrepMinutes);
    if (Number.isFinite(minutes) && minutes >= 1) {
      return Math.min(minutes, 60);
    }
    return DEFAULT_SETTINGS.kitchenPrepMinutes;
  })();

  const kitchenSource = settings.kitchen ?? DEFAULT_SETTINGS.kitchen;
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    taxRatePercent,
    pricesIncludeTax,
    kitchenPrepMinutes,
    pins: normalizePins(settings.pins),
    kitchen: normalizeKitchenSettings(kitchenSource),
  };
}

export async function loadSettings(): Promise<Settings> {
  const stored = await readJSON<Settings>(SETTINGS_FILE, DEFAULT_SETTINGS);
  return normalizeSettings(stored);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeJSON(SETTINGS_FILE, normalizeSettings(settings));
}
