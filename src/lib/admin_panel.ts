import {
  addProduct,
  deleteProduct,
  Product,
  readProducts,
  updateProduct,
} from "./products-store";
import {
  addCategory,
  Category,
  deleteCategory,
  readCategories,
  updateCategory,
} from "./categories-store";
import {
  addModifier,
  deleteModifier,
  Modifier,
  readModifiers,
  updateModifier,
} from "./modifier_manager";

export type AdminCatalogSnapshot = {
  products: Product[];
  categories: Category[];
  modifiers: Modifier[];
};

export async function loadAdminCatalog(): Promise<AdminCatalogSnapshot> {
  const [products, categories, modifiers] = await Promise.all([
    readProducts(),
    readCategories(),
    readModifiers(),
  ]);
  return { products, categories, modifiers };
}

export async function createProduct(payload: Omit<Product, "id">): Promise<Product> {
  return addProduct(payload);
}

export async function editProduct(id: number, updates: Partial<Omit<Product, "id">>) {
  return updateProduct(id, updates);
}

export async function removeProduct(id: number) {
  return deleteProduct(id);
}

export async function createCategory(payload: Omit<Category, "id">): Promise<Category> {
  return addCategory(payload);
}

export async function editCategory(id: number, updates: Partial<Omit<Category, "id">>) {
  return updateCategory(id, updates);
}

export async function removeCategory(id: number) {
  return deleteCategory(id);
}

export async function createModifier(payload: Omit<Modifier, "id">): Promise<Modifier> {
  return addModifier(payload);
}

export async function editModifier(id: number, updates: Partial<Omit<Modifier, "id">>) {
  return updateModifier(id, updates);
}

export async function removeModifier(id: number) {
  return deleteModifier(id);
}
