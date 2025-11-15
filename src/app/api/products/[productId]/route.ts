import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteProduct, updateProduct } from "@/lib/products-store";

function isAuthenticated(): boolean {
  return Boolean(cookies().get("pos_session")?.value);
}

export async function PUT(
  request: Request,
  { params }: { params: { productId: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number.parseInt(params.productId, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updates: Partial<{
      name: string;
      description: string;
      price: number;
      inStock: number;
      categoryId: number | null;
      modifierIds: number[];
      active: boolean;
    }> = {};

    if (typeof body.name === "string") {
      updates.name = body.name.trim();
    }
    if (typeof body.description === "string") {
      updates.description = body.description.trim();
    }
    if (body.price !== undefined) {
      const priceValue = Number.parseFloat(body.price);
      if (!Number.isNaN(priceValue)) {
        updates.price = priceValue;
      }
    }
    if (body.inStock !== undefined) {
      const stockValue = Number.parseInt(body.inStock, 10);
      if (!Number.isNaN(stockValue)) {
        updates.inStock = stockValue;
      }
    }
    if (body.categoryId !== undefined) {
      if (body.categoryId === null || body.categoryId === "") {
        updates.categoryId = null;
      } else {
        const parsedCategory = Number(body.categoryId);
        updates.categoryId = Number.isNaN(parsedCategory) ? null : parsedCategory;
      }
    }
    if (body.modifierIds !== undefined) {
      const modifierIds: number[] = Array.isArray(body.modifierIds)
        ? body.modifierIds
            .map((value: unknown) => Number(value))
            .filter((value) => Number.isFinite(value) && !Number.isNaN(value))
        : [];
      updates.modifierIds = modifierIds;
    }
    if (body.active !== undefined) {
      updates.active = !(body.active === false || body.active === "false" || body.active === 0);
    }

    const updated = await updateProduct(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update product", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { productId: string } }
) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number.parseInt(params.productId, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  try {
    const removed = await deleteProduct(id);
    if (!removed) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete product", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
