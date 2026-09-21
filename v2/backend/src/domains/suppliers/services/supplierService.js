const { db, TABLES, COLS } = require("@/db");
const { eventBus, EVENTS } = require("@/events");

const S_COLS = COLS.SUPPLIER;
const LOG_COLS = COLS.SUPPLIER_ORDER_COST_LOG;

/**
 * Lấy dữ liệu 4 Stat Cards & Danh sách BẢNG TỔNG Nhà cung cấp (Tab 1)
 */
const getSuppliersOverview = async ({ search = "", activeFilter = "", sortBy = "priority" } = {}) => {
  let whereClause = "WHERE 1=1";
  const params = [];

  if (search && search.trim()) {
    whereClause += ` AND (s.${S_COLS.SUPPLIER_NAME} ILIKE ? OR s.${S_COLS.NUMBER_BANK} ILIKE ? OR s.${S_COLS.ACCOUNT_HOLDER} ILIKE ?)`;
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  if (activeFilter === "active") {
    whereClause += ` AND s.${S_COLS.ACTIVE_SUPPLY} = true`;
  } else if (activeFilter === "inactive") {
    whereClause += ` AND s.${S_COLS.ACTIVE_SUPPLY} = false`;
  }

  // Chế độ ưu tiên sắp xếp (Sort Priority)
  let orderByClause = `
    ORDER BY
      CASE WHEN s.${S_COLS.ACTIVE_SUPPLY} IS FALSE THEN 0 ELSE 1 END DESC,
      total_debt DESC,
      total_orders DESC,
      total_paid DESC,
      s.${S_COLS.SUPPLIER_NAME} ASC
  `;

  if (sortBy === "debt") {
    orderByClause = `
      ORDER BY
        total_debt DESC,
        CASE WHEN s.${S_COLS.ACTIVE_SUPPLY} IS FALSE THEN 0 ELSE 1 END DESC,
        total_orders DESC,
        total_paid DESC,
        s.${S_COLS.SUPPLIER_NAME} ASC
    `;
  } else if (sortBy === "active") {
    orderByClause = `
      ORDER BY
        CASE WHEN s.${S_COLS.ACTIVE_SUPPLY} IS FALSE THEN 0 ELSE 1 END DESC,
        total_orders DESC,
        total_debt DESC,
        total_paid DESC,
        s.${S_COLS.SUPPLIER_NAME} ASC
    `;
  } else if (sortBy === "paid") {
    orderByClause = `
      ORDER BY
        total_paid DESC,
        total_orders DESC,
        CASE WHEN s.${S_COLS.ACTIVE_SUPPLY} IS FALSE THEN 0 ELSE 1 END DESC,
        total_debt DESC,
        s.${S_COLS.SUPPLIER_NAME} ASC
    `;
  }

  // 1. Top 4 Stat Cards
  const statsQuery = `
    SELECT
      COUNT(l.${LOG_COLS.ID}) AS total_orders,
      COALESCE(SUM(l.${LOG_COLS.IMPORT_COST}), 0) AS total_import_cost,
      COALESCE(SUM(l.${LOG_COLS.REFUND_AMOUNT}), 0) AS total_refund,
      COALESCE(SUM(CASE WHEN l.${LOG_COLS.NCC_PAYMENT_STATUS} = 'Chưa Thanh Toán' THEN (l.${LOG_COLS.IMPORT_COST} - l.${LOG_COLS.REFUND_AMOUNT}) ELSE 0 END), 0) AS total_unpaid_cost
    FROM ${TABLES.SUPPLIER_ORDER_COST_LOG} l;
  `;
  const statsRes = await db.raw(statsQuery);
  const statsRow = statsRes.rows[0] || {};

  // 2. Tab 1 Suppliers List (BẢNG TỔNG)
  const dataSql = `
    SELECT
      s.${S_COLS.ID},
      s.${S_COLS.SUPPLIER_NAME},
      s.${S_COLS.NUMBER_BANK},
      s.${S_COLS.BIN_BANK},
      s.${S_COLS.ACCOUNT_HOLDER},
      s.${S_COLS.ACTIVE_SUPPLY},
      COUNT(l.${LOG_COLS.ID}) AS total_orders,
      COUNT(CASE WHEN l.${LOG_COLS.LOGGED_AT} >= DATE_TRUNC('month', CURRENT_DATE) THEN l.${LOG_COLS.ID} END) AS current_month_orders,
      COALESCE(SUM(CASE WHEN l.${LOG_COLS.LOGGED_AT} >= DATE_TRUNC('month', CURRENT_DATE) THEN l.${LOG_COLS.IMPORT_COST} ELSE 0 END), 0) AS current_month_cost,
      MAX(l.${LOG_COLS.LOGGED_AT}) AS last_order_date,
      COALESCE(SUM(CASE WHEN l.${LOG_COLS.NCC_PAYMENT_STATUS} = 'Đã Thanh Toán' THEN (l.${LOG_COLS.IMPORT_COST} - l.${LOG_COLS.REFUND_AMOUNT}) ELSE 0 END), 0) AS total_paid,
      COALESCE(SUM(CASE WHEN l.${LOG_COLS.NCC_PAYMENT_STATUS} = 'Chưa Thanh Toán' THEN (l.${LOG_COLS.IMPORT_COST} - l.${LOG_COLS.REFUND_AMOUNT}) ELSE 0 END), 0) AS total_debt
    FROM ${TABLES.SUPPLIER} s
    LEFT JOIN ${TABLES.SUPPLIER_ORDER_COST_LOG} l ON l.${LOG_COLS.SUPPLY_ID} = s.${S_COLS.ID}
    ${whereClause}
    GROUP BY s.${S_COLS.ID}, s.${S_COLS.SUPPLIER_NAME}, s.${S_COLS.NUMBER_BANK}, s.${S_COLS.BIN_BANK}, s.${S_COLS.ACCOUNT_HOLDER}, s.${S_COLS.ACTIVE_SUPPLY}
    ${orderByClause};
  `;

  const dataRes = await db.raw(dataSql, params);

  const suppliers = (dataRes.rows || []).map((row) => ({
    id: row[S_COLS.ID],
    supplier_name: row[S_COLS.SUPPLIER_NAME] || "Chưa có tên",
    number_bank: row[S_COLS.NUMBER_BANK] || "",
    bin_bank: row[S_COLS.BIN_BANK] || "",
    account_holder: row[S_COLS.ACCOUNT_HOLDER] || "",
    active_supply: row[S_COLS.ACTIVE_SUPPLY] !== false,
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
    whereClause += ` AND l.${LOG_COLS.SUPPLY_ID} = ?`;
    params.push(parseInt(supplierId, 10));
  }

  if (orderCodeSearch && orderCodeSearch.trim()) {
    whereClause += ` AND l.${LOG_COLS.ID_ORDER} ILIKE ?`;
    params.push(`%${orderCodeSearch.trim()}%`);
  }

  const countSql = `
    SELECT COUNT(*) AS total
    FROM ${TABLES.SUPPLIER_ORDER_COST_LOG} l
    ${whereClause}
  `;
  const countRes = await db.raw(countSql, params);
  const total = parseInt(countRes.rows[0]?.total || 0, 10);
  const totalPages = Math.ceil(total / limitNum) || 1;

  const dataSql = `
    SELECT
      l.${LOG_COLS.ID},
      l.${LOG_COLS.ORDER_LIST_ID},
      l.${LOG_COLS.SUPPLY_ID},
      l.${LOG_COLS.ID_ORDER},
      COALESCE(l.${LOG_COLS.IMPORT_COST}, 0) AS import_cost,
      COALESCE(l.${LOG_COLS.REFUND_AMOUNT}, 0) AS refund_amount,
      COALESCE(l.${LOG_COLS.NCC_PAYMENT_STATUS}, 'Chưa Thanh Toán') AS ncc_payment_status,
      l.${LOG_COLS.LOGGED_AT},
      s.${S_COLS.SUPPLIER_NAME}
    FROM ${TABLES.SUPPLIER_ORDER_COST_LOG} l
    JOIN ${TABLES.SUPPLIER} s ON s.${S_COLS.ID} = l.${LOG_COLS.SUPPLY_ID}
    ${whereClause}
    ORDER BY l.${LOG_COLS.LOGGED_AT} DESC, l.${LOG_COLS.ID} DESC
    LIMIT ? OFFSET ?
  `;

  const dataRes = await db.raw(dataSql, [...params, limitNum, offset]);

  const logs = (dataRes.rows || []).map((r) => ({
    id: r[LOG_COLS.ID],
    order_list_id: r[LOG_COLS.ORDER_LIST_ID],
    supply_id: r[LOG_COLS.SUPPLY_ID],
    id_order: r[LOG_COLS.ID_ORDER],
    supplier_name: r[S_COLS.SUPPLIER_NAME] || "N/A",
    import_cost: parseFloat(r.import_cost || 0),
    refund_amount: parseFloat(r.refund_amount || 0),
    ncc_payment_status: r.ncc_payment_status,
    logged_at: r[LOG_COLS.LOGGED_AT],
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
  const supplier = await db(TABLES.SUPPLIER).where({ [S_COLS.ID]: supplierId }).first();
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
  const bankName = bankMap[supplier[S_COLS.BIN_BANK]] || supplier[S_COLS.BIN_BANK] || "VPBank";

  // Thống kê đơn & công nợ
  const statsRes = await db.raw(`
    SELECT
      COUNT(${LOG_COLS.ID}) AS total_orders,
      COUNT(CASE WHEN ${LOG_COLS.NCC_PAYMENT_STATUS} = 'Đã Thanh Toán' THEN 1 END) AS paid_orders,
      COUNT(CASE WHEN ${LOG_COLS.NCC_PAYMENT_STATUS} = 'Chưa Thanh Toán' THEN 1 END) AS unpaid_orders,
      COUNT(CASE WHEN ${LOG_COLS.NCC_PAYMENT_STATUS} = 'Đã Hủy' OR ${LOG_COLS.NCC_PAYMENT_STATUS} = 'Hủy' THEN 1 END) AS canceled_orders,
      COALESCE(SUM(CASE WHEN ${LOG_COLS.NCC_PAYMENT_STATUS} = 'Đã Thanh Toán' THEN (${LOG_COLS.IMPORT_COST} - ${LOG_COLS.REFUND_AMOUNT}) ELSE 0 END), 0) AS total_paid,
      COALESCE(SUM(CASE WHEN ${LOG_COLS.NCC_PAYMENT_STATUS} = 'Chưa Thanh Toán' THEN (${LOG_COLS.IMPORT_COST} - ${LOG_COLS.REFUND_AMOUNT}) ELSE 0 END), 0) AS remaining_debt,
      COALESCE(SUM(${LOG_COLS.REFUND_AMOUNT}), 0) AS total_refund
    FROM ${TABLES.SUPPLIER_ORDER_COST_LOG}
    WHERE ${LOG_COLS.SUPPLY_ID} = ?;
  `, [supplierId]);

  const sRow = statsRes.rows[0] || {};
  const remainingDebt = parseFloat(sRow.remaining_debt || 0);
  const totalPaid = parseFloat(sRow.total_paid || 0);
  const totalRefund = parseFloat(sRow.total_refund || 0);
  const unpaidOrdersCount = parseInt(sRow.unpaid_orders || 0, 10);

  // Phân tích đơn theo tháng
  const monthlyRes = await db.raw(`
    SELECT
      EXTRACT(MONTH FROM ${LOG_COLS.LOGGED_AT}) AS month_num,
      COUNT(${LOG_COLS.ID}) AS order_count
    FROM ${TABLES.SUPPLIER_ORDER_COST_LOG}
    WHERE ${LOG_COLS.SUPPLY_ID} = ?
    GROUP BY month_num
    ORDER BY month_num ASC;
  `, [supplierId]);

  const monthlyOrders = (monthlyRes.rows || []).map((m) => ({
    month: `Tháng ${parseInt(m.month_num, 10)}`,
    count: parseInt(m.order_count, 10),
  }));

  // VietQR URL
  const bin = supplier[S_COLS.BIN_BANK] || "970422";
  const accNum = supplier[S_COLS.NUMBER_BANK] || "";
  const accName = supplier[S_COLS.ACCOUNT_HOLDER] || supplier[S_COLS.SUPPLIER_NAME];
  const addInfo = `${supplier[S_COLS.SUPPLIER_NAME]} thanh toan cong no`;
  const vietqrUrl = accNum
    ? `https://img.vietqr.io/image/${bin}-${accNum}-compact2.png?amount=${remainingDebt}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accName)}`
    : null;

  return {
    general_info: {
      id: supplier[S_COLS.ID],
      supplier_name: supplier[S_COLS.SUPPLIER_NAME],
      bank_name: bankName,
      number_bank: supplier[S_COLS.NUMBER_BANK] || "",
      bin_bank: supplier[S_COLS.BIN_BANK] || "",
      account_holder: supplier[S_COLS.ACCOUNT_HOLDER] || "",
      active_supply: Boolean(supplier[S_COLS.ACTIVE_SUPPLY]),
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
  const supplier = await db(TABLES.SUPPLIER).where({ [S_COLS.ID]: supplierId }).first();
  if (!supplier) throw new Error("Không tìm thấy Nhà cung cấp");

  // Đổi ncc_payment_status của tất cả đơn 'Chưa Thanh Toán' sang 'Đã Thanh Toán'
  await db(TABLES.SUPPLIER_ORDER_COST_LOG)
    .where({ [LOG_COLS.SUPPLY_ID]: supplierId, [LOG_COLS.NCC_PAYMENT_STATUS]: "Chưa Thanh Toán" })
    .update({ [LOG_COLS.NCC_PAYMENT_STATUS]: "Đã Thanh Toán" });

  eventBus.emit(EVENTS.SUPPLIER_DEBT_PAID, {
    id: supplierId,
    supplier_name: supplier[S_COLS.SUPPLIER_NAME],
    summary: `Đã thanh toán công nợ cho nhà cung cấp "${supplier[S_COLS.SUPPLIER_NAME]}"`,
  });

  return { success: true, message: `Đã cập nhật thanh toán công nợ cho NCC ${supplier[S_COLS.SUPPLIER_NAME]}` };
};

/**
 * Toggle trạng thái hoạt động NCC (Bật/Tắt Power)
 */
const toggleSupplierStatus = async (id) => {
  const supplierId = parseInt(id, 10);
  const existing = await db(TABLES.SUPPLIER).where({ [S_COLS.ID]: supplierId }).first();
  if (!existing) throw new Error("Không tìm thấy Nhà cung cấp");

  const newStatus = !existing[S_COLS.ACTIVE_SUPPLY];
  await db(TABLES.SUPPLIER).where({ [S_COLS.ID]: supplierId }).update({ [S_COLS.ACTIVE_SUPPLY]: newStatus });

  eventBus.emit(EVENTS.SUPPLIER_STATUS_TOGGLED, {
    id: supplierId,
    supplier_name: existing[S_COLS.SUPPLIER_NAME],
    previous_status: existing[S_COLS.ACTIVE_SUPPLY],
    new_status: newStatus,
    summary: `Đã ${newStatus ? "kích hoạt" : "ngưng"} hợp tác với nhà cung cấp "${existing[S_COLS.SUPPLIER_NAME]}"`,
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

  const [inserted] = await db(TABLES.SUPPLIER)
    .insert({
      [S_COLS.SUPPLIER_NAME]: supplier_name.trim(),
      [S_COLS.NUMBER_BANK]: number_bank ? number_bank.trim() : null,
      [S_COLS.BIN_BANK]: bin_bank ? bin_bank.trim() : null,
      [S_COLS.ACCOUNT_HOLDER]: account_holder ? account_holder.trim() : null,
      [S_COLS.ACTIVE_SUPPLY]: active_supply ?? true,
    })
    .returning("*");

  eventBus.emit(EVENTS.SUPPLIER_CREATED, {
    id: inserted[S_COLS.ID],
    supplier_name: inserted[S_COLS.SUPPLIER_NAME],
    number_bank: inserted[S_COLS.NUMBER_BANK],
    bin_bank: inserted[S_COLS.BIN_BANK],
    account_holder: inserted[S_COLS.ACCOUNT_HOLDER],
    active_supply: inserted[S_COLS.ACTIVE_SUPPLY],
    summary: `Thêm mới nhà cung cấp "${inserted[S_COLS.SUPPLIER_NAME]}"`,
  });

  return inserted;
};

/**
 * Cập nhật Nhà cung cấp
 */
const updateSupplier = async (id, data) => {
  const supplierId = parseInt(id, 10);
  const existing = await db(TABLES.SUPPLIER).where({ [S_COLS.ID]: supplierId }).first();
  if (!existing) {
    throw new Error("Không tìm thấy Nhà cung cấp cần sửa");
  }

  const updateFields = {};
  if (data.supplier_name !== undefined) updateFields[S_COLS.SUPPLIER_NAME] = data.supplier_name.trim();
  if (data.number_bank !== undefined) updateFields[S_COLS.NUMBER_BANK] = data.number_bank ? data.number_bank.trim() : null;
  if (data.bin_bank !== undefined) updateFields[S_COLS.BIN_BANK] = data.bin_bank ? data.bin_bank.trim() : null;
  if (data.account_holder !== undefined) updateFields[S_COLS.ACCOUNT_HOLDER] = data.account_holder ? data.account_holder.trim() : null;
  if (data.active_supply !== undefined) updateFields[S_COLS.ACTIVE_SUPPLY] = Boolean(data.active_supply);

  const [updated] = await db(TABLES.SUPPLIER)
    .where({ [S_COLS.ID]: supplierId })
    .update(updateFields)
    .returning("*");

  const changedFields = [];
  const changes = {};

  if (updateFields[S_COLS.SUPPLIER_NAME] !== undefined && updateFields[S_COLS.SUPPLIER_NAME] !== existing[S_COLS.SUPPLIER_NAME]) {
    changedFields.push("supplier_name");
    changes.supplier_name = { old: existing[S_COLS.SUPPLIER_NAME], new: updateFields[S_COLS.SUPPLIER_NAME] };
  }
  if (updateFields[S_COLS.NUMBER_BANK] !== undefined && updateFields[S_COLS.NUMBER_BANK] !== existing[S_COLS.NUMBER_BANK]) {
    changedFields.push("number_bank");
    changes.number_bank = { old: existing[S_COLS.NUMBER_BANK], new: updateFields[S_COLS.NUMBER_BANK] };
  }
  if (updateFields[S_COLS.BIN_BANK] !== undefined && updateFields[S_COLS.BIN_BANK] !== existing[S_COLS.BIN_BANK]) {
    changedFields.push("bin_bank");
    changes.bin_bank = { old: existing[S_COLS.BIN_BANK], new: updateFields[S_COLS.BIN_BANK] };
  }
  if (updateFields[S_COLS.ACCOUNT_HOLDER] !== undefined && updateFields[S_COLS.ACCOUNT_HOLDER] !== existing[S_COLS.ACCOUNT_HOLDER]) {
    changedFields.push("account_holder");
    changes.account_holder = { old: existing[S_COLS.ACCOUNT_HOLDER], new: updateFields[S_COLS.ACCOUNT_HOLDER] };
  }
  if (updateFields[S_COLS.ACTIVE_SUPPLY] !== undefined && updateFields[S_COLS.ACTIVE_SUPPLY] !== existing[S_COLS.ACTIVE_SUPPLY]) {
    changedFields.push("active_supply");
    changes.active_supply = { old: existing[S_COLS.ACTIVE_SUPPLY], new: updateFields[S_COLS.ACTIVE_SUPPLY] };
  }

  eventBus.emit(EVENTS.SUPPLIER_UPDATED, {
    id: updated[S_COLS.ID],
    supplier_name: updated[S_COLS.SUPPLIER_NAME],
    changed_fields: changedFields,
    changes: changes,
    summary: `Cập nhật nhà cung cấp "${updated[S_COLS.SUPPLIER_NAME]}"${changedFields.length > 0 ? ` (${changedFields.join(", ")})` : ""}`,
  });

  return updated;
};

/**
 * Xóa Nhà cung cấp
 */
const deleteSupplier = async (id) => {
  const supplierId = parseInt(id, 10);
  const existing = await db(TABLES.SUPPLIER).where({ [S_COLS.ID]: supplierId }).first();
  if (!existing) {
    throw new Error("Không tìm thấy Nhà cung cấp cần xóa");
  }

  await db(TABLES.SUPPLIER_COST).where({ supplier_id: supplierId }).del();
  await db(TABLES.SUPPLIER_ORDER_COST_LOG).where({ supply_id: supplierId }).del();
  await db(TABLES.SUPPLIER).where({ [S_COLS.ID]: supplierId }).del();

  eventBus.emit(EVENTS.SUPPLIER_DELETED, {
    id: supplierId,
    supplier_name: existing[S_COLS.SUPPLIER_NAME],
    summary: `Đã xóa nhà cung cấp "${existing[S_COLS.SUPPLIER_NAME]}" khỏi hệ thống`,
  });

  return { success: true, message: `Đã xóa nhà cung cấp ${existing[S_COLS.SUPPLIER_NAME]}` };
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
