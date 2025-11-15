import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteModifier, updateModifier } from "@/lib/modifier_manager";

function isAuthenticated(): boolean {
  return Boolean(cookies().get("pos_session")?.value);
}

export async function PUT(request: Request, { params }: { params: { modifierId: string } }) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number.parseInt(params.modifierId, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid modifier id" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updates: Partial<{ name: string; category: string; price: number; type: "add" | "remove"; active: boolean }> = {};

    if (typeof body.name === "string") {
      updates.name = body.name.trim();
    }
    if (typeof body.category === "string") {
      updates.category = body.category.trim();
    }
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isNaN(price)) {
        updates.price = price;
      }
    }
    if (body.type !== undefined) {
      updates.type = body.type === "remove" ? "remove" : "add";
    }
    if (body.active !== undefined) {
      updates.active = !(body.active === false || body.active === "false" || body.active === 0);
    }

    const updated = await updateModifier(id, updates);
    if (!updated) {
      return NextResponse.json({ error: "Modifier not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update modifier", error);
    return NextResponse.json({ error: "Failed to update modifier" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { modifierId: string } }) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number.parseInt(params.modifierId, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid modifier id" }, { status: 400 });
  }

  try {
    const removed = await deleteModifier(id);
    if (!removed) {
      return NextResponse.json({ error: "Modifier not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete modifier", error);
    return NextResponse.json({ error: "Failed to delete modifier" }, { status: 500 });
  }
}
