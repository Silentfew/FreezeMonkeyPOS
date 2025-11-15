import { promises as fs } from "fs";
import path from "path";

export type ModifierType = "add" | "remove";

export type Modifier = {
  id: number;
  name: string;
  price: number;
  category: string;
  type: ModifierType;
  active: boolean;
};

const DATA_FILE = path.join(process.cwd(), "data", "modifiers.json");

async function ensureFile(): Promise<void> {
  try {
    await fs.access(DATA_FILE);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
      await fs.writeFile(DATA_FILE, "[]", "utf-8");
      return;
    }
    throw error;
  }
}

async function readFile(): Promise<string> {
  await ensureFile();
  return fs.readFile(DATA_FILE, "utf-8");
}

export async function readModifiers(): Promise<Modifier[]> {
  const raw = await readFile();
  const parsed = JSON.parse(raw) as Partial<Modifier>[];
  return parsed.map((modifier, index) => ({
    id: typeof modifier.id === "number" ? modifier.id : index + 1,
    name: modifier.name?.trim() ?? "Unnamed Modifier",
    price: Number(Number(modifier.price ?? 0).toFixed(2)),
    category: modifier.category?.trim() ?? "General",
    type: modifier.type === "remove" ? "remove" : "add",
    active: typeof modifier.active === "boolean" ? modifier.active : true,
  }));
}

async function writeModifiers(modifiers: Modifier[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(modifiers, null, 2), "utf-8");
}

export async function addModifier(modifier: Omit<Modifier, "id">): Promise<Modifier> {
  const modifiers = await readModifiers();
  const nextId = modifiers.length > 0 ? Math.max(...modifiers.map((item) => item.id)) + 1 : 1;
  const record: Modifier = {
    ...modifier,
    id: nextId,
    price: Number(modifier.price.toFixed(2)),
  };
  modifiers.push(record);
  await writeModifiers(modifiers);
  return record;
}

export async function updateModifier(
  id: number,
  updates: Partial<Omit<Modifier, "id">>,
): Promise<Modifier | null> {
  const modifiers = await readModifiers();
  const index = modifiers.findIndex((modifier) => modifier.id === id);
  if (index === -1) {
    return null;
  }

  const current = modifiers[index];
  const updated: Modifier = {
    ...current,
    ...updates,
  };
  if (updates.price !== undefined) {
    updated.price = Number(updates.price.toFixed(2));
  }
  if (updates.type !== undefined) {
    updated.type = updates.type === "remove" ? "remove" : "add";
  }

  modifiers[index] = updated;
  await writeModifiers(modifiers);
  return updated;
}

export async function deleteModifier(id: number): Promise<boolean> {
  const modifiers = await readModifiers();
  const filtered = modifiers.filter((modifier) => modifier.id !== id);
  if (filtered.length === modifiers.length) {
    return false;
  }
  await writeModifiers(filtered);
  return true;
}

/**
 * Computes the price delta for a modifier based on the selected mode.
 */
export function calculateModifierDelta(
  modifier: Modifier,
  mode: "added" | "removed" | "light" | "default",
): number {
  if (mode === "default") {
    return 0;
  }

  const rounded = Number(modifier.price.toFixed(2));
  if (mode === "light") {
    return modifier.type === "remove" ? -rounded / 2 : rounded / 2;
  }

  return modifier.type === "remove" ? -rounded : rounded;
}
