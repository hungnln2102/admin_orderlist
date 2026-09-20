const { db } = require("@/db");
const { eventBus, EVENTS } = require("@/events");


/**
 * Lấy dữ liệu 4 Stat Cards & Danh sách BẢNG TỔNG Nhà cung cấp (Tab 1)
 */
const getSuppliersOverview = async ({ search = "", activeFilter = "", sortBy = "priority" } = {}) => {
  let whereClause = "WHERE 1=1";
  const params = [];

  if (search && search.trim()) {
    whereClause += " AND (s.supplier_name ILIKE ? OR s.number_bank ILIKE ? OR s.account_holder ILIKE ?)";
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  if (activeFilter === "active") {
    whereClause += " AND s.active_supply = true";
  } else if (activeFilter === "inactive") {
    whereClause += " AND s.active_supply = false";
  }

  // Chế độ ưu tiên sắp xếp (Sort Priority)
  let orderByClause = `
    ORDER BY
      CASE WHEN s.active_supply IS FALSE THEN 0 ELSE 1 END DESC,
      total_debt DESC,
      total_orders DESC,
      total_paid DESC,
      s.supplier_name ASC
  `;

  if (sortBy === "debt") {
    orderByClause = `
      ORDER BY
        total_debt DESC,
        CASE WHEN s.active_supply IS FALSE THEN 0 ELSE 1 END DESC,
        total_orders DESC,
        total_paid DESC,
        s.supplier_name ASC
    `;
  } else if (sortBy === "active") {
    orderByClause = `
      ORDER BY
        CASE WHEN s.active_supply IS FALSE THEN 0 ELSE 1 END DESC,
        total_orders DESC,
        total_debt DESC,
        total_paid DESC,
        s.supplier_name ASC
    `;
  } else if (sortBy === "paid") {
    orderByClause = `
      ORDER BY
        total_paid DESC,
        total_orders DESC,
        CASE WHEN s.active_supply IS FALSE THEN 0 ELSE 1 END DESC,
        total_debt DESC,
        s.supplier_name ASC
    `;
  }

  // 1. Top 4 Stat Cards
  const statsQuery = `
    SELECT
      COUNT(l.id) AS total_orders,
      COALESCE(SUM(l.import_cost), 0) AS total_import_cost,
      COALESCE(SUM(l.refund_amount), 0) AS total_refund,
      COALESCE(SUM(CASE WHEN l.ncc_payment_status = 'Chưa Thanh Toán' THEN (l.import_cost - l.refund_amount) ELSE 0 END), 0) AS total_unpaid_cost
    FROM partner.supplier_order_cost_log l;
  `;
  const statsRes = await db.raw(statsQuery);
  const statsRow = statsRes.rows[0] || {};

  // 2. Tab 1 Suppliers List (BẢNG TỔNG)
  const dataSql = `
    SELECT
      s.id,
      s.supplier_name,
      s.number_bank,
      s.bin_bank,
      s.account_holder,
      s.active_supply,
      COUNT(l.id) AS total_orders,
      COUNT(CASE WHEN l.logged_at >= DATE_TRUNC('month', CURRENT_DATE) THEN l.id END) AS current_month_orders,
      COALESCE(SUM(CASE WHEN l.logged_at >= DATE_TRUNC('month', CURRENT_DATE) THEN l.import_cost ELSE 0 END), 0) AS current_month_cost,
      MAX(l.logged_at) AS last_order_date,
      COALESCE(SUM(CASE WHEN l.ncc_payment_status = 'Đã Thanh Toán' THEN (l.import_cost - l.refund_amount) ELSE 0 END), 0) AS total_paid,
      COALESCE(SUM(CASE WHEN l.ncc_payment_status = 'Chưa Thanh Toán' THEN (l.import_cost - l.refund_amount) ELSE 0 END), 0) AS total_debt
    FROM partner.supplier s
    LEFT JOIN partner.supplier_order_cost_log l ON l.supply_id = s.id
    ${whereClause}
    GROUP BY s.id, s.supplier_name, s.number_bank, s.bin_bank, s.account_holder, s.active_supply
    ${orderByClause};
  `;

  const dataRes = await db.raw(dataSql, params);

  const suppliers = (dataRes.rows || []).map((row) => ({
    id: row.id,
    supplier_name: row.supplier_name || "Chưa có tên",
    number_bank: row.number_bank || "",
    bin_bank: row.bin_bank || "",
    account_holder: row.account_holder || "",
    active_supply: row.active_supply !== false,
    total_orders: parseInt(row.total_orders || 0, 10),
    current_month_orders: parseInt(row.current_month_orders || 0, 10),
    current_month_cost: parseFloat(row.current_month_cost || 0),
    last_order_date: row.last_order_date ? row.last_order_date : null,
    total_paid: parseFloat(row.total_paid || 0),
    total_debt: parseFloat(row.total_debt || 0),
  }));

  return {
    stats: {
      totalOrders: parseInt(statsRow.total_orders || 0, 10),
      totalImportCost: parseFloat(statsRow.total_import_cost || 0),
      totalRefund: parseFloat(statsRow.total_refund || 0),
      totalUnpaidCost: parseFloat(statsRow.total_unpaid_cost || 0),
    },
    data: suppliers,
  };
};

/**
 * Lấy Danh sách Chi phí NCC (Tab 2) có lọc theo NCC, mã đơn & phân trang
 */
const getSupplierCostLogs = async ({
  supplierId = "",
  orderCodeSearch = "",
  page = 1,
  limit = 20,
} = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  let whereClause = "WHERE 1=1";
  const params = [];

  if (supplierId && parseInt(supplierId, 10) > 0) {
    whereClause += " AND l.supply_id = ?";
    params.push(parseInt(supplierId, 10));
  }

  if (orderCodeSearch && orderCodeSearch.trim()) {
    whereClause += " AND l.id_order ILIKE ?";
    params.push(`%${orderCodeSearch.trim()}%`);
  }

  const countSql = `
    SELECT COUNT(*) AS total
    FROM partner.supplier_order_cost_log l
    ${whereClause}
  `;
  const countRes = await db.raw(countSql, params);
  const total = parseInt(countRes.rows[0]?.total || 0, 10);
  const totalPages = Math.ceil(total / limitNum) || 1;

  const dataSql = `
    SELECT
      l.id,
      l.order_list_id,
      l.supply_id,
      l.id_order,
      COALESCE(l.import_cost, 0) AS import_cost,
      COALESCE(l.refund_amount, 0) AS refund_amount,
      COALESCE(l.ncc_payment_status, 'Chưa Thanh Toán') AS ncc_payment_status,
      l.logged_at,
      s.supplier_name
    FROM partner.supplier_order_cost_log l
    JOIN partner.supplier s ON s.id = l.supply_id
    ${whereClause}
    ORDER BY l.logged_at DESC, l.id DESC
    LIMIT ? OFFSET ?
  `;

  const dataRes = await db.raw(dataSql, [...params, limitNum, offset]);

  const logs = (dataRes.rows || []).map((r) => ({
    id: r.id,
    order_list_id: r.order_list_id,
    supply_id: r.supply_id,
    id_order: r.id_order,
    supplier_name: r.supplier_name || "N/A",
    import_cost: parseFloat(r.import_cost || 0),
    refund_amount: parseFloat(r.refund_amount || 0),
    ncc_payment_status: r.ncc_payment_status,
    logged_at: r.logged_at,
  }));

  return {
    data: logs,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
  };
};

/**
 * Lấy Chi tiết Nhà Cung Cấp theo ID cho Modal V1
 */
const getSupplierDetailById = async (id) => {
  const supplierId = parseInt(id, 10);
  const supplier = await db("partner.supplier").where({ id: supplierId }).first();
  if (!supplier) throw new Error("Không tìm thấy Nhà cung cấp");

  const bankMap = {
    "970422": "MB Bank",
    "970432": "VPBank",
    "970436": "Vietcombank",
    "970415": "VietinBank",
    "970418": "BIDV",
    "970407": "Techcombank",
    "970423": "TPBank",
    "970426": "MSB",
  };
  const bankName = bankMap[supplier.bin_bank] || supplier.bin_bank || "VPBank";

  // Thống kê đơn & công nợ
  const statsRes = await db.raw(`
    SELECT
      COUNT(id) AS total_orders,
      COUNT(CASE WHEN ncc_payment_status = 'Đã Thanh Toán' THEN 1 END) AS paid_orders,
      COUNT(CASE WHEN ncc_payment_status = 'Chưa Thanh Toán' THEN 1 END) AS unpaid_orders,
      COUNT(CASE WHEN ncc_payment_status = 'Đã Hủy' OR ncc_payment_status = 'Hủy' THEN 1 END) AS canceled_orders,
      COALESCE(SUM(CASE WHEN ncc_payment_status = 'Đã Thanh Toán' THEN (import_cost - refund_amount) ELSE 0 END), 0) AS total_paid,
      COALESCE(SUM(CASE WHEN ncc_payment_status = 'Chưa Thanh Toán' THEN (import_cost - refund_amount) ELSE 0 END), 0) AS remaining_debt,
      COALESCE(SUM(refund_amount), 0) AS total_refund
    FROM partner.supplier_order_cost_log
    WHERE supply_id = ?;
  `, [supplierId]);

  const sRow = statsRes.rows[0] || {};
  const remainingDebt = parseFloat(sRow.remaining_debt || 0);
  const totalPaid = parseFloat(sRow.total_paid || 0);
  const totalRefund = parseFloat(sRow.total_refund || 0);
  const unpaidOrdersCount = parseInt(sRow.unpaid_orders || 0, 10);

  // Phân tích đơn theo tháng
  const monthlyRes = await db.raw(`
    SELECT
      EXTRACT(MONTH FROM logged_at) AS month_num,
      COUNT(id) AS order_count
    FROM partner.supplier_order_cost_log
    WHERE supply_id = ?
    GROUP BY month_num
    ORDER BY month_num ASC;
  `, [supplierId]);

  const monthlyOrders = (monthlyRes.rows || []).map((m) => ({
    month: `Tháng ${parseInt(m.month_num, 10)}`,
    count: parseInt(m.order_count, 10),
  }));

  // VietQR URL
  const bin = supplier.bin_bank || "970422";
  const accNum = supplier.number_bank || "";
  const accName = supplier.account_holder || supplier.supplier_name;
  const addInfo = `${supplier.supplier_name} thanh toan cong no`;
  const vietqrUrl = accNum
    ? `https://img.vietqr.io/image/${bin}-${accNum}-compact2.png?amount=${remainingDebt}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accName)}`
    : null;

  return {
    general_info: {
      id: supplier.id,
      supplier_name: supplier.supplier_name,
      bank_name: bankName,
      number_bank: supplier.number_bank || "",
      bin_bank: supplier.bin_bank || "",
      account_holder: supplier.account_holder || "",
      active_supply: Boolean(supplier.active_supply),
    },
    payment_overview: {
      total_paid: totalPaid,
      remaining_debt: remainingDebt,
      refund_amount: totalRefund,
      unpaid_orders_count: unpaidOrdersCount,
    },
    order_stats: {
      total_orders: parseInt(sRow.total_orders || 0, 10),
      paid_orders: parseInt(sRow.paid_orders || 0, 10),
      unpaid_orders: parseInt(sRow.unpaid_orders || 0, 10),
      canceled_orders: parseInt(sRow.canceled_orders || 0, 10),
    },
    unpaid_cycle: {
      amount_needed: remainingDebt,
      refund_to_shop: totalRefund,
      debt_by_order: remainingDebt,
      amount_paid: 0,
      payment_status: remainingDebt > 0 ? "CHƯA THANH TOÁN" : "ĐÃ THANH TOÁN",
      shop_bank_accounts: [
        { id: 1, label: "0378304963 • MB • NGO LE NGOC HUNG (mặc định)" },
      ],
      vietqr_url: vietqrUrl,
    },
    monthly_orders: monthlyOrders,
  };
};

/**
 * Xử lý Thanh Toán Công Nợ cho NCC
 */
const paySupplierDebt = async (id) => {
  const supplierId = parseInt(id, 10);
  const supplier = await db("partner.supplier").where({ id: supplierId }).first();
  if (!supplier) throw new Error("Không tìm thấy Nhà cung cấp");

  // Đổi ncc_payment_status của tất cả đơn 'Chưa Thanh Toán' sang 'Đã Thanh Toán'
  await db("partner.supplier_order_cost_log")
    .where({ supply_id: supplierId, ncc_payment_status: "Chưa Thanh Toán" })
    .update({ ncc_payment_status: "Đã Thanh Toán" });

  eventBus.emit(EVENTS.SUPPLIER_DEBT_PAID, {
    id: supplierId,
    supplier_name: supplier.supplier_name,
    summary: `Đã thanh toán công nợ cho nhà cung cấp "${supplier.supplier_name}"`,
  });

  return { success: true, message: `Đã cập nhật thanh toán công nợ cho NCC ${supplier.supplier_name}` };
};

/**
 * Toggle trạng thái hoạt động NCC (Bật/Tắt Power)
 */
const toggleSupplierStatus = async (id) => {
  const supplierId = parseInt(id, 10);
  const existing = await db("partner.supplier").where({ id: supplierId }).first();
  if (!existing) throw new Error("Không tìm thấy Nhà cung cấp");

  const newStatus = !existing.active_supply;
  await db("partner.supplier").where({ id: supplierId }).update({ active_supply: newStatus });

  eventBus.emit(EVENTS.SUPPLIER_STATUS_TOGGLED, {
    id: supplierId,
    supplier_name: existing.supplier_name,
    previous_status: existing.active_supply,
    new_status: newStatus,
    summary: `Đã ${newStatus ? "kích hoạt" : "ngưng"} hợp tác với nhà cung cấp "${existing.supplier_name}"`,
  });

  return { id: supplierId, active_supply: newStatus };
};

/**
 * Thêm mới Nhà cung cấp
 */
const createSupplier = async (data) => {
  const {
    supplier_name,
    number_bank = "",
    bin_bank = "",
    account_holder = "",
    active_supply = true,
  } = data;

  if (!supplier_name || !supplier_name.trim()) {
    throw new Error("Vui lòng nhập tên nhà cung cấp");
  }

  const [inserted] = await db("partner.supplier")
    .insert({
      supplier_name: supplier_name.trim(),
      number_bank: number_bank ? number_bank.trim() : null,
      bin_bank: bin_bank ? bin_bank.trim() : null,
      account_holder: account_holder ? account_holder.trim() : null,
      active_supply: active_supply ?? true,
    })
    .returning("*");

  eventBus.emit(EVENTS.SUPPLIER_CREATED, {
    id: inserted.id,
    supplier_name: inserted.supplier_name,
    number_bank: inserted.number_bank,
    bin_bank: inserted.bin_bank,
    account_holder: inserted.account_holder,
    active_supply: inserted.active_supply,
    summary: `Thêm mới nhà cung cấp "${inserted.supplier_name}"`,
  });

  return inserted;
};

/**
 * Cập nhật Nhà cung cấp
 */
const updateSupplier = async (id, data) => {
  const supplierId = parseInt(id, 10);
  const existing = await db("partner.supplier").where({ id: supplierId }).first();
  if (!existing) {
    throw new Error("Không tìm thấy Nhà cung cấp cần sửa");
  }

  const updateFields = {};
  if (data.supplier_name !== undefined) updateFields.supplier_name = data.supplier_name.trim();
  if (data.number_bank !== undefined) updateFields.number_bank = data.number_bank ? data.number_bank.trim() : null;
  if (data.bin_bank !== undefined) updateFields.bin_bank = data.bin_bank ? data.bin_bank.trim() : null;
  if (data.account_holder !== undefined) updateFields.account_holder = data.account_holder ? data.account_holder.trim() : null;
  if (data.active_supply !== undefined) updateFields.active_supply = Boolean(data.active_supply);

  const [updated] = await db("partner.supplier")
    .where({ id: supplierId })
    .update(updateFields)
    .returning("*");

  const changedFields = [];
  const changes = {};

  if (updateFields.supplier_name !== undefined && updateFields.supplier_name !== existing.supplier_name) {
    changedFields.push("supplier_name");
    changes.supplier_name = { old: existing.supplier_name, new: updateFields.supplier_name };
  }
  if (updateFields.number_bank !== undefined && updateFields.number_bank !== existing.number_bank) {
    changedFields.push("number_bank");
    changes.number_bank = { old: existing.number_bank, new: updateFields.number_bank };
  }
  if (updateFields.bin_bank !== undefined && updateFields.bin_bank !== existing.bin_bank) {
    changedFields.push("bin_bank");
    changes.bin_bank = { old: existing.bin_bank, new: updateFields.bin_bank };
  }
  if (updateFields.account_holder !== undefined && updateFields.account_holder !== existing.account_holder) {
    changedFields.push("account_holder");
    changes.account_holder = { old: existing.account_holder, new: updateFields.account_holder };
  }
  if (updateFields.active_supply !== undefined && updateFields.active_supply !== existing.active_supply) {
    changedFields.push("active_supply");
    changes.active_supply = { old: existing.active_supply, new: updateFields.active_supply };
  }

  eventBus.emit(EVENTS.SUPPLIER_UPDATED, {
    id: updated.id,
    supplier_name: updated.supplier_name,
    changed_fields: changedFields,
    changes: changes,
    summary: `Cập nhật nhà cung cấp "${updated.supplier_name}"${changedFields.length > 0 ? ` (${changedFields.join(", ")})` : ""}`,
  });

  return updated;
};

/**
 * Xóa Nhà cung cấp
 */
const deleteSupplier = async (id) => {
  const supplierId = parseInt(id, 10);
  const existing = await db("partner.supplier").where({ id: supplierId }).first();
  if (!existing) {
    throw new Error("Không tìm thấy Nhà cung cấp cần xóa");
  }

  await db("product.supplier_cost").where({ supplier_id: supplierId }).del();
  await db("partner.supplier_order_cost_log").where({ supply_id: supplierId }).del();
  await db("partner.supplier").where({ id: supplierId }).del();

  eventBus.emit(EVENTS.SUPPLIER_DELETED, {
    id: supplierId,
    supplier_name: existing.supplier_name,
    summary: `Đã xóa nhà cung cấp "${existing.supplier_name}" khỏi hệ thống`,
  });

  return { success: true, message: `Đã xóa nhà cung cấp ${existing.supplier_name}` };
};

module.exports = {
  getSuppliersOverview,
  getSupplierCostLogs,
  getSupplierDetailById,
  paySupplierDebt,
  toggleSupplierStatus,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
