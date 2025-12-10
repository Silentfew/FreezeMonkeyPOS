import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readProducts } from "@/lib/products-store";
import { readCategories } from "@/lib/categories-store";
import { readModifiers } from "@/lib/modifier_manager";
import { parseSessionCookie, SESSION_COOKIE } from "@/lib/session";

function isAuthenticated(): boolean {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  const session = parseSessionCookie(raw);
  return Boolean(session?.role);
}

export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [products, categories, modifiers] = await Promise.all([
      readProducts(),
      readCategories(),
      readModifiers(),
    ]);
    return NextResponse.json({ products, categories, modifiers });
  } catch (error) {
    console.error("Failed to load catalog", error);
    return NextResponse.json({ error: "Failed to load catalog" }, { status: 500 });
  }
}
