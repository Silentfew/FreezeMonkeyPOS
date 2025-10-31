import { promises as fs } from "fs";
import path from "path";

export type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  inStock: number;
  category: string;
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
  const parsed = JSON.parse(raw) as Product[];
  return parsed.map((product) => ({
    ...product,
    price: Number(product.price),
    inStock: Number(product.inStock),
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
