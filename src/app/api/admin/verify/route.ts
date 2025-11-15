import { NextResponse } from "next/server";

const DEFAULT_ADMIN_PIN = "9999";

export async function POST(request: Request) {
  const { pin } = await request.json();
  const expected = process.env.POS_ADMIN_PIN ?? DEFAULT_ADMIN_PIN;

  if (typeof pin !== "string" || pin.trim() !== expected) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  return NextResponse.json({ success: true });
}
