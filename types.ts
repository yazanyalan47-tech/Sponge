
export enum SpongeType {
  SL = 'SL',
  Extra = 'Extra',
  SS = 'SS',
  B = 'B',
  Bb = 'Bb',
  C18 = 'C18',
  White = 'white'
}

export const SpongePrices: Record<SpongeType, number> = {
  [SpongeType.SL]: 9.3,
  [SpongeType.Extra]: 7,
  [SpongeType.SS]: 5.8,
  [SpongeType.B]: 5.6,
  [SpongeType.Bb]: 5.2,
  [SpongeType.C18]: 3.9,
  [SpongeType.White]: 3,
};

export type Category = 'sponge' | 'other';
export type CustomerType = 'retail' | 'wholesale';
export type DiscountRate = 50 | 35 | 37;

export interface InvoiceItem {
  id: string;
  category: Category;
  description: string; // Type for sponge, name for others
  thickness?: number;
  width?: number;
  quantity: number;
  unitPrice: number;
  discount?: number;
  totalPrice: number;
}

export interface SavedInvoice {
  id: string; // YYYYMMDDHHMM
  customerName: string;
  customerType: CustomerType;
  date: string;
  items: InvoiceItem[];
  totalAmount: number;
}
