export type QuoteProductDescSection = {
  name: string;
  rules: string;
  description: string;
};

export type QuoteLine = {
  id: string;
  productCode?: string;
  product: string;
  packageName: string;
  term: string;
  durationMonths?: number | null;
  durationDays?: number | null;
  unitPrice: number;
  quantity: number;
  discount?: number;
  note?: string;
};

export type QuoteLineWithTotal = QuoteLine & { total: number };

export type ProductDesc = {
  productId: string;
  rules?: string | null;
  description?: string | null;
};

export type ApiPriceEntry = {
  price: number;
  promoPrice: number;
  resellPrice?: number;
};
