export interface Supply {
  id: number;
  sourceName: string;
  numberBank: string | null;
  binBank: string | null;
  /** Chủ tài khoản (VietQR) — từ DB account_holder */
  nameBank?: string | null;
  bankName: string | null;
  status: "active" | "inactive";
  isActive: boolean;
  products: string[];
  monthlyOrders: number;
  monthlyImportValue: number;
  lastOrderDate: string | null;
  totalOrders: number;
  totalPaidImport: number;
  totalUnpaidImport: number;
  /** Luồng 1: Shop cần thanh toán cho NCC */
  payableToSupplier?: number;
  /** Luồng 2: NCC cần hoàn tiền lại cho Shop */
  supplierRefundToShop?: number;
}

export interface SupplyStats {
  totalSuppliers: number;
  activeSuppliers: number;
  monthlyOrders: number;
  totalImportValue: number;
}

export interface Payment {
  id: number;
  round: string;
  totalImport: number;
  paid: number;
  status?: string;
}

export interface BankOption {
  bin: string;
  name: string;
}
