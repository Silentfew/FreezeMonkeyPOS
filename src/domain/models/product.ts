export interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  active?: boolean;
  prepMinutes?: number;
}
