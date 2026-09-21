const { db, TABLES, COLS } = require("@/db");
const { eventBus, EVENTS } = require("@/events");

const V_COLS = COLS.VARIANT;
const VP_COLS = COLS.VARIANT_PRICE;
const SC_COLS = COLS.SUPPLIER_COST;
const S_COLS = COLS.SUPPLIER;
const P_COLS = COLS.PRODUCT;

/**
 * Service lấy danh sách giá sản phẩm (Bảng giá Niêm yết)
 * Bao gồm Giá Gốc, Giá Bán Lẻ, Giá CTV, Giá Sinh Viên, Giá Khuyến Mãi & % Lợi Nhuận
 */
const getProductPrices = async ({ page = 1, limit = 15, search = "" } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
  const offset = (pageNum - 1) * limitNum;

  let whereClause = "WHERE 1=1";
  const params = [];

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
    LEFT JOIN ${TABLES.VARIANT_PRICE} p_retail ON p_retail.${VP_COLS.VARIANT_ID} = v.${V_COLS.ID} AND p_retail.${VP_COLS.TIER_ID} = 2
    LEFT JOIN ${TABLES.VARIANT_PRICE} p_ctv ON p_ctv.${VP_COLS.VARIANT_ID} = v.${V_COLS.ID} AND p_ctv.${VP_COLS.TIER_ID} = 1
    LEFT JOIN ${TABLES.VARIANT_PRICE} p_student ON p_student.${VP_COLS.VARIANT_ID} = v.${V_COLS.ID} AND p_student.${VP_COLS.TIER_ID} = 4
    LEFT JOIN ${TABLES.VARIANT_PRICE} p_promo ON p_promo.${VP_COLS.VARIANT_ID} = v.${V_COLS.ID} AND p_promo.${VP_COLS.TIER_ID} = 3
    ${whereClause}
    ORDER BY v.${V_COLS.IS_ACTIVE} DESC, v.${V_COLS.DISPLAY_NAME} ASC
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

module.exports = {
  getProductPrices,
  getSuppliersForVariant,
  getAllSuppliersList,
  createProduct,
  updateProduct,
  deleteProduct,
  addSupplierCost,
  updateSupplierCost,
  deleteSupplierCost,
};
