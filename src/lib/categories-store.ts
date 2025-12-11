export interface Category {
  id: string;
  name: string;
  order: number;
}

export const CATEGORIES_FILE = 'categories.json';

export async function readCategories(): Promise<Category[]> {
  const { readJSON } = await import('@/infra/fs/jsonStore');
  const categories = await readJSON<Category[]>(CATEGORIES_FILE, []);
  return Array.isArray(categories)
    ? [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [];
}

export async function fetchCategories(): Promise<Category[]> {
  const response = await fetch('/api/categories', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to load categories');
  }
  const data = await response.json();
  const categories: Category[] = Array.isArray(data?.categories)
    ? data.categories
    : [];
  return categories;
}

export async function saveCategories(categories: Category[]): Promise<void> {
  const { writeJSON } = await import('@/infra/fs/jsonStore');
  await writeJSON(CATEGORIES_FILE, categories);
}

export async function addCategory(newCategory: Category): Promise<Category[]> {
  const categories = await readCategories();
  const updated = [...categories, newCategory];
  await saveCategories(updated);
  return updated;
}

export async function deleteCategory(
  id: string | number
): Promise<Category[]> {
  const categories = await readCategories();
  const updated = categories.filter((c) => c.id !== id);
  await saveCategories(updated);
  return updated;
}

export async function updateCategory(
  updated: Category
): Promise<Category[]> {
  const categories = await readCategories();

  const newList = categories.map((c) =>
    c.id === updated.id ? { ...c, ...updated } : c
  );

  await saveCategories(newList);
  return newList;
}
