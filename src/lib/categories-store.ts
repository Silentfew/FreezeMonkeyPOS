import { promises as fs } from "fs";
import path from "path";

export type Category = {
  id: number;
  name: string;
  /** Optional hexadecimal color for quick visual grouping on the POS grid. */
  swatch?: string;
  active: boolean;
  sortOrder: number;
};

const DATA_FILE = path.join(process.cwd(), "data", "categories.json");

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

export async function readCategories(): Promise<Category[]> {
  const raw = await readFile();
  const parsed = JSON.parse(raw) as Partial<Category>[];
  return parsed.map((category, index) => ({
    id: typeof category.id === "number" ? category.id : index + 1,
    name: category.name?.trim() ?? "Unnamed Category",
    swatch: category.swatch ?? undefined,
    active: typeof category.active === "boolean" ? category.active : true,
    sortOrder: Number.isFinite(category.sortOrder) ? Number(category.sortOrder) : index,
  }));
}

async function writeCategories(categories: Category[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(categories, null, 2), "utf-8");
}

export async function addCategory(category: Omit<Category, "id">): Promise<Category> {
  const categories = await readCategories();
  const nextId = categories.length > 0 ? Math.max(...categories.map((item) => item.id)) + 1 : 1;
  const record: Category = {
    ...category,
    id: nextId,
  };
  categories.push(record);
  await writeCategories(categories);
  return record;
}

export async function updateCategory(id: number, updates: Partial<Omit<Category, "id">>): Promise<Category | null> {
  const categories = await readCategories();
  const index = categories.findIndex((category) => category.id === id);
  if (index === -1) {
    return null;
  }

  const current = categories[index];
  const updated: Category = {
    ...current,
    ...updates,
  };
  categories[index] = updated;
  await writeCategories(categories);
  return updated;
}

export async function deleteCategory(id: number): Promise<boolean> {
  const categories = await readCategories();
  const filtered = categories.filter((category) => category.id !== id);
  if (filtered.length === categories.length) {
    return false;
  }
  await writeCategories(filtered);
  return true;
}
