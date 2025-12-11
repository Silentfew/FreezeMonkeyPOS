export interface PinUser {
  pin: string;
  name: string;
  role: 'OWNER' | 'STAFF';
}

export interface KitchenCategoryPrepTime {
  categoryId: number;
  minutes: number;
}

export interface KitchenSettings {
  defaultMinutes: number;
  categories: KitchenCategoryPrepTime[];
}

export interface Settings {
  currency: string;
  taxRatePercent: number;
  pricesIncludeTax: boolean;
  kitchenPrepMinutes?: number;
  pins: PinUser[];
  kitchen?: KitchenSettings;
}
