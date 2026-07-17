const {
  logger,
  db,
  TABLE,
  COLS,
  ORDER_COLS,
  ADOBE_SYSTEM_CODE,
} = require("@/services/userAccountMappingService/shared");
const {
  getRenewAdobeVariantIds,
  listActiveRenewAdobeOrdersByVariants,
} = require("@/services/userAccountMappingService/queryHelpers");

/**
 * Đồng bộ đơn hàng từ order_list vào user_account_mapping.
 * - Lọc đơn có id_product thuộc product_system với system_code = 'renew_adobe'.
 * - Chỉ xét đơn có status còn hiệu lực.
 * - INSERT những đơn chưa có mapping (adobe_account_id = null, chờ reassign).
 * - Xóa mapping của những đơn đã hết hạn/hủy.
 * @returns {{ inserted: number, removed: number }}
 */
async function syncOrdersToMapping() {
  const variantIds = await getRenewAdobeVariantIds();

  if (variantIds.length === 0) {
    logger.info("[Mapping] Không có variant_id nào cho system_code=%s", ADOBE_SYSTEM_CODE);
    return { inserted: 0, removed: 0 };
  }

  const activeOrders = await listActiveRenewAdobeOrdersByVariants(variantIds);

  // Bước 3: Lấy tất cả id_order hiện có trong mapping
  const existingMappings = await db(TABLE).select(COLS.ORDER_ID);
  const existingOrderIds = new Set(existingMappings.map((r) => r[COLS.ORDER_ID]));

  // Bước 4: INSERT những đơn chưa có mapping
  const toInsert = activeOrders.filter((o) => !existingOrderIds.has(o[ORDER_COLS.ID_ORDER]));
  const now = new Date();
  let inserted = 0;
  for (const order of toInsert) {
    const email = (order[ORDER_COLS.INFORMATION_ORDER] || "").toLowerCase().trim();
    if (!email) continue;
    await db(TABLE)
      .insert({
        [COLS.USER_EMAIL]: email,
        [COLS.ORDER_ID]: order[ORDER_COLS.ID_ORDER],
        [COLS.ADOBE_ACCOUNT_ID]: null,
        [COLS.ASSIGNED_AT]: now,
        [COLS.UPDATED_AT]: now,
      })
      .onConflict([COLS.USER_EMAIL, COLS.ORDER_ID])
      .ignore();
    inserted++;
  }

  // Bước 5: Xóa mapping của đơn không còn trong active list nữa
  const activeOrderIds = activeOrders.map((o) => o[ORDER_COLS.ID_ORDER]);
  let removed = 0;
  if (existingOrderIds.size > 0) {
    const toRemove = [...existingOrderIds].filter((id) => !activeOrderIds.includes(id));
    if (toRemove.length > 0) {
      removed = await db(TABLE).whereIn(COLS.ORDER_ID, toRemove).delete();
    }
  }

  logger.info(
    "[Mapping] Sync xong: inserted=%d, removed=%d, total_active_orders=%d",
    inserted,
    removed,
    activeOrders.length
  );
  return { inserted, removed };
}

module.exports = {
  syncOrdersToMapping,
};
