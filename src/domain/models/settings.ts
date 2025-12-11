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
  pricesIncludeTax: boolean;
  gstRatePercent: number;
  kitchenPrepMinutes?: number;
  pins: PinUser[];
  kitchen?: KitchenSettings;
  /**
   * @deprecated Use gstRatePercent instead. Maintained for backward compatibility with older payloads.
   */
  taxRatePercent?: number;
}
