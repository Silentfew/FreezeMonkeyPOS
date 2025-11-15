import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteCategory, updateCategory } from "@/lib/categories-store";

function isAuthenticated(): boolean {
  return Boolean(cookies().get("pos_session")?.value);
}

export async function PUT(request: Request, { params }: { params: { categoryId: string } }) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number.parseInt(params.categoryId, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updates: Partial<{ name: string; swatch?: string; sortOrder: number; active: boolean }> = {};

    if (typeof body.name === "string") {
      updates.name = body.name.trim();
    }
    if (typeof body.swatch === "string") {
      updates.swatch = body.swatch.trim();
    }
    if (body.sortOrder !== undefined) {
      const order = Number(body.sortOrder);
      if (!Number.isNaN(order)) {
        updates.sortOrder = order;
      }
    }
    if (body.active !== undefined) {
      updates.active = !(body.active === false || body.active === "false" || body.active === 0);
    }

    const updated = await updateCategory(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update category", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { categoryId: string } }) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number.parseInt(params.categoryId, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid category id" }, { status: 400 });
  }

  try {
    const removed = await deleteCategory(id);
    if (!removed) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete category", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
