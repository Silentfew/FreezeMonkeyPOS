import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { addProduct, readProducts } from "@/lib/products-store";

function isAuthenticated(): boolean {
  return Boolean(cookies().get("pos_session")?.value);
}

export async function GET() {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const products = await readProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error("Failed to load products", error);
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    let categoryId: number | null = null;
    if (body.categoryId !== undefined && body.categoryId !== null && body.categoryId !== "") {
      const parsedCategory = Number(body.categoryId);
      categoryId = Number.isNaN(parsedCategory) ? null : parsedCategory;
    }
    const modifierIds: number[] = Array.isArray(body.modifierIds)
      ? body.modifierIds
          .map((id: unknown) => Number(id))
          .filter((id) => Number.isFinite(id) && !Number.isNaN(id))
      : [];
    const price = Number.parseFloat(body.price);
    const inStock = Number.parseInt(body.inStock, 10);
    const active = !(body.active === false || body.active === "false" || body.active === 0);

    if (!name || Number.isNaN(price) || Number.isNaN(inStock)) {
      return NextResponse.json({ error: "Invalid product data" }, { status: 400 });
    }

    const newProduct = await addProduct({
      name,
      description,
      price,
      inStock,
      categoryId,
      modifierIds,
      active,
    });

    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error("Failed to add product", error);
    return NextResponse.json({ error: "Failed to add product" }, { status: 500 });
  }
}
