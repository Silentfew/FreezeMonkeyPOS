import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addModifier, readModifiers } from "@/lib/modifier_manager";

function isAuthenticated(): boolean {
  return Boolean(cookies().get("pos_session")?.value);
}

export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const modifiers = await readModifiers();
    return NextResponse.json(modifiers);
  } catch (error) {
    console.error("Failed to load modifiers", error);
    return NextResponse.json({ error: "Failed to load modifiers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "General";
    const price = Number.parseFloat(body.price);
    const type = body.type === "remove" ? "remove" : "add";
    const active = !(body.active === false || body.active === "false" || body.active === 0);

    if (!name || Number.isNaN(price)) {
      return NextResponse.json({ error: "Invalid modifier data" }, { status: 400 });
    }

    const created = await addModifier({ name, category, price, type, active });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to add modifier", error);
    return NextResponse.json({ error: "Failed to add modifier" }, { status: 500 });
  }
}
