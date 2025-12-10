import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/infra/fs/jsonStore';
import { PinUser, Settings } from '@/domain/models/settings';
import { getSessionUser } from '@/lib/session';

const SETTINGS_FILE = 'settings.json';

const DEFAULT_SETTINGS: Settings = {
  currency: 'USD',
  taxRate: 0,
  taxInclusive: false,
  pins: [],
};

function normalizeSettings(settings: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    pins: Array.isArray(settings.pins) ? settings.pins : [],
  };
}

function sanitizePins(pins: PinUser[]): PinUser[] {
  return pins.map((pin) => ({
    name: pin.name?.trim() ?? '',
    pin: pin.pin?.trim() ?? '',
    role: pin.role === 'OWNER' ? 'OWNER' : 'STAFF',
  }));
}

function validatePins(pins: PinUser[]): string | null {
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

export const dynamic = 'force-dynamic';

export async function GET() {
  const stored = await readJSON<Settings>(SETTINGS_FILE, DEFAULT_SETTINGS);
  const settings = normalizeSettings(stored);

  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const session = getSessionUser();
  if (!session || session.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = await request.json();

  if (!payload || !Array.isArray(payload.pins)) {
    return NextResponse.json(
      { error: 'Invalid payload. Expected an object with a pins array.' },
      { status: 400 },
    );
  }

  const validationError = validatePins(payload.pins as PinUser[]);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const currentSettings = normalizeSettings(
    await readJSON<Settings>(SETTINGS_FILE, DEFAULT_SETTINGS),
  );

  const pins: PinUser[] = sanitizePins(payload.pins as PinUser[]);
  const updatedSettings: Settings = { ...currentSettings, pins };

  await writeJSON(SETTINGS_FILE, updatedSettings);

  return NextResponse.json({ settings: updatedSettings });
}
