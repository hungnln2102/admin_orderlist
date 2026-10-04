export interface PricingItem {
  id: number;
  san_pham: string;
  package_product: string;
  base_price: number;
  retail_price: number;
  ctv_price: number;
  student_price: number;
  promo_price: number;
  margin: string;
  is_active: boolean;
  updated_at: string;
}

export interface SupplierCostItem {
  id: number;
  product_variant_id: number;
  supplier_id: number;
  price: number;
  supplier_name: string;
  number_bank?: string;
}

export interface Supplier {
  id: number;
  supplier_name: string;
  number_bank?: string;
}

export interface ProductFormData {
  name: string;
  variant_name: string;
  base_price: number;
  retail_price: number;
  ctv_price: number;
  student_price: number;
  promo_price: number;
}

export interface EditingSupplierCostState {
  productId: number;
  supplierCostId: number;
  supplierName: string;
  price: number;
}
