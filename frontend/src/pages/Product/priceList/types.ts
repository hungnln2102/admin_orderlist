import { CurrencyDollarIcon } from "@heroicons/react/24/outline";
import type { STAT_CARD_ACCENTS } from "../../../components/ui/StatCard";

export type StatusFilter = "all" | "active" | "inactive";

export type StatAccent = keyof typeof STAT_CARD_ACCENTS;

export interface ProductPricingRow {
  id: number;
  packageName: string;
  packageProduct: string;
  sanPhamRaw: string;
  variantLabel: string;
  pctCtv: number | null;
  pctKhach: number | null;
  pctPromo: number | null;
  isActive: boolean;
  baseSupplyPrice: number | null;
  wholesalePrice: number | null;
  retailPrice: number | null;
  promoPrice: number | null;
  lastUpdated: string | null;
}

export interface PricingStat {
  name: string;
  value: string;
  icon: typeof CurrencyDollarIcon;
  accent: StatAccent;
  subtitle: string;
}

export interface RateDescriptionInput {
  multiplier?: number | null;
  price?: number | null;
  basePrice?: number | null;
  label?: string;
}

export interface SupplyPriceItem {
  sourceId: number;
  sourceName: string;
  price: number | null;
  lastOrderDate: string | null;
}

export interface SupplyPriceState {
  loading: boolean;
  error: string | null;
  items: SupplyPriceItem[];
  productName?: string;
}

export interface ProductEditFormState {
  packageName: string;
  packageProduct: string;
  sanPham: string;
  pctCtv: string;
  pctKhach: string;
  pctPromo: string;
}

export interface BankOption {
  bin: string;
  name: string;
}

export interface SupplierOption {
  id: number | null;
  name: string;
  numberBank?: string;
  binBank?: string;
}

export interface CreateProductFormState {
  packageName: string;
  packageProduct: string;
  sanPham: string;
  pctCtv: string;
  pctKhach: string;
  pctPromo: string;
}

export interface CreateSupplierEntry {
  id: string;
  sourceId: number | null;
  sourceName: string;
  price: string;
  numberBank: string;
  bankBin: string;
  useCustomName: boolean;
}

export interface DeleteProductState {
  product: ProductPricingRow | null;
  loading: boolean;
  error: string | null;
}

export interface NewSupplyRowState {
  sourceName: string;
  price: string;
  error: string | null;
  isSaving: boolean;
}
