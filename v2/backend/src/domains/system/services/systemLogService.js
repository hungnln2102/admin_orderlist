const { db, TABLES } = require("@/db");

const EVENT_NAME_VI_MAP = {
  ORDER_CREATED: "Tạo mới đơn hàng",
  ORDER_UPDATED: "Cập nhật đơn hàng",
  ORDER_DELETED: "Xóa đơn hàng",
  ORDER_PAID: "Xác nhận thanh toán đơn hàng",
  ORDER_RENEWED: "Gia hạn thời hạn đơn hàng",
  ORDER_CANCELED_REFUNDED: "Hủy và hoàn tiền đơn hàng",
  ORDER_PENDING_REFUND: "Đánh dấu chờ hoàn tiền đơn hàng",
  ORDER_EXPIRED: "Đơn hàng đã hết hạn",
  ORDER_IMPORT_CREATED: "Tạo phiếu nhập đơn hàng",
  ORDER_IMPORT_CANCELED: "Hủy phiếu nhập đơn hàng",

  PRODUCT_CREATED: "Thêm mới sản phẩm",
  PRODUCT_UPDATED: "Cập nhật thông tin sản phẩm",
  PRODUCT_DELETED: "Xóa sản phẩm",

  SUPPLIER_CREATED: "Thêm mới nhà cung cấp",
  SUPPLIER_UPDATED: "Cập nhật nhà cung cấp",
  SUPPLIER_DELETED: "Xóa nhà cung cấp",
  SUPPLIER_STATUS_TOGGLED: "Bật/tắt trạng thái nhà cung cấp",
  SUPPLIER_DEBT_PAID: "Thanh toán công nợ nhà cung cấp",

  SUPPLIER_COST_ADDED: "Thêm chi phí nhà cung cấp",
  SUPPLIER_COST_UPDATED: "Cập nhật chi phí nhà cung cấp",
  SUPPLIER_COST_DELETED: "Xóa chi phí nhà cung cấp",

  WEBHOOK_MONEY_IN: "Nhận tiền chuyển khoản (SePay)",
  WEBHOOK_MONEY_OUT: "Biến động số dư trừ tiền",

  SYSTEM_CONFIG_UPDATED: "Thay đổi cấu hình hệ thống",

  WAREHOUSE_STOCK_CREATED: "Thêm mới kho hàng / tài khoản kho",
  WAREHOUSE_STOCK_UPDATED: "Cập nhật kho hàng / tài khoản kho",
  WAREHOUSE_STOCK_DELETED: "Xóa kho hàng / tài khoản kho",
  WAREHOUSE_CATALOG_CREATED: "Thêm danh mục kho",
  WAREHOUSE_CATALOG_DELETED: "Xóa danh mục kho",

  PACKAGE_CATEGORY_CREATED: "Thêm danh mục gói dịch vụ",
  PACKAGE_CATEGORY_UPDATED: "Cập nhật danh mục gói dịch vụ",
  PACKAGE_CATEGORY_DELETED: "Xóa danh mục gói dịch vụ",

  PACKAGE_PRODUCT_CREATED: "Thêm sản phẩm gói",
  PACKAGE_PRODUCT_UPDATED: "Cập nhật sản phẩm gói",
  PACKAGE_PRODUCT_DELETED: "Xóa sản phẩm gói",

  EXTERNAL_IMPORT_CREATED: "Nhập dữ liệu vận hành V1",
  EXTERNAL_IMPORT_UPDATED: "Cập nhật dữ liệu vận hành",
  EXTERNAL_IMPORT_DELETED: "Xóa dữ liệu vận hành",
  FINANCE_FIXED_COST_MUTATED: "Cập nhật chi phí cố định",
  FINANCE_INSTALLMENT_PAID: "Thanh toán trả góp tài chính",
  FINANCE_ASSET_MUTATED: "Cập nhật danh mục tài sản / sổ tiết kiệm",
};

const AGGREGATE_TYPE_VI_MAP = {
  ORDER: "Quản lý Đơn hàng",
  PRODUCT: "Quản lý Sản phẩm",
  SUPPLIER: "Nhà cung cấp",
  SUPPLIER_COST: "Chi phí nhà cung cấp",
  WEBHOOK: "Giao dịch SePay / Webhook",
  SYSTEM: "Cấu hình hệ thống",
  WAREHOUSE: "Kho hàng & Tự động hóa",
  PACKAGE: "Gói dịch vụ",
  FINANCE: "Tài chính & Dòng tiền",
  EXTERNAL_IMPORT: "Nhập dữ liệu vận hành",
};

async function getAuditLogs({ page = 1, limit = 20, aggregate_type, event_name, status, search, from_date, to_date }) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (p - 1) * l;

  let query = db(TABLES.DOMAIN_EVENT_STORE);

  if (aggregate_type) {
    query = query.where("aggregate_type", aggregate_type);
  }
  if (event_name) {
    query = query.where("event_name", event_name);
  }
  if (status) {
    query = query.where("status", status);
  }
  if (from_date) {
    query = query.where("created_at", ">=", from_date);
  }
  if (to_date) {
    query = query.where("created_at", "<=", to_date);
  }
  if (search) {
    query = query.where((builder) => {
      builder
        .where("aggregate_id", "ilike", `%${search}%`)
        .orWhere("event_name", "ilike", `%${search}%`)
        .orWhere("error_message", "ilike", `%${search}%`);
    });
  }

  const countQuery = query.clone();
  const [{ count }] = await countQuery.count("* as count");
  const total = parseInt(count, 10) || 0;

  const rows = await query
    .orderBy("created_at", "desc")
    .limit(l)
    .offset(offset);

  const items = rows.map((row) => ({
    ...row,
    event_name_vi: EVENT_NAME_VI_MAP[row.event_name] || row.event_name,
    aggregate_type_vi: AGGREGATE_TYPE_VI_MAP[row.aggregate_type] || row.aggregate_type,
  }));

  return {
    data: items,
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages: Math.ceil(total / l),
    },
  };
}

async function getAuditLogStats() {
  const [{ total }] = await db(TABLES.DOMAIN_EVENT_STORE).count("* as total");
  const [{ success }] = await db(TABLES.DOMAIN_EVENT_STORE).where("status", "PROCESSED").count("* as success");
  const [{ errors }] = await db(TABLES.DOMAIN_EVENT_STORE).where("status", "ERROR").count("* as errors");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [{ today_total }] = await db(TABLES.DOMAIN_EVENT_STORE).where("created_at", ">=", todayStart).count("* as today_total");

  const totalNum = parseInt(total, 10) || 0;
  const successNum = parseInt(success, 10) || 0;
  const successRate = totalNum > 0 ? ((successNum / totalNum) * 100).toFixed(1) : 100;

  return {
    total: totalNum,
    success: successNum,
    errors: parseInt(errors, 10) || 0,
    todayTotal: parseInt(today_total, 10) || 0,
    successRate: parseFloat(successRate),
  };
}

async function getAuditLogById(id) {
  const row = await db(TABLES.DOMAIN_EVENT_STORE).where("id", id).first();
  if (!row) return null;
  return {
    ...row,
    event_name_vi: EVENT_NAME_VI_MAP[row.event_name] || row.event_name,
    aggregate_type_vi: AGGREGATE_TYPE_VI_MAP[row.aggregate_type] || row.aggregate_type,
  };
}

module.exports = {
  getAuditLogs,
  getAuditLogStats,
  getAuditLogById,
  EVENT_NAME_VI_MAP,
  AGGREGATE_TYPE_VI_MAP,
};
