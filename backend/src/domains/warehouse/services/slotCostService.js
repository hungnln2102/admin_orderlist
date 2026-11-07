/**
 * slotCostService.js
 * Quản lý tính toán và ghi nhận chi phí phân bổ slot trống hàng ngày cho Kho Gói Sản Phẩm.
 *
 * Nguyên tắc:
 * 1. Đơn hàng nhập hàng (MAVN...) có mặt trong Kho Gói Sản Phẩm (warehouse.package_products).
 * 2. Phân bổ giá vốn nhập theo chu kỳ ngày và số lượng slot:
 *    cost_per_slot_day = cost / (total_slots * days)
 * 3. Mỗi ngày qua 0h, đếm số slot chưa có khách thuê:
 *    vacant_slots = max(0, total_slots - occupied_slots)
 *    vacant_cost = vacant_slots * cost_per_slot_day
 * 4. Ghi nhận vào warehouse.package_slot_daily_logs và trừ lợi nhuận ngày qua daily_revenue_summary.
 */
const { db, TABLES } = require("@/db");
const { getVietnamDateString } = require("@/utils/time");
const { syncSlotCostFinanceDelta } = require("./slotCostFinanceSyncService");
const { persistDailySlotCostLogs } = require("./slotCostPersistenceService");

const toNumber = (val) => {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Tính toán chi phí slot trống cho một ngày cụ thể (chuẩn YYYY-MM-DD, UTC+7)
 * Đảm bảo tính toán Idempotent (chạy lại không bị cộng dồn trùng lặp).
 */
async function calculateDailySlotCosts(targetDateStr, { dryRun = false } = {}) {
  const dateStr = getVietnamDateString(targetDateStr || new Date());

  // 1. Lấy tất cả các gói trong Kho Gói Sản Phẩm có đơn nhập MAVN đang còn hiệu lực tại ngày dateStr
  // Chỉ xét đơn nhập hàng có cost > 0 và trạng thái không bị hủy
  const rawPackages = await db(TABLES.PACKAGE_PRODUCT + " as pp")
    .join(TABLES.PRODUCT_KEYS + " as acc", "pp.account_id", "acc.id")
    .leftJoin(TABLES.PRODUCT_NAMES + " as pn", "pp.product_name_id", "pn.id")
    .join(TABLES.ORDER_LIST + " as o", function () {
      this.on(db.raw("LOWER(TRIM(o.information_order)) = LOWER(TRIM(acc.account_username))"))
        .andOn("o.id_order", "ilike", db.raw("'MAVN%'"))
        .andOn(db.raw("o.cost > 0"))
        .andOn(db.raw("o.order_date::date <= ?::date", [dateStr]))
        .andOn(
          db.raw(
            "(o.expired_at IS NULL OR o.expired_at::date >= ?::date)",
            [dateStr]
          )
        )
        .andOn(
          db.raw(
            "LOWER(COALESCE(o.status, '')) NOT IN ('cancel', 'canceled', 'đã hủy')"
          )
        );
    })
    .select(
      "pp.id as package_id",
      "pp.package_name",
      "pp.slot as total_slots",
      "pp.match_rule",
      "pn.id as product_name_id",
      "pn.name as catalog_name",
      "pn.product_id as category_product_id",
      "acc.id as account_id",
      "acc.account_username",
      "o.id as import_order_id",
      "o.id_order as import_order_code",
      "o.cost as import_cost",
      "o.days as import_days",
      "o.order_date as import_order_date",
      "o.expired_at as import_expired_at",
      "o.status as import_status"
    )
    .orderBy("pp.id", "asc")
    .orderBy("o.id", "desc");

  // Loại bỏ trùng lặp nếu 1 gói có nhiều đơn MAVN chồng chéo ngày (chỉ lấy đơn nhập mới nhất)
  const packageMap = new Map();
  for (const row of rawPackages) {
    if (!packageMap.has(row.package_id)) {
      packageMap.set(row.package_id, row);
    }
  }
  const activePackages = Array.from(packageMap.values());

  if (activePackages.length === 0) {
    return {
      date: dateStr,
      totalPackages: 0,
      totalVacantSlots: 0,
      totalVacantCost: 0,
      logs: [],
    };
  }

  // 2. Thu thập danh sách email tài khoản cần kiểm tra đơn khách thuê
  const targetAccounts = Array.from(
    new Set(activePackages.map((p) => p.account_username.trim().toLowerCase()))
  );

  // Lấy các đơn khách hàng (non-MAVN) đang active tại ngày dateStr khớp với các tài khoản trên
  const customerOrders = await db(TABLES.ORDER_LIST + " as cust")
    .leftJoin(TABLES.VARIANT + " as v", "v.id", db.raw("CAST(cust.id_product AS BIGINT)"))
    .whereNot("cust.id_order", "ilike", "MAVN%")
    .whereRaw("LOWER(COALESCE(cust.customer, '')) != 'mavryk'")
    .whereIn("cust.status", [
      "PAID",
      "RENEW_REQUIRED",
      "Đã Thanh Toán",
      "Cần Gia Hạn",
    ])
    .whereRaw("(cust.order_date IS NULL OR cust.order_date::date <= ?::date)", [dateStr])
    .whereRaw("(cust.expired_at IS NULL OR cust.expired_at::date >= ?::date)", [dateStr])
    .where((builder) => {
      targetAccounts.forEach((acc) => {
        builder.orWhereILike("cust.information_order", `%${acc}%`);
        builder.orWhereRaw("CAST(cust.slot AS TEXT) ILIKE ?", [`%${acc}%`]);
      });
    })
    .select(
      "cust.id",
      "cust.id_order",
      "cust.customer",
      "cust.information_order",
      "cust.slot",
      "cust.status",
      "cust.order_date",
      "cust.expired_at",
      "cust.id_product",
      "v.product_id as variant_product_id"
    );

  // 3. Tính toán cho từng gói
  const calculatedLogs = [];
  let totalVacantSlotsAll = 0;
  let totalVacantCostAll = 0;

  for (const pkg of activePackages) {
    const accUser = (pkg.account_username || "").trim().toLowerCase();
    const matchRule = (pkg.match_rule || "information").toLowerCase();
    const totalSlots = Math.max(1, parseInt(pkg.total_slots || 1, 10));
    const importDays = Math.max(1, parseInt(pkg.import_days || 30, 10));
    const importCost = toNumber(pkg.import_cost);

    // Tính chi phí vốn 1 slot / ngày
    const costPerSlotDay = Math.round((importCost / (totalSlots * importDays)) * 100) / 100;

    // Lọc các đơn khách hàng match với gói này
    const matchedCustomerOrders = customerOrders.filter((ord) => {
      // Kiểm tra sản phẩm hệ thống (nếu gói có liên kết product_id)
      if (pkg.category_product_id && ord.variant_product_id) {
        if (Number(pkg.category_product_id) !== Number(ord.variant_product_id)) {
          return false;
        }
      }

      const infoLower = String(ord.information_order || "").toLowerCase();
      const slotLower = String(ord.slot || "").toLowerCase();

      if (matchRule === "slot") {
        return slotLower.includes(accUser);
      }
      if (matchRule === "both") {
        return infoLower.includes(accUser) || slotLower.includes(accUser);
      }
      // default: information
      return infoLower.includes(accUser);
    });

    const occupiedSlots = Math.min(totalSlots, matchedCustomerOrders.length);
    const vacantSlots = Math.max(0, totalSlots - occupiedSlots);
    const vacantCost = Math.round(vacantSlots * costPerSlotDay * 100) / 100;

    totalVacantSlotsAll += vacantSlots;
    totalVacantCostAll += vacantCost;

    calculatedLogs.push({
      log_date: dateStr,
      package_product_id: pkg.package_id,
      import_order_id: pkg.import_order_id,
      import_order_code: pkg.import_order_code,
      account_username: pkg.account_username,
      total_slots: totalSlots,
      occupied_slots: occupiedSlots,
      vacant_slots: vacantSlots,
      cost_per_slot_day: costPerSlotDay,
      vacant_cost: vacantCost,
      note: `Gói ${pkg.package_name} (#${pkg.package_id}): ${occupiedSlots}/${totalSlots} slot đã thuê, ${vacantSlots} slot trống.`,
      metadata: JSON.stringify({
        import_cost: importCost,
        import_days: importDays,
        matched_order_codes: matchedCustomerOrders.map((o) => o.id_order),
      }),
    });
  }

  if (dryRun) {
    return {
      date: dateStr,
      dryRun: true,
      totalPackages: activePackages.length,
      totalVacantSlots: totalVacantSlotsAll,
      totalVacantCost: totalVacantCostAll,
      logs: calculatedLogs,
    };
  }

  // 4. Persist logs atomically and calculate the committed finance delta.
  const { costDelta } = await persistDailySlotCostLogs({
    date: dateStr,
    logs: calculatedLogs,
    totalVacantCost: totalVacantCostAll,
  });


  // 5. Đồng bộ delta đã commit sang tổng hợp P&L và notification.
  await syncSlotCostFinanceDelta({
    date: dateStr,
    costDelta,
    totalVacantSlots: totalVacantSlotsAll,
    totalVacantCost: totalVacantCostAll,
  });
  return {
    date: dateStr,
    totalPackages: activePackages.length,
    totalVacantSlots: totalVacantSlotsAll,
    totalVacantCost: totalVacantCostAll,
    costDelta,
    logsCount: calculatedLogs.length,
  };
}

/**
 * Hồi tố (Backfill) chi phí slot trống từ một ngày trong quá khứ đến ngày hiện tại
 */
module.exports = {
  calculateDailySlotCosts,
};

