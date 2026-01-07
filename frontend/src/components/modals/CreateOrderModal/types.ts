import { Order as ApiOrder } from "../../../constants";

export type Order = Omit<ApiOrder, "cost" | "price"> & {
  cost: number | string;
  price: number | string;
};

export interface Supply {
  id: number;
  supplier_name: string;
  source_name?: string;
}

export interface Product {
  id: number;
  san_pham: string;
}

export interface SupplyPrice {
  source_id: number;
  price: number;
}

export interface CalculatedPriceResult {
  cost: number;
  price: number;
  days: number;
  order_expired: string;
}

export type RawCalculatedPriceResult = Partial<{
  gia_nhap: number;
  gia_ban: number;
  so_ngay_da_dang_ki: number;
  het_han: string;
  cost: number;
  price: number;
  days: number;
  order_expired: string;
}>;

export type CustomerType = "MAVC" | "MAVL" | "MAVK" | "MAVT" | "MAVN";

export interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newOrderData: Partial<Order> | Order) => void;
}

export interface UseCreateOrderLogicResult {
  formData: Partial<Order>;
  supplies: Supply[];
  allSupplies: Supply[];
  products: Product[];
  isLoading: boolean;
  isDataLoaded: boolean;
  selectedSupplyId: number | null;
  customerType: CustomerType;
  updateForm: (patch: Partial<Order>) => void;
  setIsDataLoaded: (v: boolean) => void;
  customProductTouched: boolean;
  setCustomProductTouched: React.Dispatch<React.SetStateAction<boolean>>;
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;
  handleProductSelect: (productName: string) => void;
  handleSourceSelect: (sourceId: number) => void;
  handleProductChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleCustomerTypeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleSubmit: (e: React.FormEvent) => boolean;
}

export type SSOption = { value: string | number; label: string };

export interface SearchableSelectProps {
  name?: string;
  value: string | number | null | undefined;
  options: SSOption[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: SSOption["value"], option: SSOption) => void;
  onClear?: () => void;
}
