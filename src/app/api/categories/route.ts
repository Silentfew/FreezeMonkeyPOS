import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addCategory, readCategories } from "@/lib/categories-store";

function isAuthenticated(): boolean {
  return Boolean(cookies().get("pos_session")?.value);
}

export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const categories = await readCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Failed to load categories", error);
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const swatch = typeof body.swatch === "string" ? body.swatch.trim() : undefined;
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
    const active = !(body.active === false || body.active === "false" || body.active === 0);

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const created = await addCategory({ name, swatch, sortOrder, active });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Failed to add category", error);
    return NextResponse.json({ error: "Failed to add category" }, { status: 500 });
  }
}
