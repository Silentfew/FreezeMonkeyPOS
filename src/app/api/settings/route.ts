import { NextResponse } from 'next/server';
import { PinUser } from '@/domain/models/settings';
import { getSessionUser } from '@/lib/session';
import { loadSettings, normalizeSettings, saveSettings, validatePins } from '@/infra/fs/settingsRepo';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = await loadSettings();

  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const session = getSessionUser();
  if (!session || session.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = await request.json();
  const currentSettings = await loadSettings();

  let updatedSettings: Partial<typeof currentSettings> = currentSettings;

  if (Array.isArray(payload?.pins)) {
    const pinsPayload = payload.pins as PinUser[];
    const validationError = validatePins(pinsPayload);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    updatedSettings = {
      ...updatedSettings,
      pins: normalizeSettings({ pins: pinsPayload }).pins,
    };
  }

  if (payload?.kitchen) {
    updatedSettings = normalizeSettings({ ...updatedSettings, kitchen: payload.kitchen });
  }

  if (typeof payload?.kitchenPrepMinutes === 'number') {
    updatedSettings = normalizeSettings({ ...updatedSettings, kitchenPrepMinutes: payload.kitchenPrepMinutes });
  }

  const mergedSettings = normalizeSettings({ ...currentSettings, ...updatedSettings });
  await saveSettings(mergedSettings);

  return NextResponse.json({ settings: mergedSettings });
}
