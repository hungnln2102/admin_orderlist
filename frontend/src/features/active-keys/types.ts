export interface ActiveKeyItem {
  id: string;
  account: string;  // Đang dùng để hiển thị Mã Đơn Hàng
  product: string;  // Sản phẩm
  systemName?: string; // Tên hệ thống (Adobe Cá Nhân, ...)
  key: string;      // Key kích hoạt
  expiry: string;   // Thời hạn (e.g. "31/12/2025" hoặc "Còn 30 ngày")
}

export interface CreateKeyFormValues {
  account: string;
  product: string;
  key: string;
  expiry: string;
}
