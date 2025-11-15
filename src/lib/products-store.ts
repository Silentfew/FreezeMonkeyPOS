import { promises as fs } from "fs";
import path from "path";

export type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  inStock: number;
  /**
   * Identifier of the category the product belongs to. When null the product is
   * considered uncategorised but still selectable from the POS screen.
   */
  categoryId: number | null;
  /**
   * Modifier identifiers that are available for the product. The modifier
   * entities are managed by the modifier_manager module.
   */
  modifierIds: number[];
  /** Flag that allows hiding the product from the POS without deleting it. */
  active: boolean;
};

const DATA_FILE = path.join(process.cwd(), "data", "products.json");

async function readFileContents(): Promise<string> {
  try {
    return await fs.readFile(DATA_FILE, "utf-8");
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
      await fs.writeFile(DATA_FILE, "[]", "utf-8");
      return "[]";
    }
    throw error;
  }
}

export async function readProducts(): Promise<Product[]> {
  const raw = await readFileContents();
  const parsed = JSON.parse(raw) as Partial<Product>[];
  return parsed.map((product, index) => ({
    id: typeof product.id === "number" ? product.id : index + 1,
    name: product.name ?? "Unnamed Product",
    description: product.description ?? "",
    price: Number(product.price ?? 0),
    inStock: Number(product.inStock ?? 0),
    categoryId: product.categoryId ?? null,
    modifierIds: Array.isArray(product.modifierIds)
      ? Array.from(
          new Set(
            product.modifierIds
              .map((value) => Number(value))
              .filter((value) => Number.isFinite(value) && !Number.isNaN(value)),
          ),
        )
      : [],
    active: typeof product.active === "boolean" ? product.active : true,
  }));
}

async function writeProducts(products: Product[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(products, null, 2), "utf-8");
}

export async function addProduct(product: Omit<Product, "id">): Promise<Product> {
  const products = await readProducts();
  const nextId = products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
  const productToStore: Product = {
    ...product,
    id: nextId,
    price: Number(product.price.toFixed(2)),
    inStock: Number(product.inStock),
    categoryId: product.categoryId ?? null,
    modifierIds: Array.from(
      new Set(product.modifierIds.map((value) => Number(value)).filter((value) => Number.isFinite(value))),
    ),
    active: product.active,
  };
  products.push(productToStore);
  await writeProducts(products);
  return productToStore;
}

export async function updateProduct(
  id: number,
  updates: Partial<Omit<Product, "id">>,
): Promise<Product | null> {
  const products = await readProducts();
  const index = products.findIndex((product) => product.id === id);
  if (index === -1) {
    return null;
  }

  const current = products[index];
  const updated: Product = {
    ...current,
    ...updates,
  };
  if (updates.price !== undefined) {
    updated.price = Number(updates.price.toFixed(2));
  }
  if (updates.inStock !== undefined) {
    updated.inStock = Number(updates.inStock);
  }
  if (updates.categoryId !== undefined) {
    updated.categoryId = updates.categoryId ?? null;
  }
  if (updates.modifierIds !== undefined) {
    updated.modifierIds = Array.from(
      new Set(updates.modifierIds.map((value) => Number(value)).filter((value) => Number.isFinite(value))),
    );
  }
  if (updates.active !== undefined) {
    updated.active = updates.active;
  }

  products[index] = updated;
  await writeProducts(products);
  return updated;
}

export async function deleteProduct(id: number): Promise<boolean> {
  const products = await readProducts();
  const filtered = products.filter((product) => product.id !== id);
  if (filtered.length === products.length) {
    return false;
  }
  await writeProducts(filtered);
  return true;
}
