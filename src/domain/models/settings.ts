export interface Settings {
  currency: string;
  taxRate: number;
  taxInclusive: boolean;
  pins: PinUser[];
}

export interface PinUser {
  pin: string;
  name: string;
  role: 'OWNER' | 'STAFF';
}
