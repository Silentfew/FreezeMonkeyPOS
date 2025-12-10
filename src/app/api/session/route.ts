import { NextResponse } from "next/server";
import { readJSON } from "@/infra/fs/jsonStore";
import { PinUser, Settings } from "@/domain/models/settings";
import { SESSION_COOKIE, SessionUser } from "@/lib/session";

const DEFAULT_PIN = "1234";
const SETTINGS_FILE = "settings.json";

const DEFAULT_SETTINGS: Settings = {
  currency: "USD",
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

function toSessionUser(pinUser: PinUser): SessionUser {
  return { name: pinUser.name, role: pinUser.role };
}

export async function POST(request: Request) {
  const payload = await request.json();
  const providedPin = typeof payload?.pin === "string" ? payload.pin.trim() : "";

  if (!providedPin) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  const storedSettings = await readJSON<Settings>(SETTINGS_FILE, DEFAULT_SETTINGS);
  const settings = normalizeSettings(storedSettings);

  const matchedUser = settings.pins.find((user) => user.pin === providedPin);

  const sessionUser: SessionUser | null = matchedUser
    ? toSessionUser(matchedUser)
    : providedPin === (process.env.POS_LOGIN_PIN ?? DEFAULT_PIN)
      ? { name: "Owner", role: "OWNER" }
      : null;

  if (!sessionUser) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, user: sessionUser });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: JSON.stringify(sessionUser),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
  return response;
}
