import { PinUser, Settings, KitchenSettings } from '@/domain/models/settings';
import { readJSON, writeJSON } from './jsonStore';

const SETTINGS_FILE = 'settings.json';

export const DEFAULT_SETTINGS: Settings = {
  currency: 'USD',
  taxRate: 0,
  taxInclusive: false,
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
  const kitchenSource = settings.kitchen ?? DEFAULT_SETTINGS.kitchen;
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
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
