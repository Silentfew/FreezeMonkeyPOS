export interface Category {
  id: string;
  name: string;
  order: number;
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
