import { NextResponse } from 'next/server';
import { readJSON, writeJSON } from '@/infra/fs/jsonStore';
import { PinUser, Settings } from '@/domain/models/settings';

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

export const dynamic = 'force-dynamic';

export async function GET() {
  const stored = await readJSON<Settings>(SETTINGS_FILE, DEFAULT_SETTINGS);
  const settings = normalizeSettings(stored);

  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const payload = await request.json();

  if (!payload || !Array.isArray(payload.pins)) {
    return NextResponse.json(
      { error: 'Invalid payload. Expected an object with a pins array.' },
      { status: 400 },
    );
  }

  const currentSettings = normalizeSettings(
    await readJSON<Settings>(SETTINGS_FILE, DEFAULT_SETTINGS),
  );

  const pins: PinUser[] = payload.pins;
  const updatedSettings: Settings = { ...currentSettings, pins };

  await writeJSON(SETTINGS_FILE, updatedSettings);

  return NextResponse.json({ settings: updatedSettings });
}
