export interface Category {
  id: number;
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

export async function addCategory(
  payload: Omit<Category, "id">
): Promise<Category> {
  const categories = await readCategories();

  const nextId =
    categories.length > 0
      ? Math.max(
          ...categories
            .map((c) => Number(c.id))
            .filter((n) => !Number.isNaN(n))
        ) + 1
      : 1;

  const newCategory: Category = {
    ...payload,
    id: nextId,
  };

  const updated = [...categories, newCategory];

  await saveCategories(updated); // use the existing save function here
  return newCategory;
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
  id: number | string,
  updates: Partial<Omit<Category, "id">>
): Promise<Category[]> {
  const categories = await readCategories();

  const targetId = Number(id);

  const newList = categories.map((c) =>
    Number(c.id) === targetId ? { ...c, ...updates } : c
  );

  await saveCategories(newList); // use the existing save function here
  return newList;
}
