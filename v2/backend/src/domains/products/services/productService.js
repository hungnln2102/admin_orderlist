const { db, TABLES, COLS } = require("@/db");
const { eventBus, EVENTS } = require("@/events");
const { ORDER_STATUS } = require("@/constants/orderStatus");

const V_COLS = COLS.VARIANT;
const VP_COLS = COLS.VARIANT_PRICE;
const SC_COLS = COLS.SUPPLIER_COST;
const S_COLS = COLS.SUPPLIER;
const P_COLS = COLS.PRODUCT;

/**
 * Service lấy danh sách giá sản phẩm (Bảng giá Niêm yết)
 * Bao gồm Giá Gốc, Giá Bán Lẻ, Giá CTV, Giá Sinh Viên, Giá Khuyến Mãi & % Lợi Nhuận
 */
const getProductPrices = async ({ page = 1, limit = 15, search = "", activeOnly = false } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(1000, parseInt(limit, 10) || 15));
  const offset = (pageNum - 1) * limitNum;

  let whereClause = "WHERE 1=1";
  const params = [];

  // Khi activeOnly = true, chỉ lấy sản phẩm đang hoạt động (dùng cho dropdown tạo đơn hàng)
  if (activeOnly) {
    whereClause += ` AND v.${V_COLS.IS_ACTIVE} = true`;
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
      v.${V_COLS.UPDATED_AT}
    FROM ${TABLES.VARIANT} v
    LEFT JOIN ${TABLES.PRODUCT} p ON p.${P_COLS.ID} = v.${V_COLS.PRODUCT_ID}
    LEFT JOIN ${TABLES.VARIANT_PRICE} p_retail ON p_retail.${VP_COLS.VARIANT_ID} = v.${V_COLS.ID} AND p_retail.${VP_COLS.TIER_ID} = 2
    LEFT JOIN ${TABLES.VARIANT_PRICE} p_ctv ON p_ctv.${VP_COLS.VARIANT_ID} = v.${V_COLS.ID} AND p_ctv.${VP_COLS.TIER_ID} = 1
    LEFT JOIN ${TABLES.VARIANT_PRICE} p_student ON p_student.${VP_COLS.VARIANT_ID} = v.${V_COLS.ID} AND p_student.${VP_COLS.TIER_ID} = 4
    LEFT JOIN ${TABLES.VARIANT_PRICE} p_promo ON p_promo.${VP_COLS.VARIANT_ID} = v.${V_COLS.ID} AND p_promo.${VP_COLS.TIER_ID} = 3
    ${whereClause}
    ORDER BY v.${V_COLS.IS_ACTIVE} DESC, COALESCE(p.${P_COLS.PACKAGE_NAME}, v.${V_COLS.DISPLAY_NAME}) ASC, v.${V_COLS.DISPLAY_NAME} ASC
    LIMIT ? OFFSET ?
  `;

  const countRes = await db.raw(countSql, params);
  const total = parseInt(countRes.rows[0]?.total || 0, 10);
  const totalPages = Math.ceil(total / limitNum) || 1;

  const dataRes = await db.raw(dataSql, [...params, limitNum, offset]);

  const formattedData = (dataRes.rows || []).map((r) => {
    const retailPrice = parseFloat(r.retail_price || 0);
    const ctvPrice = parseFloat(r.ctv_price || 0);
    const studentPrice = parseFloat(r.student_price || 0);
    const promoPrice = parseFloat(r.promo_price || 0);
    const basePrice = parseFloat(r.base_price || 0);

    let marginPct = "0.0%";

    if (r.retail_margin_ratio !== null && r.retail_margin_ratio !== undefined) {
      marginPct = (parseFloat(r.retail_margin_ratio) * 100).toFixed(1) + "%";
    } else if (retailPrice > 0 && ctvPrice > 0) {
      marginPct = (((retailPrice - ctvPrice) / retailPrice) * 100).toFixed(1) + "%";
    } else {
      marginPct = "0.0%";
    }

    return {
      id: r.id,
      san_pham: r.san_pham || r.package_product || "N/A",
      package_product: r.package_product || "",
      base_price: basePrice,
      retail_price: retailPrice,
      ctv_price: ctvPrice,
      student_price: studentPrice,
      promo_price: promoPrice,
      margin: marginPct,
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
    id: r[S_COLS.ID],
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
const updateProduct = async (id, data) => {
  const variantId = parseInt(id, 10);

  // 1. Lấy trạng thái hiện tại (cũ) của sản phẩm & giá tiers
  const oldVariant = await db(TABLES.VARIANT).where({ [V_COLS.ID]: variantId }).first();
  if (!oldVariant) throw new Error("Sản phẩm không tồn tại");

  const oldPrices = await db(TABLES.VARIANT_PRICE).where({ [VP_COLS.VARIANT_ID]: variantId });
  const getOldPrice = (tierId) => {
    const found = oldPrices.find((p) => p[VP_COLS.TIER_ID] === tierId);
    return found ? parseFloat(found[VP_COLS.PRICE] || 0) : 0;
  };

  const oldState = {
    san_pham: oldVariant[V_COLS.DISPLAY_NAME] || "",
    package_product: oldVariant[V_COLS.VARIANT_NAME] || "",
    base_price: parseFloat(oldVariant[V_COLS.BASE_PRICE] || 0),
    is_active: Boolean(oldVariant[V_COLS.IS_ACTIVE]),
    ctv_price: getOldPrice(1),
    retail_price: getOldPrice(2),
    promo_price: getOldPrice(3),
    student_price: getOldPrice(4),
  };

  const {
    san_pham,
    package_product,
    base_price,
    retail_price,
    ctv_price,
    student_price,
    promo_price,
    is_active,
  } = data;

  const updateFields = { [V_COLS.UPDATED_AT]: db.fn.now() };
  if (san_pham !== undefined) updateFields[V_COLS.DISPLAY_NAME] = san_pham;
  if (package_product !== undefined) updateFields[V_COLS.VARIANT_NAME] = package_product;
  if (base_price !== undefined) updateFields[V_COLS.BASE_PRICE] = base_price || null;
  if (is_active !== undefined) updateFields[V_COLS.IS_ACTIVE] = is_active;

  await db(TABLES.VARIANT).where({ [V_COLS.ID]: variantId }).update(updateFields);

  // Update tier prices
  const upsertPrice = async (tierId, priceVal) => {
    if (priceVal === undefined) return;
    const existing = await db(TABLES.VARIANT_PRICE)
      .where({ [VP_COLS.VARIANT_ID]: variantId, [VP_COLS.TIER_ID]: tierId })
      .first();

    if (existing) {
      await db(TABLES.VARIANT_PRICE)
        .where({ [VP_COLS.VARIANT_ID]: variantId, [VP_COLS.TIER_ID]: tierId })
        .update({ [VP_COLS.PRICE]: priceVal || 0 });
    } else if (priceVal > 0) {
      await db(TABLES.VARIANT_PRICE).insert({
        [VP_COLS.VARIANT_ID]: variantId,
        [VP_COLS.TIER_ID]: tierId,
        [VP_COLS.PRICE]: priceVal,
      });
    }
  };

  await upsertPrice(1, ctv_price);
  await upsertPrice(2, retail_price);
  await upsertPrice(3, promo_price);
  await upsertPrice(4, student_price);

  // 2. Tính toán diff chi tiết (trường nào thay đổi, từ bao nhiêu thành bao nhiêu)
  const changes = {};
  const changedFields = [];
  const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";
  const summaryParts = [];

  const checkField = (key, label, isMoney = false) => {
    if (data[key] !== undefined && data[key] !== oldState[key]) {
      changes[key] = { old: oldState[key], new: data[key] };
      changedFields.push(key);
      if (isMoney) {
        summaryParts.push(`${label}: ${formatMoney(oldState[key])} ➔ ${formatMoney(data[key])}`);
      } else {
        summaryParts.push(`${label}: "${oldState[key]}" ➔ "${data[key]}"`);
      }
    }
  };

  checkField("san_pham", "Tên sản phẩm");
  checkField("package_product", "Tên gói");
  checkField("base_price", "Giá gốc", true);
  checkField("retail_price", "Giá bán lẻ", true);
  checkField("ctv_price", "Giá CTV", true);
  checkField("student_price", "Giá Sinh viên", true);
  checkField("promo_price", "Giá Khuyến mãi", true);

  if (is_active !== undefined && Boolean(is_active) !== oldState.is_active) {
    changes.is_active = { old: oldState.is_active, new: Boolean(is_active) };
    changedFields.push("is_active");
    summaryParts.push(`Trạng thái: ${oldState.is_active ? "Hoạt động" : "Ẩn"} ➔ ${is_active ? "Hoạt động" : "Ẩn"}`);
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
    summary: summaryParts.length > 0 ? summaryParts.join("; ") : "Cập nhật sản phẩm",
  };

  // Emit Domain Event với chi tiết diff
  eventBus.emit(EVENTS.PRODUCT_UPDATED, updatedProductPayload);

  return updatedProductPayload;
};

/**
 * Xóa Sản phẩm (Event: PRODUCT_DELETED)
 */
const deleteProduct = async (id) => {
  const variantId = parseInt(id, 10);

  const variant = await db(TABLES.VARIANT).where({ [V_COLS.ID]: variantId }).first();
  if (!variant) throw new Error("Sản phẩm không tồn tại");

  await db(TABLES.VARIANT_PRICE).where({ [VP_COLS.VARIANT_ID]: variantId }).del();
  await db(TABLES.SUPPLIER_COST).where({ [SC_COLS.VARIANT_ID]: variantId }).del();
  await db(TABLES.VARIANT).where({ [V_COLS.ID]: variantId }).del();

  const deletedPayload = {
    id: variantId,
    san_pham: variant[V_COLS.DISPLAY_NAME],
    variant_name: variant[V_COLS.VARIANT_NAME],
    summary: `Đã xóa hoàn toàn sản phẩm "${variant[V_COLS.DISPLAY_NAME]}" (${variant[V_COLS.VARIANT_NAME]}) khỏi hệ thống`,
  };

  // Emit Domain Event
  eventBus.emit(EVENTS.PRODUCT_DELETED, deletedPayload);

  return deletedPayload;
};

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

/**
 * Service lấy danh sách Kho Gói Sản Phẩm từ bảng warehouse.package_products
 * Kết hợp với warehouse.product_names và warehouse.accounts (Tài khoản gốc & Tài khoản liên kết)
 */
const getPackageProducts = async () => {
  const query = `
    SELECT
      pp.id,
      pp.product_name_id,
      pn.name AS product_name,
      COALESCE(pn.name, 'Kh?c') AS category,
      pn.requires_storage AS category_requires_storage,
      COALESCE(acc.account_username, 'Tài khoản kho #' || pp.id) AS account_info,
      storage_acc.account_username AS storage_account_info,
      COALESCE(pp.supplier, 'Mavryk') AS supplier,
      COALESCE(pp.cost, 0) AS cost_price,
      COALESCE(pp.slot, 2) AS total_slots,
      pp.storage_total,
      pp.match_rule,
      pp.package_note
    FROM ${TABLES.PACKAGE_PRODUCT} pp
    LEFT JOIN ${TABLES.PRODUCT_NAMES} pn ON pn.id = pp.product_name_id
    LEFT JOIN ${TABLES.PRODUCT_KEYS} acc ON acc.id = pp.account_id
    LEFT JOIN ${TABLES.PRODUCT_KEYS} storage_acc ON storage_acc.id = pp.storage_account_id
    ORDER BY pp.id DESC;
  `;

  const result = await db.raw(query);
  const rows = result.rows || [];
  if (rows.length === 0) return [];

  // Lọc chỉ các từ khóa tài khoản thực sự tồn tại trong danh sách gói để truy vấn có mục tiêu
  const targetAccounts = Array.from(
    new Set(
      rows
        .map((r) => r.account_info && String(r.account_info).trim().toLowerCase())
        .filter((acc) => Boolean(acc) && !acc.startsWith("tài khoản kho #"))
    )
  );

  let ordersList = [];
  if (targetAccounts.length > 0) {
    ordersList = await db(TABLES.ORDER_LIST)
      .select("id", "id_order", "customer", "contact", "information_order", "slot", "status", "expired_at", "cost", "supply_id")
      .whereNotIn("status", [ORDER_STATUS.CANCELED, ORDER_STATUS.REFUNDED, "Đã Xóa", "Đã Hủy", "Hoàn Tiền"])
      .whereNot("id_order", "ilike", "MAVN%")
      .whereRaw("LOWER(COALESCE(customer, '')) != 'mavryk'")
      .where((builder) => {
        targetAccounts.forEach((acc) => {
          builder.orWhereILike("information_order", `%${acc}%`);
          builder.orWhereRaw("CAST(slot AS TEXT) ILIKE ?", [`%${acc}%`]);
        });
      });
  }

  return rows.map((r) => {
    const matchRule = (r.match_rule || "information").toLowerCase();
    const matchingOrders = ordersList.filter((o) => {
      if (!r.account_info) return false;

      // Tuyệt đối không khớp đơn nhập hàng MAVN hoặc khách Mavryk vào slot bán cho khách
      const idOrder = String(o.id_order || "").toUpperCase();
      if (idOrder.startsWith("MAVN")) return false;
      if (String(o.customer || "").trim().toLowerCase() === "mavryk") return false;

      const targetUser = r.account_info.toLowerCase();
      if (matchRule === "slot") {
        return Boolean(o.slot && String(o.slot).toLowerCase().includes(targetUser));
      }
      if (matchRule === "both") {
        return Boolean(
          (o.information_order && o.information_order.toLowerCase().includes(targetUser)) ||
          (o.slot && String(o.slot).toLowerCase().includes(targetUser))
        );
      }
      return Boolean(o.information_order && o.information_order.toLowerCase().includes(targetUser));
    });

    const totalSlots = parseInt(r.total_slots || 2, 10);
    const usedSlots = Math.min(totalSlots, matchingOrders.length);

    const slotAssignments = matchingOrders.map((ord, idx) => ({
      slotNumber: idx + 1,
      orderCode: ord.id_order || `ĐƠN #${ord.id}`,
      customerName: ord.customer || "",
      customerContact: ord.contact || ord.information_order || "",
      slotLabel: ord.slot || `Slot ${idx + 1}`,
    }));

    return {
      id: r.id,
      productName: r.product_name || "",
      category: r.category || r.product_name || "Khác",
      requiresStorage: Boolean(r.category_requires_storage),
      name: r.product_name || (r.category ? `${r.category} #${r.id}` : `Gói #${r.id}`),
      accountInfo: r.account_info,
      storageAccountInfo: r.storage_account_info || null,
      storageTotal: r.storage_total || null,
      usedSlots,
      totalSlots,
      supplier: r.supplier,
      costPrice: parseFloat(r.cost_price || 0),
      expiredAt: "2026-12-31",
      note: r.package_note || "",
      matchRule: r.match_rule || "information",
      status: usedSlots >= totalSlots ? "expired" : usedSlots > 0 ? "warning" : "active",
      slotAssignments,
    };
  });
};

/**
 * Lấy danh mục các Loại Gói từ warehouse.product_names (lọc is_package = true)
 * Bao gồm cờ requires_storage (Sử dụng tài khoản dung lượng liên kết)
 */
const getPackageCategories = async () => {
  let categories = await db(TABLES.PRODUCT_NAMES)
    .where("is_package", true)
    .orderBy("id", "asc");

  // Nếu DB chưa có bản ghi nào đánh dấu is_package = true, tự động đảm bảo 6 loại gói mặc định
  if (!categories || categories.length === 0) {
    const defaultPackages = [
      { name: "Adobe", requiresStorage: true },
      { name: "Canva", requiresStorage: true },
      { name: "Gemini", requiresStorage: false },
      { name: "GoogleOne", requiresStorage: true },
      { name: "Netflix", requiresStorage: false },
      { name: "Youtube", requiresStorage: false },
    ];
    for (const pkg of defaultPackages) {
      const existing = await db(TABLES.PRODUCT_NAMES)
        .whereRaw("LOWER(name) = ?", [pkg.name.toLowerCase()])
        .first();

      if (existing) {
        await db(TABLES.PRODUCT_NAMES)
          .where("id", existing.id)
          .update({ is_package: true, requires_storage: pkg.requiresStorage });
      } else {
        await db(TABLES.PRODUCT_NAMES).insert({
          name: pkg.name,
          is_package: true,
          requires_storage: pkg.requiresStorage,
        });
      }
    }

    categories = await db(TABLES.PRODUCT_NAMES)
      .where("is_package", true)
      .orderBy("id", "asc");
  }

  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    isPackage: Boolean(c.is_package),
    requiresStorage: Boolean(c.requires_storage),
  }));
};

/**
 * Tạo mới hoặc cập nhật Loại Gói (đánh dấu is_package = true & requires_storage)
 */
const createPackageCategory = async ({ name, requiresStorage = false }) => {
  const trimmedName = (name || "").trim();
  if (!trimmedName) {
    throw new Error("Tên loại gói không được để trống!");
  }

  const existing = await db(TABLES.PRODUCT_NAMES)
    .whereRaw("LOWER(name) = ?", [trimmedName.toLowerCase()])
    .first();

  if (existing) {
    const [updated] = await db(TABLES.PRODUCT_NAMES)
      .where("id", existing.id)
      .update({
        is_package: true,
        requires_storage: Boolean(requiresStorage),
        updated_at: db.fn.now(),
      })
      .returning("*");

    const result = {
      id: updated.id,
      name: updated.name,
      isPackage: Boolean(updated.is_package),
      requiresStorage: Boolean(updated.requires_storage),
    };
    eventBus.emit(EVENTS.PACKAGE_CATEGORY_CREATED, result);
    return result;
  }

  const [inserted] = await db(TABLES.PRODUCT_NAMES)
    .insert({
      name: trimmedName,
      is_package: true,
      requires_storage: Boolean(requiresStorage),
    })
    .returning("*");

  const result = {
    id: inserted.id,
    name: inserted.name,
    isPackage: Boolean(inserted.is_package),
    requiresStorage: Boolean(inserted.requires_storage),
  };
  eventBus.emit(EVENTS.PACKAGE_CATEGORY_CREATED, result);
  return result;
};

/**
 * Cập nhật tên Loại Gói và cờ requires_storage trong warehouse.product_names
 */
const updatePackageCategory = async ({ oldName, newName, requiresStorage }) => {
  const trimmedNew = (newName || oldName || "").trim();
  const trimmedOld = (oldName || "").trim();
  if (!trimmedNew) throw new Error("Tên loại gói mới không được để trống!");
  if (!trimmedOld) throw new Error("Tên loại gói cũ không hợp lệ!");

  const existing = await db(TABLES.PRODUCT_NAMES)
    .whereRaw("LOWER(name) = ?", [trimmedOld.toLowerCase()])
    .first();

  if (!existing) {
    throw new Error(`Không tìm thấy loại gói '${trimmedOld}'`);
  }

  const updateFields = {
    name: trimmedNew,
    is_package: true,
    updated_at: db.fn.now(),
  };
  if (requiresStorage !== undefined) {
    updateFields.requires_storage = Boolean(requiresStorage);
  }

  const [updated] = await db(TABLES.PRODUCT_NAMES)
    .where("id", existing.id)
    .update(updateFields)
    .returning("*");

  const result = {
    id: updated.id,
    name: updated.name,
    isPackage: Boolean(updated.is_package),
    requiresStorage: Boolean(updated.requires_storage),
  };
  eventBus.emit(EVENTS.PACKAGE_CATEGORY_UPDATED, result);
  return result;
};

/**
 * Xóa mềm Loại Gói (đặt is_package = false)
 */
const deletePackageCategory = async (nameOrId) => {
  if (!nameOrId) throw new Error("ID hoặc Tên loại gói không được để trống!");

  let query = db(TABLES.PRODUCT_NAMES);
  if (!isNaN(Number(nameOrId))) {
    query = query.where("id", Number(nameOrId));
  } else {
    query = query.whereRaw("LOWER(name) = ?", [String(nameOrId).trim().toLowerCase()]);
  }

  const existing = await query.first();
  if (!existing) {
    throw new Error(`Không tìm thấy loại gói '${nameOrId}'!`);
  }

  const [updated] = await db(TABLES.PRODUCT_NAMES)
    .where("id", existing.id)
    .update({
      is_package: false,
      updated_at: db.fn.now(),
    })
    .returning("*");

  const result = {
    success: true,
    id: updated.id,
    name: updated.name,
    isPackage: false,
  };

  eventBus.emit(EVENTS.PACKAGE_CATEGORY_DELETED, result);

  return result;
};

/**
 * Helper tìm hoặc tạo tài khoản kho trong warehouse.accounts
 */
const findOrCreateAccount = async (accountUsername) => {
  const trimmed = (accountUsername || "").trim();
  if (!trimmed) return null;

  const existing = await db(TABLES.PRODUCT_KEYS)
    .whereRaw("LOWER(account_username) = ?", [trimmed.toLowerCase()])
    .first();

  if (existing) return existing;

  const [created] = await db(TABLES.PRODUCT_KEYS)
    .insert({
      account_username: trimmed,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .returning("*");

  return created;
};

/**
 * Thêm mới Gói Sản Phẩm (Kho Gói Sản Phẩm)
 * Hỗ trợ tài khoản gốc (account_id) và tài khoản liên kết (storage_account_id / storage_total)
 */
const createPackageProduct = async (payload) => {
  const {
    name,
    category,
    accountInfo,
    accountUsername,
    storageAccountInfo,
    storageAccountUsername,
    storageTotal,
    supplier = "Mavryk",
    costPrice = 0,
    totalSlots = 2,
    note = "",
  } = payload;

  const mainAccUser = accountUsername || accountInfo;
  if (!mainAccUser || !mainAccUser.trim()) {
    throw new Error("Thông tin tài khoản gốc không được để trống!");
  }

  const catName = (category || name || "").trim();
  if (!catName) {
    throw new Error("Loại gói sản phẩm không được để trống!");
  }

  // 1. Tìm hoặc tạo product_name_id trong warehouse.product_names
  let pnRecord = await db(TABLES.PRODUCT_NAMES)
    .whereRaw("LOWER(name) = ?", [catName.toLowerCase()])
    .first();

  if (!pnRecord) {
    const [createdPn] = await db(TABLES.PRODUCT_NAMES)
      .insert({
        name: catName,
        is_package: true,
        requires_storage: Boolean(storageAccountUsername || storageAccountInfo),
      })
      .returning("*");
    pnRecord = createdPn;
  }

  // 2. Tìm hoặc tạo Tài khoản gốc trong warehouse.accounts
  const mainAccount = await findOrCreateAccount(mainAccUser);

  // 3. Tìm hoặc tạo Tài khoản dung lượng/liên kết (nếu có)
  const storageAccUser = storageAccountUsername || storageAccountInfo;
  let storageAccount = null;
  if (storageAccUser && storageAccUser.trim()) {
    storageAccount = await findOrCreateAccount(storageAccUser);
  }

  // 4. Insert vào warehouse.package_products
  const [inserted] = await db(TABLES.PACKAGE_PRODUCT)
    .insert({
      product_name_id: pnRecord.id,
      account_id: mainAccount.id,
      supplier: supplier || "Mavryk",
      cost: parseFloat(costPrice || 0),
      slot: parseInt(totalSlots || 2, 10),
      package_note: note || null,
      storage_account_id: storageAccount ? storageAccount.id : null,
      storage_total: storageTotal || null,
      match_rule: payload.matchRule || "information",
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .returning("*");

  const resultItem = {
    id: inserted.id,
    productName: pnRecord.name,
    category: pnRecord.name,
    requiresStorage: Boolean(pnRecord.requires_storage),
    name: name || pnRecord.name,
    accountInfo: mainAccount.account_username,
    storageAccountInfo: storageAccount ? storageAccount.account_username : null,
    storageTotal: inserted.storage_total || null,
    usedSlots: 0,
    totalSlots: inserted.slot,
    supplier: inserted.supplier,
    costPrice: parseFloat(inserted.cost || 0),
    expiredAt: "2026-12-31",
    note: inserted.package_note || "",
    matchRule: inserted.match_rule || "information",
    status: "active",
    slotAssignments: [],
  };

  eventBus.emit(EVENTS.PACKAGE_PRODUCT_CREATED, resultItem);
  return resultItem;
};

/**
 * Cập nhật Gói Sản Phẩm trong warehouse.package_products
 */
const updatePackageProduct = async (id, payload) => {
  const pkgId = parseInt(id, 10);
  if (!pkgId) throw new Error("ID gói không hợp lệ!");

  const existing = await db(TABLES.PACKAGE_PRODUCT).where("id", pkgId).first();
  if (!existing) throw new Error(`Không tìm thấy gói sản phẩm #${pkgId}`);

  const {
    name,
    category,
    accountInfo,
    accountUsername,
    storageAccountInfo,
    storageAccountUsername,
    storageTotal,
    matchRule,
    supplier,
    costPrice,
    totalSlots,
    note,
  } = payload;

  const updateFields = {
    updated_at: db.fn.now(),
  };

  let targetPnRecord = null;
  if (category) {
    targetPnRecord = await db(TABLES.PRODUCT_NAMES)
      .whereRaw("LOWER(name) = ?", [category.trim().toLowerCase()])
      .first();
    if (!targetPnRecord) {
      const [created] = await db(TABLES.PRODUCT_NAMES)
        .insert({ name: category.trim(), is_package: true })
        .returning("*");
      targetPnRecord = created;
    }
    updateFields.product_name_id = targetPnRecord.id;
  }

  const mainAccUser = accountUsername || accountInfo;
  if (mainAccUser && mainAccUser.trim()) {
    const mainAcc = await findOrCreateAccount(mainAccUser);
    updateFields.account_id = mainAcc.id;
  }

  const storageAccUser = storageAccountUsername !== undefined ? storageAccountUsername : storageAccountInfo;
  if (storageAccUser !== undefined) {
    if (storageAccUser && storageAccUser.trim()) {
      const storageAcc = await findOrCreateAccount(storageAccUser);
      updateFields.storage_account_id = storageAcc.id;
    } else {
      updateFields.storage_account_id = null;
    }
  }

  if (storageTotal !== undefined) updateFields.storage_total = storageTotal || null;
  if (matchRule !== undefined) updateFields.match_rule = matchRule || "information";
  if (supplier !== undefined) updateFields.supplier = supplier;
  if (costPrice !== undefined) updateFields.cost = parseFloat(costPrice || 0);
  if (totalSlots !== undefined) updateFields.slot = parseInt(totalSlots || 2, 10);
  if (note !== undefined) updateFields.package_note = note;

  const [updated] = await db(TABLES.PACKAGE_PRODUCT)
    .where("id", pkgId)
    .update(updateFields)
    .returning("*");

  const mainAcc = await db(TABLES.PRODUCT_KEYS).where("id", updated.account_id).first();
  const storageAcc = updated.storage_account_id
    ? await db(TABLES.PRODUCT_KEYS).where("id", updated.storage_account_id).first()
    : null;
  const pn = await db(TABLES.PRODUCT_NAMES).where("id", updated.product_name_id).first();

  const resultItem = {
    id: updated.id,
    productName: pn ? pn.name : "",
    category: pn ? pn.name : category || "Khác",
    requiresStorage: Boolean(pn?.requires_storage),
    name: name || (pn ? pn.name : `Gói #${updated.id}`),
    accountInfo: mainAcc ? mainAcc.account_username : "",
    storageAccountInfo: storageAcc ? storageAcc.account_username : null,
    storageTotal: updated.storage_total || null,
    usedSlots: payload.usedSlots !== undefined ? payload.usedSlots : 0,
    totalSlots: updated.slot,
    supplier: updated.supplier,
    costPrice: parseFloat(updated.cost || 0),
    expiredAt: payload.expiredAt || "2026-12-31",
    note: updated.package_note || "",
    matchRule: updated.match_rule || "information",
    status: (payload.usedSlots || 0) >= updated.slot ? "expired" : "active",
  };

  eventBus.emit(EVENTS.PACKAGE_PRODUCT_UPDATED, resultItem);
  return resultItem;
};

/**
 * Xóa Gói Sản Phẩm khỏi warehouse.package_products
 */
const deletePackageProduct = async (id) => {
  const pkgId = parseInt(id, 10);
  if (!pkgId) throw new Error("ID gói không hợp lệ!");

  const existing = await db(TABLES.PACKAGE_PRODUCT).where("id", pkgId).first();
  if (!existing) throw new Error(`Không tìm thấy gói sản phẩm #${pkgId}`);

  await db(TABLES.PACKAGE_PRODUCT).where("id", pkgId).del();

  const result = {
    success: true,
    id: pkgId,
  };

  eventBus.emit(EVENTS.PACKAGE_PRODUCT_DELETED, result);
  return result;
};

/**
 * Lấy toàn bộ danh sách tên sản phẩm trong bảng Master Catalog (warehouse.product_names)
 */
const getAllCatalogProductNames = async () => {
  const list = await db(TABLES.PRODUCT_NAMES)
    .select("id", "name", "is_package", "login_url")
    .orderBy("name", "asc");

  return list.map((item) => ({
    id: item.id,
    name: item.name,
    isPackage: Boolean(item.is_package),
    loginUrl: item.login_url || null,
  }));
};

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

