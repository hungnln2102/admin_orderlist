export interface ActiveKeyItem {
  id: string;
  product: string;   // Sản phẩm
  key: string;       // Key kích hoạt
  expiry: string;   // Thời hạn (e.g. "31/12/2025" hoặc "Còn 30 ngày")
}
