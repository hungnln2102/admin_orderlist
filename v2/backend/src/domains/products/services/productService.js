const { db } = require("@/db");
const { eventBus, EVENTS } = require("@/events");

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
    whereClause += " AND (v.display_name ILIKE ? OR v.variant_name ILIKE ?)";
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  const countSql = `
    SELECT COUNT(*) AS total
    FROM product.variant v
    ${whereClause}
  `;

  const dataSql = `
    SELECT
      v.id,
      v.display_name AS san_pham,
      v.variant_name AS package_product,
      v.base_price,
      v.is_active,
      COALESCE(p_retail.price, v.base_price, 0) AS retail_price,
      COALESCE(p_ctv.price, 0) AS ctv_price,
      COALESCE(p_student.price, 0) AS student_price,
      COALESCE(p_promo.price, 0) AS promo_price,
      p_retail.margin_ratio AS retail_margin_ratio,
      p_ctv.margin_ratio AS ctv_margin_ratio,
      v.updated_at
    FROM product.variant v
    LEFT JOIN product.variant_price p_retail ON p_retail.variant_id = v.id AND p_retail.tier_id = 2
    LEFT JOIN product.variant_price p_ctv ON p_ctv.variant_id = v.id AND p_ctv.tier_id = 1
    LEFT JOIN product.variant_price p_student ON p_student.variant_id = v.id AND p_student.tier_id = 4
    LEFT JOIN product.variant_price p_promo ON p_promo.variant_id = v.id AND p_promo.tier_id = 3
    ${whereClause}
    ORDER BY v.is_active DESC, v.display_name ASC
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
      sc.id AS supplier_cost_id,
      sc.variant_id,
      sc.supplier_id,
      s.supplier_name AS ncc_name,
      s.number_bank,
      COALESCE(sc.price, 0) AS gia_nhap,
      sc.updated_at
    FROM product.supplier_cost sc
    JOIN partner.supplier s ON s.id = sc.supplier_id
    WHERE sc.variant_id = ?
    ORDER BY sc.price ASC, s.supplier_name ASC;
  `;

  const result = await db.raw(query, [parsedId]);
  return (result.rows || []).map((r) => ({
    id: r.supplier_cost_id,
    variant_id: r.variant_id,
    supplier_id: r.supplier_id,
    ncc_name: r.ncc_name || "N/A",
    number_bank: r.number_bank || "",
    gia_nhap: parseFloat(r.gia_nhap || 0),
    updated_at: r.updated_at,
  }));
};

/**
 * Lấy danh mục tất cả Nhà Cung Cấp (Dropdown selection)
 */
const getAllSuppliersList = async () => {
  const query = `
    SELECT id, supplier_name AS ncc_name, number_bank
    FROM partner.supplier
    ORDER BY supplier_name ASC;
  `;
  const result = await db.raw(query);
  return result.rows || [];
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

  // Tim hoac tao product_id trong product.product
  let catalogProduct = await db("product.product")
    .whereRaw("LOWER(package_name) = LOWER(?)", [variantName || displayName])
    .first();

  if (!catalogProduct) {
    const firstProduct = await db("product.product").first();
    if (firstProduct) {
      catalogProduct = firstProduct;
    } else {
      const [newP] = await db("product.product")
        .insert({
          package_name: variantName || displayName,
          is_active: true,
          created_at: db.fn.now(),
          updated_at: db.fn.now(),
        })
        .returning("*");
      catalogProduct = newP;
    }
  }

  const [insertedVariant] = await db("product.variant")
    .insert({
      product_id: catalogProduct.id,
      display_name: displayName,
      variant_name: variantName,
      base_price: base_price || null,
      is_active: is_active ?? true,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .returning("*");

  const variantId = insertedVariant.id;

  // Insert tier prices (1: CTV, 2: Customer, 3: Promo, 4: Student)
  const tierPrices = [
    { variant_id: variantId, tier_id: 1, price: ctv_price || 0 },
    { variant_id: variantId, tier_id: 2, price: retail_price || 0 },
    { variant_id: variantId, tier_id: 3, price: promo_price || 0 },
    { variant_id: variantId, tier_id: 4, price: student_price || 0 },
  ].filter((p) => p.price > 0);

  if (tierPrices.length > 0) {
    await db("product.variant_price").insert(tierPrices);
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
  const oldVariant = await db("product.variant").where({ id: variantId }).first();
  if (!oldVariant) throw new Error("Sản phẩm không tồn tại");

  const oldPrices = await db("product.variant_price").where({ variant_id: variantId });
  const getOldPrice = (tierId) => {
    const found = oldPrices.find((p) => p.tier_id === tierId);
    return found ? parseFloat(found.price || 0) : 0;
  };

  const oldState = {
    san_pham: oldVariant.display_name || "",
    package_product: oldVariant.variant_name || "",
    base_price: parseFloat(oldVariant.base_price || 0),
    is_active: Boolean(oldVariant.is_active),
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

  const updateFields = { updated_at: db.fn.now() };
  if (san_pham !== undefined) updateFields.display_name = san_pham;
  if (package_product !== undefined) updateFields.variant_name = package_product;
  if (base_price !== undefined) updateFields.base_price = base_price || null;
  if (is_active !== undefined) updateFields.is_active = is_active;

  await db("product.variant").where({ id: variantId }).update(updateFields);

  // Update tier prices
  const upsertPrice = async (tierId, priceVal) => {
    if (priceVal === undefined) return;
    const existing = await db("product.variant_price")
      .where({ variant_id: variantId, tier_id: tierId })
      .first();

    if (existing) {
      await db("product.variant_price")
        .where({ variant_id: variantId, tier_id: tierId })
        .update({ price: priceVal || 0 });
    } else if (priceVal > 0) {
      await db("product.variant_price").insert({
        variant_id: variantId,
        tier_id: tierId,
        price: priceVal,
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

  const variant = await db("product.variant").where({ id: variantId }).first();
  if (!variant) throw new Error("Sản phẩm không tồn tại");

  await db("product.variant_price").where({ variant_id: variantId }).del();
  await db("product.supplier_cost").where({ variant_id: variantId }).del();
  await db("product.variant").where({ id: variantId }).del();

  const deletedPayload = {
    id: variantId,
    san_pham: variant.display_name,
    variant_name: variant.variant_name,
    summary: `Đã xóa hoàn toàn sản phẩm "${variant.display_name}" (${variant.variant_name}) khỏi hệ thống`,
  };

  // Emit Domain Event
  eventBus.emit(EVENTS.PRODUCT_DELETED, deletedPayload);

  return deletedPayload;
};

/**
 * Thêm giá nhập của Nhà Cung Cấp (NCC) cho sản phẩm
 */
const addSupplierCost = async (variantId, supplierId, price) => {
  const vId = parseInt(variantId, 10);
  const sId = parseInt(supplierId, 10);
  const costPrice = parseFloat(price || 0);

  const [inserted] = await db("product.supplier_cost")
    .insert({
      variant_id: vId,
      supplier_id: sId,
      price: costPrice,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .returning("*");

  const supplier = await db("partner.supplier").where({ id: sId }).first();
  const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v) + " ₫";

  eventBus.emit(EVENTS.PRODUCT_UPDATED, {
    id: vId,
    action: "ADD_SUPPLIER_COST",
    changed_fields: ["supplier_cost"],
    changes: {
      supplier_cost: {
        action: "ADD",
        supplier_id: sId,
        supplier_name: supplier?.supplier_name || "",
        price: costPrice,
      },
    },
    summary: `Thêm nguồn NCC "${supplier?.supplier_name || sId}" với giá nhập ${formatMoney(costPrice)}`,
  });

  return inserted;
};

/**
 * Xóa giá nhập của Nhà Cung Cấp (NCC)
 */
const deleteSupplierCost = async (supplierCostId) => {
  const scId = parseInt(supplierCostId, 10);

  const row = await db("product.supplier_cost").where({ id: scId }).first();
  if (!row) throw new Error("Bản ghi giá NCC không tồn tại");

  await db("product.supplier_cost").where({ id: scId }).del();

  eventBus.emit(EVENTS.PRODUCT_UPDATED, {
    id: row.variant_id,
    action: "DELETE_SUPPLIER_COST",
    changed_fields: ["supplier_cost"],
    changes: {
      supplier_cost: {
        action: "DELETE",
        supplier_cost_id: scId,
      },
    },
    summary: `Xóa nguồn NCC (bản ghi giá #${scId}) khỏi sản phẩm`,
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
  deleteSupplierCost,
};

