import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

const SESSION_COOKIE = "pos_session";
const DEFAULT_PIN = "1234";

export async function POST(request: Request) {
  const { pin } = await request.json();
  const expectedPin = process.env.POS_LOGIN_PIN ?? DEFAULT_PIN;

  if (typeof pin !== "string" || pin.trim() !== expectedPin) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: randomUUID(),
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
    path: "/",
    maxAge: 0,
  });
  return response;
}
