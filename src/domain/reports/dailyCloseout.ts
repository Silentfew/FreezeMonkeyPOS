import { PaymentType } from '../models/order';

export interface DailyCloseoutPayments {
  cashCents: number;
  cardCents: number;
  otherCents: number;
}

export interface DailyCloseoutSummary {
  date: string; // YYYY-MM-DD
  taxableSalesCents: number;
  gstCents: number;
  totalInclTaxCents: number;
  payments: DailyCloseoutPayments;
  countedCashCents?: number;
  cashDifferenceCents?: number;
  notes?: string;
  orderCount?: number;
  discountCentsTotal?: number;
}

export type CloseoutSavePayload = Pick<DailyCloseoutSummary, 'countedCashCents' | 'notes'>;

export type CloseoutPaymentType = PaymentType;
