export interface ActiveKeyItem {
  id: string;
  account: string;  // Tài khoản khách hàng gắn với key
  product: string;  // Sản phẩm
  key: string;      // Key kích hoạt
  expiry: string;   // Thời hạn (e.g. "31/12/2025" hoặc "Còn 30 ngày")
}

export interface CreateKeyFormValues {
  account: string;
  product: string;
  key: string;
  expiry: string;
}
