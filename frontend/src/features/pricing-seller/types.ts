export type SellerPricingCategory = {
  id: number;
  name: string;
};

export type SellerPricingItem = {
  variant_id?: number;
  product_id?: number;
  variant_name: string;
  display_name?: string;
  product_name?: string;
  product_rules?: string;
  categories?: SellerPricingCategory[];
  gia_goc: number;
  gia_si: number;
  gia_le: number;
};

export type SellerPricingResponse = {
  items?: SellerPricingItem[];
};
