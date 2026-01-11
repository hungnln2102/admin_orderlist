import { Order } from "../../../constants";

export type OrderView = Order & {
  customer_type?: string | null;
  trangThaiText?: string | null;
  giaTriConLai?: number | null;
};

export interface ViewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderView | null;
  formatCurrency: (value: number | string) => string;
}

export type CalculatePriceResponse = {
  gia_ban?: number;
  price?: number;
  error?: string;
};
