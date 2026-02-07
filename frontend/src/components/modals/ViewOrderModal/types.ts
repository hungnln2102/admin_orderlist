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
  /** true = mở sau khi tạo đơn: giữ QR và giá bán theo form tạo đơn; false = mở từ icon xem: tính lại giá */
  keepOrderPrice?: boolean;
}

export type CalculatePriceResponse = {
  gia_ban?: number;
  price?: number;
  error?: string;
};
