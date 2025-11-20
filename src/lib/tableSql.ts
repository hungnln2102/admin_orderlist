export interface TableColumn {
  name: string;
  type: string;
  description: string;
}

export interface TableDefinition {
  tableName: string;
  columns: Record<string, TableColumn>;
}

const makeColumn = (
  name: string,
  type: string,
  description: string
): TableColumn => ({
  name,
  type,
  description,
});

export const ORDER_LIST_TABLE: TableDefinition = {
  tableName: "mavryk.order_list",
  columns: {
    ID: makeColumn("id", "int4", "Khóa chính tự tăng"),
    ID_DON_HANG: makeColumn("id_don_hang", "text", "Mã đơn hàng gốc"),
    SAN_PHAM: makeColumn("san_pham", "text", "Tên sản phẩm"),
    THONG_TIN_SAN_PHAM: makeColumn(
      "thong_tin_san_pham",
      "text",
      "Mô tả hoặc thuộc tính sản phẩm"
    ),
    KHACH_HANG: makeColumn("khach_hang", "text", "Tên khách hàng"),
    LINK_LIEN_HE: makeColumn("link_lien_he", "text", "Link liên hệ/nhắn tin"),
    SLOT: makeColumn("slot", "text", "Slot/ô đặt bán"),
    NGAY_DANG_KI: makeColumn("ngay_dang_ki", "date", "Ngày đăng ký đơn"),
    SO_NGAY_DA_DANG_KI: makeColumn(
      "so_ngay_da_dang_ki",
      "text",
      "Số ngày đã đăng ký (chuỗi lưu từ nguồn cũ)"
    ),
    HET_HAN: makeColumn("het_han", "date", "Ngày hết hạn"),
    NGUON: makeColumn("nguon", "text", "Nguồn đơn (CTV/KHTN/…)"),
    GIA_NHAP: makeColumn("gia_nhap", "numeric(15,2)", "Giá nhập"),
    GIA_BAN: makeColumn("gia_ban", "numeric(15,2)", "Giá bán"),
    NOTE: makeColumn("note", "text", "Ghi chú bổ sung"),
    TINH_TRANG: makeColumn("tinh_trang", "text", "Trạng thái đơn"),
    CHECK_FLAG: makeColumn("check_flag", "bool", "Cờ đánh dấu đã xử lý"),
  },
};

export const ORDER_CANCELED_TABLE: TableDefinition = {
  tableName: "mavryk.order_canceled",
  columns: {
    ID: makeColumn("id", "int4", "Khóa chính tự tăng"),
    ID_DON_HANG: makeColumn("id_don_hang", "text", "Mã đơn đã hủy"),
    SAN_PHAM: makeColumn("san_pham", "text", "Tên sản phẩm"),
    THONG_TIN_SAN_PHAM: makeColumn(
      "thong_tin_san_pham",
      "text",
      "Mô tả sản phẩm"
    ),
    KHACH_HANG: makeColumn("khach_hang", "text", "Tên khách hàng"),
    LINK_LIEN_HE: makeColumn("link_lien_he", "text", "Link liên hệ/nhắn tin"),
    SLOT: makeColumn("slot", "text", "Slot chiến dịch"),
    NGAY_DANG_KI: makeColumn("ngay_dang_ki", "date", "Ngày đăng ký ban đầu"),
    SO_NGAY_DA_DANG_KI: makeColumn(
      "so_ngay_da_dang_ki",
      "text",
      "Số ngày đã đăng ký trước khi hủy"
    ),
    HET_HAN: makeColumn("het_han", "date", "Ngày hết hạn hợp đồng"),
    NGUON: makeColumn("nguon", "text", "Nguồn đơn"),
    GIA_NHAP: makeColumn("gia_nhap", "numeric(15,2)", "Giá nhập (chi phí)"),
    GIA_BAN: makeColumn("gia_ban", "numeric(15,2)", "Giá bán dự kiến"),
    CAN_HOAN: makeColumn("can_hoan", "numeric(15,2)", "Số tiền cần hoàn trả"),
    TINH_TRANG: makeColumn(
      "tinh_trang",
      "text",
      "Trạng thái xử lý (đã hoàn, đang xử lý, …)"
    ),
    CHECK_FLAG: makeColumn("check_flag", "bool", "Cờ kiểm tra"),
  },
};

export const ORDER_EXPIRED_TABLE: TableDefinition = {
  tableName: "mavryk.order_expired",
  columns: {
    ID: makeColumn("id", "int4", "Khóa chính tự tăng"),
    ID_DON_HANG: makeColumn("id_don_hang", "varchar(255)", "Mã đơn đã hết hạn"),
    SAN_PHAM: makeColumn("san_pham", "varchar(255)", "Tên sản phẩm"),
    THONG_TIN_SAN_PHAM: makeColumn(
      "thong_tin_san_pham",
      "text",
      "Mô tả sản phẩm"
    ),
    KHACH_HANG: makeColumn("khach_hang", "varchar(255)", "Tên khách hàng"),
    LINK_LIEN_HE: makeColumn("link_lien_he", "text", "Link liên hệ/nhắn tin"),
    SLOT: makeColumn("slot", "varchar(50)", "Slot chiến dịch"),
    NGAY_DANG_KI: makeColumn("ngay_dang_ki", "date", "Ngày đăng ký ban đầu"),
    SO_NGAY_DA_DANG_KI: makeColumn(
      "so_ngay_da_dang_ki",
      "int4",
      "Tổng số ngày đã đăng ký"
    ),
    HET_HAN: makeColumn("het_han", "date", "Ngày hết hạn cuối cùng"),
    NGUON: makeColumn("nguon", "varchar(255)", "Nguồn đơn"),
    GIA_NHAP: makeColumn("gia_nhap", "numeric(10,2)", "Giá nhập"),
    GIA_BAN: makeColumn("gia_ban", "numeric(10,2)", "Giá bán"),
    NOTE: makeColumn("note", "text", "Ghi chú bổ sung"),
    TINH_TRANG: makeColumn("tinh_trang", "varchar(50)", "Trạng thái xử lý"),
    CHECK_FLAG: makeColumn("check_flag", "bool", "Cờ đánh dấu đã xử lý"),
    ARCHIVED_AT: makeColumn(
      "archived_at",
      "timestamptz",
      "Thời điểm lưu record hết hạn"
    ),
  },
};

export const ACCOUNT_STORAGE_TABLE: TableDefinition = {
  tableName: "mavryk.account_storage",
  columns: {
    ID: makeColumn("id", "int4", "Khóa chính tự tăng"),
    USERNAME: makeColumn("username", "text", "Tên tài khoản gốc"),
    PASSWORD: makeColumn("password", "text", "Mật khẩu tài khoản"),
    MAIL_2ND: makeColumn('"Mail 2nd"', "text", "Email/phục hồi thứ 2"),
    NOTE: makeColumn("note", "text", "Ghi chú"),
    STORAGE: makeColumn("storage", "int4", "Dung lượng hoặc số slot"),
    MAIL_FAMILY: makeColumn(
      '"Mail Family"',
      "text",
      "Thông tin mail family/chia sẻ"
    ),
  },
};

export const BANK_LIST_TABLE: TableDefinition = {
  tableName: "mavryk.bank_list",
  columns: {
    BIN: makeColumn("bin", "varchar(20)", "Mã BIN ngân hàng"),
    BANK_NAME: makeColumn("bank_name", "varchar(255)", "Tên ngân hàng"),
  },
};

export const PACKAGE_PRODUCT_TABLE: TableDefinition = {
  tableName: "mavryk.package_product",
  columns: {
    ID: makeColumn("id", "int4", "Khóa chính"),
    PACKAGE: makeColumn("package", "text", "Tên package"),
    USERNAME: makeColumn("username", "text", "Tên đăng nhập"),
    PASSWORD: makeColumn("password", "text", "Mật khẩu"),
    MAIL_2ND: makeColumn('"mail 2nd"', "text", "Email phục hồi"),
    NOTE: makeColumn("note", "text", "Ghi chú"),
    EXPIRED: makeColumn("expired", "date", "Ngày hết hạn"),
    SUPPLIER: makeColumn("supplier", "text", "Nhà cung cấp"),
    IMPORT: makeColumn('"Import"', "int4", "Giá nhập (số nguyên)"),
    SLOT: makeColumn("slot", "int4", "Slot"),
  },
};

export const PAYMENT_RECEIPT_TABLE: TableDefinition = {
  tableName: "mavryk.payment_receipt",
  columns: {
    ID: makeColumn("id", "int4", "Khóa chính"),
    MA_DON_HANG: makeColumn("ma_don_hang", "text", "Mã đơn hàng"),
    NGAY_THANH_TOAN: makeColumn(
      "ngay_thanh_toan",
      "text",
      "Ngày thanh toán (chuỗi)"
    ),
    SO_TIEN: makeColumn("so_tien", "numeric(15,2)", "Số tiền"),
    NGUOI_GUI: makeColumn("nguoi_gui", "text", "Người gửi"),
    NOI_DUNG_CK: makeColumn("noi_dung_ck", "text", "Nội dung chuyển khoản"),
  },
};

export const PAYMENT_SUPPLY_TABLE: TableDefinition = {
  tableName: "mavryk.payment_supply",
  columns: {
    ID: makeColumn("id", "int4", "Khóa chính"),
    SOURCE_ID: makeColumn("source_id", "int4", "ID nguồn"),
    IMPORT: makeColumn("import", "int4", "Giá nhập"),
    ROUND: makeColumn("round", "text", "Vòng thanh toán"),
    STATUS: makeColumn("status", "text", "Trạng thái"),
    PAID: makeColumn("paid", "int4", "Số tiền đã thanh toán"),
  },
};

export const PRODUCT_PRICE_TABLE: TableDefinition = {
  tableName: "mavryk.product_price",
  columns: {
    ID: makeColumn("id", "int4", "Khóa chính"),
    SAN_PHAM: makeColumn("san_pham", "text", "Tên sản phẩm"),
    PCT_CTV: makeColumn("pct_ctv", "numeric(5,2)", "Hệ số CTV"),
    PCT_KHACH: makeColumn("pct_khach", "numeric(5,2)", "Hệ số khách"),
    IS_ACTIVE: makeColumn(
      "is_active",
      "bool",
      "Cờ active (đang kinh doanh sản phẩm)"
    ),
    PACKAGE: makeColumn("package", "text", "Tên package liên kết"),
    PACKAGE_PRODUCT: makeColumn(
      "package_product",
      "text",
      "ID package_product tham chiếu"
    ),
    UPDATE: makeColumn("update", "date", "Ngày cập nhật"),
    PCT_PROMO: makeColumn("pct_promo", "numeric(5,2)", "Hệ số khuyến mãi"),
  },
};

export const REFUND_TABLE: TableDefinition = {
  tableName: "mavryk.refund",
  columns: {
    ID: makeColumn("id", "int4", "Khóa chính"),
    MA_DON_HANG: makeColumn("ma_don_hang", "text", "Mã đơn hàng"),
    NGAY_THU_HOI: makeColumn("ngay_thanh_toan", "text", "Ngày thu hồi"),
    SO_TIEN: makeColumn("so_tien", "numeric(15,2)", "Số tiền"),
  },
};

export const SUPPLY_TABLE: TableDefinition = {
  tableName: "mavryk.supply",
  columns: {
    SOURCE_NAME: makeColumn("source_name", "text", "Tên nguồn"),
    ID: makeColumn("id", "int4", "Khóa chính"),
    NUMBER_BANK: makeColumn("number_bank", "text", "Số tài khoản"),
    BIN_BANK: makeColumn("bin_bank", "text", "BIN ngân hàng"),
  },
};

export const SUPPLY_PRICE_TABLE: TableDefinition = {
  tableName: "mavryk.supply_price",
  columns: {
    ID: makeColumn("id", "int4", "Khóa chính"),
    PRODUCT_ID: makeColumn("product_id", "int4", "ID sản phẩm"),
    SOURCE_ID: makeColumn("source_id", "int4", "ID nguồn"),
    PRICE: makeColumn("price", "numeric(15,2)", "Giá nhập theo nguồn"),
  },
};

export const TABLE_SQL = {
  ORDER_LIST: ORDER_LIST_TABLE,
  ORDER_CANCELED: ORDER_CANCELED_TABLE,
  ORDER_EXPIRED: ORDER_EXPIRED_TABLE,
  ACCOUNT_STORAGE: ACCOUNT_STORAGE_TABLE,
  BANK_LIST: BANK_LIST_TABLE,
  PACKAGE_PRODUCT: PACKAGE_PRODUCT_TABLE,
  PAYMENT_RECEIPT: PAYMENT_RECEIPT_TABLE,
  PAYMENT_SUPPLY: PAYMENT_SUPPLY_TABLE,
  PRODUCT_PRICE: PRODUCT_PRICE_TABLE,
  REFUND: REFUND_TABLE,
  SUPPLY: SUPPLY_TABLE,
  SUPPLY_PRICE: SUPPLY_PRICE_TABLE,
} as const;

export type TableSqlKey = keyof typeof TABLE_SQL;
