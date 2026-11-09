const { db, TABLES, COLS, withTransaction } = require("@/db");
const { eventBus, EVENTS } = require("@/events");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { getVietnamDateString } = require("@/utils/time");

const V_COLS = COLS.VARIANT;
const VP_COLS = COLS.VARIANT_PRICE;
const SC_COLS = COLS.SUPPLIER_COST;
const S_COLS = COLS.SUPPLIER;
const P_COLS = COLS.PRODUCT;
const O_COLS = COLS.ORDER_LIST;

/**
 * Service lấy danh sách giá sản phẩm (Bảng giá Niêm yết)
 * Bao gồm Giá Gốc, Giá Bán Lẻ, Giá CTV, Giá Sinh Viên, Giá Khuyến Mãi & % Lợi Nhuận
 */
const getProductPrices = async ({ page = 1, limit = 15, search = "", activeOnly = false, status = "all" } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(1000, parseInt(limit, 10) || 15));
  const offset = (pageNum - 1) * limitNum;

  let whereClause = "WHERE 1=1";
  const params = [];

  // Lọc theo trạng thái hoạt động (Tabs: all | active | inactive)
  if (activeOnly || status === "active") {
    whereClause += ` AND v.${V_COLS.IS_ACTIVE} = true`;
  } else if (status === "inactive") {
    whereClause += ` AND (v.${V_COLS.IS_ACTIVE} = false OR v.${V_COLS.IS_ACTIVE} IS NULL)`;
  }

  if (search && search.trim()) {
    whereClause += ` AND (v.${V_COLS.DISPLAY_NAME} ILIKE ? OR v.${V_COLS.VARIANT_NAME} ILIKE ?)`;
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  const countSql = `
    SELECT COUNT(*) AS total
    FROM ${TABLES.VARIANT} v
    ${whereClause}
  `;

  const dataSql = `
    SELECT
      v.${V_COLS.ID},
      v.${V_COLS.DISPLAY_NAME} AS san_pham,
      v.${V_COLS.VARIANT_NAME} AS package_product,
      p.${P_COLS.PACKAGE_NAME} AS parent_package_name,
      v.${V_COLS.BASE_PRICE},
      v.${V_COLS.IS_ACTIVE},
      COALESCE(p_retail.${VP_COLS.PRICE}, v.${V_COLS.BASE_PRICE}, 0) AS retail_price,
      COALESCE(p_ctv.${VP_COLS.PRICE}, 0) AS ctv_price,
      COALESCE(p_student.${VP_COLS.PRICE}, 0) AS student_price,
      COALESCE(p_promo.${VP_COLS.PRICE}, 0) AS promo_price,
      p_retail.${VP_COLS.MARGIN_RATIO} AS retail_margin_ratio,
      p_ctv.${VP_COLS.MARGIN_RATIO} AS ctv_margin_ratio,
      sc.min_cost AS supplier_min_cost,
      COALESCE(v.${V_COLS.COUNT}, 0) AS count,
      v.${V_COLS.UPDATED_AT}
    FROM ${TABLES.VARIANT} v
    LEFT JOIN ${TABLES.PRODUCT} p ON p.${P_COLS.ID} = v.${V_COLS.PRODUCT_ID}
    LEFT JOIN ${TABLES.VARIANT_PRICE} p_retail ON p_retail.${VP_COLS.VARIANT_ID} = v.${V_COLS.ID} AND p_retail.${VP_COLS.TIER_ID} = 2
    LEFT JOIN ${TABLES.VARIANT_PRICE} p_ctv ON p_ctv.${VP_COLS.VARIANT_ID} = v.${V_COLS.ID} AND p_ctv.${VP_COLS.TIER_ID} = 1
    LEFT JOIN ${TABLES.VARIANT_PRICE} p_student ON p_student.${VP_COLS.VARIANT_ID} = v.${V_COLS.ID} AND p_student.${VP_COLS.TIER_ID} = 4
    LEFT JOIN ${TABLES.VARIANT_PRICE} p_promo ON p_promo.${VP_COLS.VARIANT_ID} = v.${V_COLS.ID} AND p_promo.${VP_COLS.TIER_ID} = 3
    LEFT JOIN LATERAL (
      SELECT MIN(${SC_COLS.PRICE}) AS min_cost
      FROM ${TABLES.SUPPLIER_COST}
      WHERE ${SC_COLS.VARIANT_ID} = v.${V_COLS.ID} AND ${SC_COLS.PRICE} > 0
    ) sc ON true
    ${whereClause}
    ORDER BY v.${V_COLS.IS_ACTIVE} DESC, COALESCE(p.${P_COLS.PACKAGE_NAME}, v.${V_COLS.DISPLAY_NAME}) ASC, v.${V_COLS.DISPLAY_NAME} ASC
    LIMIT ? OFFSET ?
  `;

  const statsSql = `
    SELECT
      COUNT(*) AS total_count,
      COUNT(*) FILTER (WHERE ${V_COLS.IS_ACTIVE} = true) AS active_count,
      COUNT(*) FILTER (WHERE ${V_COLS.IS_ACTIVE} = false OR ${V_COLS.IS_ACTIVE} IS NULL) AS inactive_count
    FROM ${TABLES.VARIANT}
  `;

  const [countRes, statsRes, dataRes] = await Promise.all([
    db.raw(countSql, params),
    db.raw(statsSql),
    db.raw(dataSql, [...params, limitNum, offset]),
  ]);

  const total = parseInt(countRes.rows[0]?.total || 0, 10);
  const totalPages = Math.ceil(total / limitNum) || 1;
  const counts = {
    total: parseInt(statsRes.rows[0]?.total_count || 0, 10),
    active: parseInt(statsRes.rows[0]?.active_count || 0, 10),
    inactive: parseInt(statsRes.rows[0]?.inactive_count || 0, 10),
  };

  const formattedData = (dataRes.rows || []).map((r) => {
    const retailPrice = parseFloat(r.retail_price || 0);
    const ctvPrice = parseFloat(r.ctv_price || 0);
    const studentPrice = parseFloat(r.student_price || 0);
    const promoPrice = parseFloat(r.promo_price || 0);
    const basePrice = parseFloat(r.base_price || 0);
    const supplierMinCost =
      r.supplier_min_cost !== null && r.supplier_min_cost !== undefined
        ? parseFloat(r.supplier_min_cost)
        : 0;
    const costPrice = supplierMinCost > 0 ? supplierMinCost : (basePrice > 0 ? basePrice : 0);

    let minProfitAmount = 0;
    let maxProfitAmount = 0;
    let minMarginPct = 0;
    let maxMarginPct = 0;

    if (costPrice > 0) {
      minProfitAmount = ctvPrice > 0 ? ctvPrice - costPrice : 0;
      maxProfitAmount = retailPrice > 0 ? retailPrice - costPrice : 0;
      minMarginPct = ctvPrice > 0 ? ((ctvPrice - costPrice) / ctvPrice) * 100 : 0;
      maxMarginPct = retailPrice > 0 ? ((retailPrice - costPrice) / retailPrice) * 100 : 0;
    } else {
      // Khi chưa có giá vốn NCC và base_price = 0, fallback theo margin_ratio định sẵn
      const ctvRatio =
        r.ctv_margin_ratio !== null && r.ctv_margin_ratio !== undefined
          ? parseFloat(r.ctv_margin_ratio)
          : null;
      const retailRatio =
        r.retail_margin_ratio !== null && r.retail_margin_ratio !== undefined
          ? parseFloat(r.retail_margin_ratio)
          : null;

      if (ctvRatio !== null) {
        minMarginPct = ctvRatio * 100;
      } else if (ctvPrice > 0 && retailPrice > 0) {
        minMarginPct = ((retailPrice - ctvPrice) / retailPrice) * 100;
      }

      if (retailRatio !== null) {
        maxMarginPct = retailRatio * 100;
      } else {
        maxMarginPct = minMarginPct;
      }

      minProfitAmount = ctvPrice > 0 ? ctvPrice * (minMarginPct / 100) : 0;
      maxProfitAmount = retailPrice > 0 ? retailPrice * (maxMarginPct / 100) : 0;
    }

    let marginStr = "0.0%";
    if (minMarginPct !== 0 || maxMarginPct !== 0) {
      if (Math.abs(minMarginPct - maxMarginPct) < 0.1) {
        marginStr = `${minMarginPct.toFixed(1)}%`;
      } else {
        marginStr = `${minMarginPct.toFixed(1)}% - ${maxMarginPct.toFixed(1)}%`;
      }
    }

    return {
      id: r.id,
      san_pham: r.san_pham || r.package_product || "N/A",
      package_product: r.package_product || "",
      base_price: basePrice,
      cost_price: costPrice,
      retail_price: retailPrice,
      ctv_price: ctvPrice,
      student_price: studentPrice,
      promo_price: promoPrice,
      min_margin_pct: parseFloat(minMarginPct.toFixed(1)),
      max_margin_pct: parseFloat(maxMarginPct.toFixed(1)),
      min_profit_amount: Math.round(minProfitAmount),
      max_profit_amount: Math.round(maxProfitAmount),
      margin: marginStr,
      count: parseInt(r.count || 0, 10),
      is_active: Boolean(r.is_active),
      updated_at: r.updated_at,
    };
  });

  return {
    data: formattedData,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
    counts,
  };
};

/**
 * Lấy danh sách Nhà Cung Cấp (NCC) và giá nhập cho 1 biến thể sản phẩm
 */
const getSuppliersForVariant = async (variantId) => {
  const parsedId = parseInt(variantId, 10);
  if (!parsedId || parsedId <= 0) return [];

  const query = `
    SELECT
      sc.${SC_COLS.ID} AS supplier_cost_id,
      sc.${SC_COLS.VARIANT_ID},
      sc.${SC_COLS.SUPPLIER_ID},
      s.${S_COLS.SUPPLIER_NAME} AS ncc_name,
      s.${S_COLS.NUMBER_BANK},
      COALESCE(sc.${SC_COLS.PRICE}, 0) AS gia_nhap,
      sc.${SC_COLS.UPDATED_AT}
    FROM ${TABLES.SUPPLIER_COST} sc
    JOIN ${TABLES.SUPPLIER} s ON s.${S_COLS.ID} = sc.${SC_COLS.SUPPLIER_ID}
    WHERE sc.${SC_COLS.VARIANT_ID} = ?
    ORDER BY sc.${SC_COLS.PRICE} ASC, s.${S_COLS.SUPPLIER_NAME} ASC;
  `;

  const result = await db.raw(query, [parsedId]);
  return (result.rows || []).map((r) => ({
    id: r.supplier_cost_id,
    variant_id: r[SC_COLS.VARIANT_ID],
    supplier_id: r[SC_COLS.SUPPLIER_ID],
    supplier_name: r.ncc_name || "N/A",
    ncc_name: r.ncc_name || "N/A",
    number_bank: r[S_COLS.NUMBER_BANK] || "",
    price: parseFloat(r.gia_nhap || 0),
    gia_nhap: parseFloat(r.gia_nhap || 0),
    updated_at: r[SC_COLS.UPDATED_AT],
  }));
};

/**
 * Lấy danh mục tất cả Nhà Cung Cấp (Dropdown selection)
 */
const getAllSuppliersList = async () => {
  const query = `
    SELECT ${S_COLS.ID}, ${S_COLS.SUPPLIER_NAME} AS ncc_name, ${S_COLS.NUMBER_BANK}
    FROM ${TABLES.SUPPLIER}
    ORDER BY ${S_COLS.SUPPLIER_NAME} ASC;
  `;
  const result = await db.raw(query);
  return (result.rows || []).map((r) => ({
    id: Number(r[S_COLS.ID]),
    supplier_name: r.ncc_name || "N/A",
    ncc_name: r.ncc_name || "N/A",
    number_bank: r[S_COLS.NUMBER_BANK] || "",
  }));
};

/**
 * Thêm mới Sản phẩm & Bảng giá (Event: PRODUCT_CREATED)
 */
const createProduct = async (data) => {
  const {
    san_pham,
    package_product,
    base_price = 0,
    retail_price = 0,
    ctv_price = 0,
    student_price = 0,
    promo_price = 0,
    is_active = true,
  } = data;

  const displayName = san_pham || package_product;
  const variantName = package_product || san_pham;

  // Tim hoac tao product_id trong catalog product
  let catalogProduct = await db(TABLES.PRODUCT)
    .whereRaw(`LOWER(${P_COLS.PACKAGE_NAME}) = LOWER(?)`, [variantName || displayName])
    .first();

  if (!catalogProduct) {
    const firstProduct = await db(TABLES.PRODUCT).first();
    if (firstProduct) {
      catalogProduct = firstProduct;
    } else {
      const [newP] = await db(TABLES.PRODUCT)
        .insert({
          [P_COLS.PACKAGE_NAME]: variantName || displayName,
          [P_COLS.IS_ACTIVE]: true,
          [P_COLS.CREATED_AT]: db.fn.now(),
          [P_COLS.UPDATED_AT]: db.fn.now(),
        })
        .returning("*");
      catalogProduct = newP;
    }
  }

  const [insertedVariant] = await db(TABLES.VARIANT)
    .insert({
      [V_COLS.PRODUCT_ID]: catalogProduct[P_COLS.ID],
      [V_COLS.DISPLAY_NAME]: displayName,
      [V_COLS.VARIANT_NAME]: variantName,
      [V_COLS.BASE_PRICE]: base_price || null,
      [V_COLS.IS_ACTIVE]: is_active ?? true,
      [V_COLS.CREATED_AT]: db.fn.now(),
      [V_COLS.UPDATED_AT]: db.fn.now(),
    })
    .returning("*");

  const variantId = insertedVariant[V_COLS.ID];

  // Insert tier prices (1: CTV, 2: Customer, 3: Promo, 4: Student)
  const tierPrices = [
    { [VP_COLS.VARIANT_ID]: variantId, [VP_COLS.TIER_ID]: 1, [VP_COLS.PRICE]: ctv_price || 0 },
    { [VP_COLS.VARIANT_ID]: variantId, [VP_COLS.TIER_ID]: 2, [VP_COLS.PRICE]: retail_price || 0 },
    { [VP_COLS.VARIANT_ID]: variantId, [VP_COLS.TIER_ID]: 3, [VP_COLS.PRICE]: promo_price || 0 },
    { [VP_COLS.VARIANT_ID]: variantId, [VP_COLS.TIER_ID]: 4, [VP_COLS.PRICE]: student_price || 0 },
  ].filter((p) => p[VP_COLS.PRICE] > 0);

  if (tierPrices.length > 0) {
    await db(TABLES.VARIANT_PRICE).insert(tierPrices);
  }

  const resultProduct = {
    id: variantId,
    san_pham: displayName,
    package_product: variantName,
    base_price,
    retail_price,
    ctv_price,
    student_price,
    promo_price,
    is_active,
  };

  // Emit Domain Event
  eventBus.emit(EVENTS.PRODUCT_CREATED, resultProduct);

  return resultProduct;
};

/**
 * Cập nhật Sản phẩm & Bảng giá (Event: PRODUCT_UPDATED)
 * Tự động tính toán diff chi tiết (trường thay đổi, giá trị cũ/mới, summary)
 */
const updateProduct = async (id, data) => withTransaction(async (trx) => {
  const variantId = parseInt(id, 10);
  const oldVariant = await trx(TABLES.VARIANT).where({ [V_COLS.ID]: variantId }).first();
  if (!oldVariant) throw new Error("Sản phẩm không tồn tại");

  const oldPrices = await trx(TABLES.VARIANT_PRICE).where({ [VP_COLS.VARIANT_ID]: variantId });
  const getOldPrice = (tierId) => {
    const found = oldPrices.find((price) => Number(price[VP_COLS.TIER_ID]) === tierId);
    return found ? Number(found[VP_COLS.PRICE] || 0) : 0;
  };
  const oldState = {
    san_pham: oldVariant[V_COLS.DISPLAY_NAME] || "",
    package_product: oldVariant[V_COLS.VARIANT_NAME] || "",
    base_price: Number(oldVariant[V_COLS.BASE_PRICE] || 0),
    is_active: Boolean(oldVariant[V_COLS.IS_ACTIVE]),
    ctv_price: getOldPrice(1),
    retail_price: getOldPrice(2),
    promo_price: getOldPrice(3),
    student_price: getOldPrice(4),
  };
  const san_pham = data.san_pham !== undefined ? data.san_pham : data.name;
  const package_product = data.package_product !== undefined ? data.package_product : data.variant_name;
  const { base_price, retail_price, ctv_price, student_price, promo_price, is_active } = data;

  const updateFields = { [V_COLS.UPDATED_AT]: trx.fn.now() };
  if (san_pham !== undefined) updateFields[V_COLS.DISPLAY_NAME] = san_pham;
  if (package_product !== undefined) updateFields[V_COLS.VARIANT_NAME] = package_product;
  if (base_price !== undefined) updateFields[V_COLS.BASE_PRICE] = base_price || null;
  if (is_active !== undefined) updateFields[V_COLS.IS_ACTIVE] = is_active;
  await trx(TABLES.VARIANT).where({ [V_COLS.ID]: variantId }).update(updateFields);

  const upsertPrice = async (tierId, price) => {
    if (price === undefined) return;
    const criteria = { [VP_COLS.VARIANT_ID]: variantId, [VP_COLS.TIER_ID]: tierId };
    const existing = await trx(TABLES.VARIANT_PRICE).where(criteria).first();
    if (existing) {
      await trx(TABLES.VARIANT_PRICE).where(criteria).update({ [VP_COLS.PRICE]: price || 0 });
    } else if (price > 0) {
      await trx(TABLES.VARIANT_PRICE).insert({ ...criteria, [VP_COLS.PRICE]: price });
    }
  };
  await upsertPrice(1, ctv_price);
  await upsertPrice(2, retail_price);
  await upsertPrice(3, promo_price);
  await upsertPrice(4, student_price);

  const changes = {};
  const changedFields = [];
  const summaryParts = [];
  const formatMoney = (value) => new Intl.NumberFormat("vi-VN").format(value) + " VND";
  const trackChange = (key, label, isMoney = false) => {
    if (data[key] === undefined || data[key] === oldState[key]) return;
    changes[key] = { old: oldState[key], new: data[key] };
    changedFields.push(key);
    summaryParts.push(isMoney
      ? label + ": " + formatMoney(oldState[key]) + " -> " + formatMoney(data[key])
      : label + ": \"" + oldState[key] + "\" -> \"" + data[key] + "\"");
  };
  trackChange("san_pham", "Tên sản phẩm");
  trackChange("package_product", "Tên gói");
  trackChange("base_price", "Giá gốc", true);
  trackChange("retail_price", "Giá bán lẻ", true);
  trackChange("ctv_price", "Gi? CTV", true);
  trackChange("student_price", "Giá sinh viên", true);
  trackChange("promo_price", "Giá khuyến mại", true);
  if (is_active !== undefined && Boolean(is_active) !== oldState.is_active) {
    changes.is_active = { old: oldState.is_active, new: Boolean(is_active) };
    changedFields.push("is_active");
    summaryParts.push("Trạng thái: " + (oldState.is_active ? "Hoạt động" : "Ẩn") + " -> " + (is_active ? "Hoạt động" : "Ẩn"));
  }

  const updatedProductPayload = {
    id: variantId,
    san_pham: san_pham !== undefined ? san_pham : oldState.san_pham,
    package_product: package_product !== undefined ? package_product : oldState.package_product,
    base_price: base_price !== undefined ? base_price : oldState.base_price,
    retail_price: retail_price !== undefined ? retail_price : oldState.retail_price,
    ctv_price: ctv_price !== undefined ? ctv_price : oldState.ctv_price,
    student_price: student_price !== undefined ? student_price : oldState.student_price,
    promo_price: promo_price !== undefined ? promo_price : oldState.promo_price,
    is_active: is_active !== undefined ? is_active : oldState.is_active,
    changed_fields: changedFields,
    changes,
    old_values: oldState,
    summary: summaryParts.join("; ") || "Cập nhật sản phẩm",
  };
  trx.afterCommit(() => eventBus.emit(EVENTS.PRODUCT_UPDATED, updatedProductPayload));
  return updatedProductPayload;
});
const deleteProduct = async (id) => withTransaction(async (trx) => {
  const variantId = parseInt(id, 10);
  if (!variantId) {
    const err = new Error("ID sản phẩm không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const variant = await trx(TABLES.VARIANT).where({ [V_COLS.ID]: variantId }).first();
  if (!variant) {
    const err = new Error("Sản phẩm không tồn tại");
    err.statusCode = 404;
    throw err;
  }

  // 1. Kiểm tra toàn bộ đơn hàng liên quan tới sản phẩm (id_product trỏ tới variantId)
  const variantIdStr = String(variantId);
  const linkedOrders = await trx(TABLES.ORDER_LIST)
    .where({ [O_COLS.ID_PRODUCT]: variantIdStr })
    .orWhereRaw("CAST(?? AS TEXT) = ?", [O_COLS.ID_PRODUCT, variantIdStr]);

  // 2. Phân loại đơn hàng Đã Thanh Toán (Active / Paid)
  const activeOrders = linkedOrders.filter((o) => {
    const st = String(o[O_COLS.STATUS] || "").trim().toUpperCase();
    const isPaid = st === ORDER_STATUS.PAID || st === "ĐÃ THANH TOÁN";
    const isRenew = st === ORDER_STATUS.RENEW_REQUIRED || st === "CẦN GIA HẠN";
    const isProcessing = st === ORDER_STATUS.PROCESSING || st === "ĐANG XỬ LÝ";
    const wasPaidActive = Boolean(o[O_COLS.WAS_PAID]) && !["EXPIRED", "HẾT HẠN", "REFUNDED", "ĐÃ HOÀN TIỀN", "CANCELED", "ĐÃ HỦY"].includes(st);
    return isPaid || isRenew || isProcessing || wasPaidActive;
  });

  // Nếu còn đơn hàng Đã Thanh Toán -> Tuyệt đối CHẶN XÓA để tránh đơn hàng mồ côi
  if (activeOrders.length > 0) {
    const err = new Error(
      `Không thể xóa sản phẩm "${variant[V_COLS.DISPLAY_NAME]}" vì đang còn ${activeOrders.length} đơn hàng Đã Thanh Toán (hoặc đang hoạt động). Vui lòng chuyển sản phẩm sang trạng thái Ẩn thay vì Xóa để tránh đơn hàng bị mồ côi vật phẩm!`
    );
    err.statusCode = 400;
    throw err;
  }

  // 3. Nếu không còn đơn Đã Thanh Toán, tiến hành xóa sản phẩm và xóa sạch các đơn hàng liên quan (hết hạn/đã hoàn/hủy)
  let deletedOrdersCount = 0;
  if (linkedOrders.length > 0) {
    const { excludeOrderFromPendingBatches } = require("@/domains/invoices/services/batchPaymentService");
    const orderIds = linkedOrders.map((o) => o[O_COLS.ID]).filter(Boolean);

    // Gỡ từng đơn khỏi các đợt gộp pending nếu có
    for (const order of linkedOrders) {
      if (order[O_COLS.ID_ORDER]) {
        try {
          await excludeOrderFromPendingBatches(trx, order[O_COLS.ID_ORDER], "Xóa sản phẩm đi kèm đơn hàng hết hạn/đã hoàn");
        } catch (ex) {
          console.warn(`[deleteProduct] Không thể exclude đơn #${order[O_COLS.ID_ORDER]} khỏi batch:`, ex.message);
        }
      }
    }

    // Xóa chi phí NCC liên kết trong supplier_order_cost_log (phòng trường hợp DB thiếu FK cascade)
    await trx(TABLES.SUPPLIER_ORDER_COST_LOG).whereIn("order_list_id", orderIds).del();

    // Xóa toàn bộ các đơn hàng liên quan
    deletedOrdersCount = await trx(TABLES.ORDER_LIST).whereIn(O_COLS.ID, orderIds).del();
  }

  // 4. Xóa các bảng liên quan đến variant
  await trx(TABLES.VARIANT_PRICE).where({ [VP_COLS.VARIANT_ID]: variantId }).del();
  await trx(TABLES.SUPPLIER_COST).where({ [SC_COLS.VARIANT_ID]: variantId }).del();
  await trx(TABLES.VARIANT).where({ [V_COLS.ID]: variantId }).del();

  const summary = deletedOrdersCount > 0
    ? `Đã xóa hoàn toàn sản phẩm "${variant[V_COLS.DISPLAY_NAME]}" (${variant[V_COLS.VARIANT_NAME]}) và xóa luôn ${deletedOrdersCount} đơn hàng (hết hạn/đã hoàn) liên quan khỏi hệ thống`
    : `Đã xóa hoàn toàn sản phẩm "${variant[V_COLS.DISPLAY_NAME]}" (${variant[V_COLS.VARIANT_NAME]}) khỏi hệ thống`;

  const deletedPayload = {
    id: variantId,
    san_pham: variant[V_COLS.DISPLAY_NAME],
    variant_name: variant[V_COLS.VARIANT_NAME],
    deleted_orders_count: deletedOrdersCount,
    summary,
  };

  // 5. Emit Domain Event sau khi transaction đã commit thành công
  trx.afterCommit(() => {
    eventBus.emit(EVENTS.PRODUCT_DELETED, deletedPayload);
  });

  return deletedPayload;
});

/**
 * Thêm giá nhập của Nhà Cung Cấp (NCC) cho sản phẩm (Event: SUPPLIER_COST_ADDED)
 */
const addSupplierCost = async (variantId, supplierId, price) => {
  const vId = parseInt(variantId, 10);
  const sId = parseInt(supplierId, 10);
  const costPrice = parseFloat(price || 0);

  const maxRes = await db(TABLES.SUPPLIER_COST).max(`${SC_COLS.ID} as maxId`).first();
  const nextId = (parseInt(maxRes?.maxId || 0, 10)) + 1;

  const [inserted] = await db(TABLES.SUPPLIER_COST)
    .insert({
      [SC_COLS.ID]: nextId,
      [SC_COLS.VARIANT_ID]: vId,
      [SC_COLS.SUPPLIER_ID]: sId,
      [SC_COLS.PRICE]: costPrice,
      [SC_COLS.CREATED_AT]: db.fn.now(),
      [SC_COLS.UPDATED_AT]: db.fn.now(),
    })
    .returning("*");

  const supplier = await db(TABLES.SUPPLIER).where({ [S_COLS.ID]: sId }).first();
  const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";

  const supplierCostPayload = {
    id: inserted[SC_COLS.ID],
    variant_id: vId,
    supplier_id: sId,
    supplier_name: supplier?.[S_COLS.SUPPLIER_NAME] || "",
    price: costPrice,
    summary: `Thêm nguồn NCC "${supplier?.[S_COLS.SUPPLIER_NAME] || sId}" với giá nhập ${formatMoney(costPrice)}`,
  };

  // Emit SUPPLIER_COST_ADDED event
  eventBus.emit(EVENTS.SUPPLIER_COST_ADDED, supplierCostPayload);

  // Emit PRODUCT_UPDATED event as well
  eventBus.emit(EVENTS.PRODUCT_UPDATED, {
    id: vId,
    action: "ADD_SUPPLIER_COST",
    changed_fields: ["supplier_cost"],
    changes: {
      supplier_cost: {
        action: "ADD",
        supplier_id: sId,
        supplier_name: supplier?.[S_COLS.SUPPLIER_NAME] || "",
        price: costPrice,
      },
    },
    summary: supplierCostPayload.summary,
  });

  return inserted;
};

/**
 * Cập nhật giá nhập của Nhà Cung Cấp (NCC) (Event: SUPPLIER_COST_UPDATED)
 */
const updateSupplierCost = async (supplierCostId, price) => {
  const scId = parseInt(supplierCostId, 10);
  const costPrice = parseFloat(price || 0);

  const row = await db(TABLES.SUPPLIER_COST).where({ [SC_COLS.ID]: scId }).first();
  if (!row) throw new Error("Bản ghi giá NCC không tồn tại");

  const oldPrice = parseFloat(row[SC_COLS.PRICE] || 0);

  await db(TABLES.SUPPLIER_COST)
    .where({ [SC_COLS.ID]: scId })
    .update({ [SC_COLS.PRICE]: costPrice, [SC_COLS.UPDATED_AT]: db.fn.now() });

  const supplier = await db(TABLES.SUPPLIER).where({ [S_COLS.ID]: row[SC_COLS.SUPPLIER_ID] }).first();
  const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";

  const supplierCostPayload = {
    id: scId,
    variant_id: row[SC_COLS.VARIANT_ID],
    supplier_id: row[SC_COLS.SUPPLIER_ID],
    supplier_name: supplier?.[S_COLS.SUPPLIER_NAME] || "",
    old_price: oldPrice,
    price: costPrice,
    summary: `Cập nhật giá nhập NCC "${supplier?.[S_COLS.SUPPLIER_NAME] || row[SC_COLS.SUPPLIER_ID]}": ${formatMoney(oldPrice)} ➔ ${formatMoney(costPrice)}`,
  };

  // Emit SUPPLIER_COST_UPDATED event
  eventBus.emit(EVENTS.SUPPLIER_COST_UPDATED, supplierCostPayload);

  // Emit PRODUCT_UPDATED event
  eventBus.emit(EVENTS.PRODUCT_UPDATED, {
    id: row[SC_COLS.VARIANT_ID],
    action: "UPDATE_SUPPLIER_COST",
    changed_fields: ["supplier_cost"],
    changes: {
      supplier_cost: {
        action: "UPDATE",
        supplier_cost_id: scId,
        old_price: oldPrice,
        price: costPrice,
      },
    },
    summary: supplierCostPayload.summary,
  });

  return { ...row, [SC_COLS.PRICE]: costPrice };
};

/**
 * Xóa giá nhập của Nhà Cung Cấp (NCC) (Event: SUPPLIER_COST_DELETED)
 */
const deleteSupplierCost = async (supplierCostId) => {
  const scId = parseInt(supplierCostId, 10);

  const row = await db(TABLES.SUPPLIER_COST).where({ [SC_COLS.ID]: scId }).first();
  if (!row) throw new Error("Bản ghi giá NCC không tồn tại");

  await db(TABLES.SUPPLIER_COST).where({ [SC_COLS.ID]: scId }).del();

  const supplier = await db(TABLES.SUPPLIER).where({ [S_COLS.ID]: row[SC_COLS.SUPPLIER_ID] }).first();
  const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";

  const supplierCostPayload = {
    id: scId,
    variant_id: row[SC_COLS.VARIANT_ID],
    supplier_id: row[SC_COLS.SUPPLIER_ID],
    supplier_name: supplier?.[S_COLS.SUPPLIER_NAME] || "",
    price: parseFloat(row[SC_COLS.PRICE] || 0),
    summary: `Xóa nguồn NCC "${supplier?.[S_COLS.SUPPLIER_NAME] || row[SC_COLS.SUPPLIER_ID]}" (${formatMoney(row[SC_COLS.PRICE])}) khỏi sản phẩm`,
  };

  // Emit SUPPLIER_COST_DELETED event
  eventBus.emit(EVENTS.SUPPLIER_COST_DELETED, supplierCostPayload);

  // Emit PRODUCT_UPDATED event
  eventBus.emit(EVENTS.PRODUCT_UPDATED, {
    id: row[SC_COLS.VARIANT_ID],
    action: "DELETE_SUPPLIER_COST",
    changed_fields: ["supplier_cost"],
    changes: {
      supplier_cost: {
        action: "DELETE",
        supplier_cost_id: scId,
      },
    },
    summary: supplierCostPayload.summary,
  });

  return row;
};


// Sub-service quản lý Kho Gói Sản Phẩm phân rã theo Giai Đoạn 4 (Master Refactoring Plan)
const {
  getPackageProducts,
  getPackageCategories,
  getAllCatalogProductNames,
  createPackageCategory,
  updatePackageCategory,
  deletePackageCategory,
  createPackageProduct,
  updatePackageProduct,
  deletePackageProduct,
} = require("./packageProductService");

module.exports = {
  getProductPrices,
  getPackageProducts,
  getPackageCategories,
  getAllCatalogProductNames,
  createPackageCategory,
  updatePackageCategory,
  deletePackageCategory,
  createPackageProduct,
  updatePackageProduct,
  deletePackageProduct,
  getSuppliersForVariant,
  getAllSuppliersList,
  createProduct,
  updateProduct,
  deleteProduct,
  addSupplierCost,
  updateSupplierCost,
  deleteSupplierCost,
};

