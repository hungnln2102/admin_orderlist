export const API_ENDPOINTS = {
  ORDERS: "/api/orders",
  ORDER_BY_ID: (id: number) => `/api/orders/${id}`,
  ORDER_EXPRIED: "/api/orders-expried",

  SUPPLIES: "/api/supplies",
  // SỬA CHỮA: Đổi tên PRODUCTS thành PRODUCTS_ALL để rõ ràng, nhưng vì logic fetch Products
  // trong file CreateOrderModal đã được viết để gọi endpoint này, chúng ta sẽ giữ lại:
  // PRODUCTS: "/api/products",

  // Endpoint cũ (không dùng nữa):
  // PRODUCTS_BY_SUPPLY: (supplyId: number) =>
  //  `/api/supplies/${supplyId}/products`,

  CALCULATE_PRICE: "/api/calculate-price",

  // 1. Dùng PRODUCTS_ALL cho việc fetch tất cả sản phẩm khi mở modal (tạm thời không đổi tên)
  PRODUCTS_ALL: "/api/products", // Giả định /api/products trả về tất cả

  // 2. SỬA CHỮA LỖI LỚN NHẤT: Hàm này phải nhận TÊN SẢN PHẨM (string)
  // và endpoint cần được điều chỉnh (Giả sử backend chấp nhận tên sản phẩm trong URL)
  SUPPLIES_BY_PRODUCT: (productName: string) =>
    `/api/products/supplies-by-name/${encodeURIComponent(productName)}`, // Sửa đổi endpoint

  // GIỮ NGUYÊN các định nghĩa không liên quan trực tiếp đến lỗi
  PAYMENT_RECEIPTS: "/api/payment-receipts",
  PURCHASE_ORDERS: "/api/purchase-orders",
  REFUNDS: "/api/refunds",
  BANK_LIST: "/api/bank-list",
};

export const ORDER_FIELDS = {
  ID: "id",

  SAN_PHAM: "san_pham",
  NGUON: "nguon",
  LINK_LIEN_HE: "link_lien_he",
  KHACH_HANG: "khach_hang",
  THONG_TIN_SAN_PHAM: "thong_tin_san_pham",
  SLOT: "slot",
  NOTE: "note",
  CHECK_FLAG: "check_flag",

  ID_DON_HANG: "id_don_hang",
  TINH_TRANG: "tinh_trang",
  NGAY_DANG_KI: "ngay_dang_ki",
  SO_NGAY_DA_DANG_KI: "so_ngay_da_dang_ki",
  HET_HAN: "het_han",
  GIA_NHAP: "gia_nhap",
  GIA_BAN: "gia_ban",
};

export const ORDER_EXPRIED_FIELDS = {
  ID: "id",
  ID_DON_HANG: "id_don_hang",
  SAN_PHAM: "san_pham",
  THONG_TIN_SAN_PHAM: "thong_tin_san_pham",
  KHACH_HANG: "khach_hang",
  LINK_LIEN_HE: "link_lien_he",
  SLOT: "slot",
  NGAY_DANG_KI: "ngay_dang_ki",
  SO_NGAY_DA_DANG_KI: "so_ngay_da_dang_ki",
  HET_HAN: "het_han",
  NGUON: "nguon",
  GIA_NHAP: "gia_nhap",
  GIA_BAN: "gia_ban",
  NOTE: "note",
  TINH_TRANG: "tinh_trang",
  CHECK_FLAG: "check_flag",

  ARCHIVED_AT: "archived_at",
};

export const PRODUCT_PRICE_FIELDS = {
  ID: "id",
  SAN_PHAM: "san_pham",
  PCT_CTV: "pct_ctv",
  PCT_KHACH: "pct_khach",
  IS_ACTIVE: "is_active",
};

export const SUPPLY_FIELDS = {
  ID: "id",
  SOURCE_NAME: "source_name",
  NUMBER_BANK: "number_bank",
  BIN_BANK: "bin_bank",
};

export const SUPPLY_PRICE_FIELDS = {
  ID: "id",
  PRODUCT_ID: "product_id",
  SOURCE_ID: "source_id",
  PRICE: "price",
};

export const PAYMENT_RECEIPT_FIELDS = {
  ID: "id",
  MA_DON_HANG: "ma_don_hang",
  NGAY_THANH_TOAN: "ngay_thanh_toan",
  SO_TIEN: "so_tien",
  NGUOI_GUI: "nguoi_gui",
  NOI_DUNG_CK: "noi_dung_ck",
};

export const PURCHASE_ORDER_FIELDS = {
  ID: "id",
  ID_DON_HANG: "id_don_hang",
  SAN_PHAM: "san_pham",
  THONG_TIN_SAN_PHAM: "thong_tin_san_pham",
  SLOT: "slot",
  NGAY_DANG_KI: "ngay_dang_ki",
  SO_NGAY_DA_DANG_KI: "so_ngay_da_dang_ki",
  HET_HAN: "het_han",
  NGUON: "nguon",
  GIA_NHAP: "gia_nhap",
  TINH_TRANG: "tinh_trang",
  CHECK_FLAG: "check_flag",
};

export const REFUND_FIELDS = {
  ID: "id",
  MA_DON_HANG: "ma_don_hang",
  NGAY_THU_HOI: "ngay_thanh_toan",
  SO_TIEN: "so_tien",
};

export const BANK_LIST_FIELDS = {
  BIN: "bin",
  BANK_NAME: "bank_name",
};

export const VIRTUAL_FIELDS = {
  SO_NGAY_CON_LAI: "soNgayConLai",
  GIA_TRI_CON_LAI: "giaTriConLai",
  TRANG_THAI_TEXT: "trangThaiText",
  CHECK_FLAG_STATUS: "check_flag_status",
};

export const CALCULATED_FIELDS = {
  GIA_NHAP: "gia_nhap",
  GIA_BAN: "gia_ban",
  SO_NGAY_DA_DANG_KI: "so_ngay_da_dang_ki",
  HET_HAN: "het_han",
};
