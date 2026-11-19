const crypto = require("crypto");
const { db } = require("@/db");
const { TABLES, COLS } = require("@/db/tables");

/**
 * Sinh chuỗi mã key ngẫu nhiên dạng: PREFIX-XXXX-XXXX
 * @param {string} prefix 
 * @returns {string}
 */
const generateRandomKeyCode = (prefix = "GPT") => {
  const cleanPrefix = String(prefix !== undefined && prefix !== null ? prefix : "GPT").trim().toUpperCase().replace(/[^A-Z0-9]/g, "") || "KEY";
  const part1 = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 chars
  const part2 = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 chars
  return `${cleanPrefix}-${part1}-${part2}`;
};

/**
 * Lấy danh sách mã kích hoạt có phân trang, bộ lọc và tìm kiếm
 */
const listActivationKeys = async ({
  page = 1,
  limit = 20,
  search = "",
  status = "all",
  productNameId = null,
} = {}) => {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Math.min(100, Number(limit) || 20));
  const offset = (p - 1) * l;

  let query = db(`${TABLES.ACTIVATION_KEYS} as ak`)
    .leftJoin(`${TABLES.PRODUCT_NAMES} as pn`, "pn.id", "ak.product_name_id")
    .leftJoin(`${TABLES.ACCOUNT_SLOTS} as ss`, "ss.id", "ak.account_slot_id")
    .select(
      "ak.id",
      "ak.key_code",
      "ak.product_name_id",
      "pn.name as product_name",
      "ak.id_order",
      "ak.status",
      "ak.account_slot_id",
      "ak.assigned_account",
      "ak.customer_info",
      "ak.activated_at",
      "ak.expired_at",
      "ak.note",
      "ak.created_by",
      "ak.created_at",
      "ak.updated_at",
      "ss.slot_index",
      "ss.password as slot_password"
    );

  let countQuery = db(`${TABLES.ACTIVATION_KEYS} as ak`);

  if (status && status !== "all") {
    query = query.where("ak.status", status.toUpperCase());
    countQuery = countQuery.where("ak.status", status.toUpperCase());
  }

  if (productNameId) {
    query = query.where("ak.product_name_id", Number(productNameId));
    countQuery = countQuery.where("ak.product_name_id", Number(productNameId));
  }

  if (search && String(search).trim()) {
    const s = `%${String(search).trim().toLowerCase()}%`;
    const searchFilter = function () {
      this.whereRaw("LOWER(ak.key_code) LIKE ?", [s])
        .orWhereRaw("LOWER(COALESCE(ak.id_order, '')) LIKE ?", [s])
        .orWhereRaw("LOWER(COALESCE(ak.assigned_account, '')) LIKE ?", [s])
        .orWhereRaw("LOWER(COALESCE(ak.customer_info, '')) LIKE ?", [s]);
    };
    query = query.where(searchFilter);
    countQuery = countQuery.where(searchFilter);
  }

  const [totalRes, items] = await Promise.all([
    countQuery.count("ak.id as total").first(),
    query.orderBy("ak.id", "desc").limit(l).offset(offset),
  ]);

  const total = Number(totalRes?.total) || 0;
  const totalPages = Math.ceil(total / l) || 1;

  // Thống kê nhanh counts
  const countsRaw = await db(TABLES.ACTIVATION_KEYS)
    .select("status")
    .count("id as count")
    .groupBy("status");

  const counts = {
    total: 0,
    available: 0,
    activated: 0,
    revoked: 0,
    expired: 0,
  };

  countsRaw.forEach((row) => {
    const st = String(row.status || "").toLowerCase();
    const c = Number(row.count) || 0;
    counts.total += c;
    if (st === "available") counts.available = c;
    else if (st === "activated") counts.activated = c;
    else if (st === "revoked") counts.revoked = c;
    else if (st === "expired") counts.expired = c;
  });

  return {
    data: items,
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages,
    },
    counts,
  };
};

/**
 * Tạo mới một hoặc nhiều mã kích hoạt
 */
const createActivationKeys = async (payload, user = null) => {
  const {
    prefix = "GPT",
    product_name_id,
    product_id = null,
    id_order = null,
    customer_info = null,
    quantity = 1,
    expired_at = null,
    note = null,
  } = payload || {};

  const qty = Math.max(1, Math.min(100, Number(quantity) || 1));
  const pNameId = Number(product_name_id);
  if (!pNameId) {
    throw new Error("Vui lòng chọn Sản phẩm / Dịch vụ áp dụng!");
  }

  // Xác minh product_name_id tồn tại
  const pName = await db(TABLES.PRODUCT_NAMES).where("id", pNameId).first();
  if (!pName) {
    throw new Error(`Không tìm thấy Sản phẩm kho với ID ${pNameId}`);
  }

  const keysToInsert = [];
  const now = new Date();
  const createdBy = user?.username || user?.email || "Admin";

  for (let i = 0; i < qty; i++) {
    const keyCode = generateRandomKeyCode(prefix || pName.name);
    keysToInsert.push({
      key_code: keyCode,
      product_name_id: pNameId,
      product_id: product_id ? Number(product_id) : null,
      id_order: id_order ? String(id_order).trim() : null,
      status: "AVAILABLE",
      customer_info: customer_info ? String(customer_info).trim() : null,
      expired_at: expired_at ? new Date(expired_at) : null,
      note: note ? String(note).trim() : null,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
    });
  }

  const inserted = await db(TABLES.ACTIVATION_KEYS)
    .insert(keysToInsert)
    .returning("*");

  return inserted;
};

/**
 * Thu hồi mã key
 */
const revokeActivationKey = async (id, reason = "") => {
  const keyId = Number(id);
  if (!keyId) throw new Error("ID mã key không hợp lệ!");

  const updated = await db(TABLES.ACTIVATION_KEYS)
    .where("id", keyId)
    .update({
      status: "REVOKED",
      note: db.raw("CONCAT(COALESCE(note, ''), ' | Thu hồi: ' || ?)", [String(reason || "Admin thu hồi")]),
      updated_at: db.fn.now(),
    })
    .returning("*");

  if (!updated || updated.length === 0) {
    throw new Error(`Không tìm thấy mã key #${keyId}`);
  }
  return updated[0];
};

/**
 * Xóa mã key chưa kích hoạt
 */
const deleteActivationKey = async (id) => {
  const keyId = Number(id);
  if (!keyId) throw new Error("ID mã key không hợp lệ!");

  const key = await db(TABLES.ACTIVATION_KEYS).where("id", keyId).first();
  if (!key) throw new Error(`Không tìm thấy mã key #${keyId}`);
  if (key.status === "ACTIVATED") {
    throw new Error("Không thể xóa mã key đã kích hoạt. Vui lòng chọn Thu hồi thay vì Xóa!");
  }

  await db(TABLES.ACTIVATION_KEYS).where("id", keyId).del();
  return { success: true, message: "Đã xóa mã key thành công!" };
};

/**
 * CẤP PHÁT SLOT TỰ ĐỘNG KHI KHÁCH NHẬP MÃ KEY (Transaction ACID)
 * - Khóa dòng Key và Slot (FOR UPDATE) chống race condition.
 * - Tìm slot AVAILABLE trong warehouse.account_slots của Sản phẩm đó.
 * - Chuyển slot sang IN_USE.
 * - Cập nhật orders.order_list.slot = account_username (nếu có id_order).
 * - Cập nhật activation_keys sang ACTIVATED.
 * - Trả về tài khoản cho khách.
 */
const activateKeyWithTransaction = async ({ keyCode, customerInfo = "" }) => {
  const code = String(keyCode || "").trim().toUpperCase();
  if (!code) {
    throw new Error("Vui lòng nhập mã key kích hoạt!");
  }

  return await db.transaction(async (trx) => {
    // 1. Tìm và khóa dòng mã key (Hỗ trợ tra cứu theo cả Mã Key hoặc Mã Đơn Hàng)
    let key = await trx(TABLES.ACTIVATION_KEYS)
      .whereRaw("UPPER(TRIM(key_code)) = ?", [code])
      .forUpdate()
      .first();

    if (!key) {
      key = await trx(TABLES.ACTIVATION_KEYS)
        .whereRaw("UPPER(TRIM(id_order)) = ?", [code])
        .orderBy("id", "desc")
        .forUpdate()
        .first();
    }

    if (!key) {
      throw new Error(`Mã kích hoạt hoặc Mã đơn hàng "${code}" không tồn tại trên hệ thống!`);
    }

    if (key.status === "ACTIVATED") {
      // Key đã dùng vẫn phải trả đủ thông tin để khách tra cứu lại tài khoản đã cấp.
      const assignedSlot = key.account_slot_id
        ? await trx(TABLES.ACCOUNT_SLOTS)
          .select(COLS.ACCOUNT_SLOTS.PASSWORD, COLS.ACCOUNT_SLOTS.BACKUP_EMAIL, COLS.ACCOUNT_SLOTS.TWO_FA, COLS.ACCOUNT_SLOTS.EXPIRED_AT)
          .where(COLS.ACCOUNT_SLOTS.ID, key.account_slot_id)
          .first()
        : null;
      return {
        success: true,
        already_activated: true,
        account: key.assigned_account,
        password: assignedSlot?.[COLS.ACCOUNT_SLOTS.PASSWORD] || "",
        backup_email: assignedSlot?.[COLS.ACCOUNT_SLOTS.BACKUP_EMAIL] || "",
        two_fa: assignedSlot?.[COLS.ACCOUNT_SLOTS.TWO_FA] || "",
        expired_at: assignedSlot?.[COLS.ACCOUNT_SLOTS.EXPIRED_AT] || null,
        activated_at: key.activated_at,
        id_order: key.id_order || null,
        message: `Mã key này đã được kích hoạt trước đó cho tài khoản ${key.assigned_account}.`,
      };
    }

    if (key.status === "REVOKED") {
      throw new Error("Mã kích hoạt này đã bị thu hồi hoặc vô hiệu hóa!");
    }

    if (key.status === "EXPIRED" || (key.expired_at && new Date(key.expired_at) < new Date())) {
      throw new Error("Mã kích hoạt này đã hết hạn sử dụng!");
    }

    // 2. Tìm 1 slot trống (AVAILABLE) trong kho thuộc sản phẩm này
    const availableSlot = await trx(`${TABLES.ACCOUNT_SLOTS} as ss`)
      .join(`${TABLES.PRODUCT_KEYS} as acc`, "acc.id", "ss.account_id")
      .select(
        "ss.id as slot_id",
        "ss.account_id",
        "ss.slot_index",
        "ss.password as slot_password",
        "ss.key_hint",
        "ss.backup_email",
        "ss.two_fa",
        "ss.status",
        "ss.expired_at",
        "acc.account_username"
      )
      .where("ss.name_id", key.product_name_id)
      .whereIn("ss.status", ["AVAILABLE", "available"])
      .orderBy("ss.id", "asc")
      .forUpdate()
      .first();

    if (!availableSlot) {
      throw new Error(
        "Hiện tại kho đã hết slot trống cho sản phẩm này. Vui lòng liên hệ Admin qua kênh hỗ trợ để được nạp thêm tài khoản!"
      );
    }

    const assignedAccount = availableSlot.account_username;
    const finalCustomer = String(customerInfo || key.customer_info || "").trim();

    // 3. Cập nhật slot trong Kho thành IN_USE
    await trx(TABLES.ACCOUNT_SLOTS)
      .where("id", availableSlot.slot_id)
      .update({
        status: "IN_USE",
        id_order: key.id_order || null,
        customer: finalCustomer || null,
        updated_at: trx.fn.now(),
      });

    // 4. Nếu có id_order: Cập nhật tài khoản vào cột `slot` của đơn hàng khách
    if (key.id_order) {
      await trx(TABLES.ORDER_LIST)
        .whereRaw("UPPER(TRIM(id_order)) = ?", [String(key.id_order).trim().toUpperCase()])
        .update({
          slot: assignedAccount,
          updated_at: trx.fn.now(),
        });
    }

    // 5. Cập nhật trạng thái mã Key thành ACTIVATED
    await trx(TABLES.ACTIVATION_KEYS)
      .where("id", key.id)
      .update({
        status: "ACTIVATED",
        account_slot_id: availableSlot.slot_id,
        assigned_account: assignedAccount,
        customer_info: finalCustomer || null,
        activated_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      });

    return {
      success: true,
      account: assignedAccount,
      password: availableSlot.slot_password || "",
      backup_email: availableSlot.backup_email || "",
      two_fa: availableSlot.two_fa || "",
      slot_index: availableSlot.slot_index,
      expired_at: availableSlot.expired_at,
      id_order: key.id_order,
      message: `Kích hoạt thành công! Bạn đã được cấp tài khoản: ${assignedAccount}`,
    };
  });
};

/**
 * Lấy danh sách quy tắc tự động cấp Activation Key theo Variant + NCC
 */
const listActivationKeyRules = async () => {
  const rules = await db(`${TABLES.ACTIVATION_KEY_RULES} as akr`)
    .join(`${TABLES.VARIANT} as v`, "v.id", "akr.variant_id")
    .leftJoin(`${TABLES.PRODUCT} as p`, "p.id", "v.product_id")
    .join(`${TABLES.SUPPLIER} as s`, "s.id", "akr.supplier_id")
    .join(`${TABLES.PRODUCT_NAMES} as pn`, "pn.id", "akr.product_name_id")
    .select(
      "akr.id",
      "akr.variant_id",
      "v.variant_name",
      "v.display_name as variant_display_name",
      "p.package_name as product_name",
      "akr.supplier_id",
      "s.supplier_name",
      "akr.product_name_id",
      "pn.name as target_warehouse_name",
      "akr.is_active",
      "akr.note",
      "akr.created_at",
      "akr.updated_at",
      db.raw(`(
        SELECT COUNT(*)::int 
        FROM ${TABLES.ACCOUNT_SLOTS} ss 
        WHERE ss.name_id = akr.product_name_id 
          AND UPPER(ss.status) = 'AVAILABLE'
      ) as available_slots_count`)
    )
    .orderBy("akr.id", "desc");

  return rules;
};

/**
 * Tạo mới hoặc cập nhật quy tắc cấp key theo Variant + NCC
 */
const saveActivationKeyRule = async ({ variant_id, supplier_id, product_name_id, is_active = true, note = "" }) => {
  const vId = Number(variant_id);
  const sId = Number(supplier_id);
  const pnId = Number(product_name_id);

  if (!vId || !sId || !pnId) {
    throw new Error("Vui lòng chọn đầy đủ Variant, Nhà cung cấp và Kho slot đích!");
  }

  const [variant, supplier, pName] = await Promise.all([
    db(TABLES.VARIANT).where("id", vId).first(),
    db(TABLES.SUPPLIER).where("id", sId).first(),
    db(TABLES.PRODUCT_NAMES).where("id", pnId).first(),
  ]);

  if (!variant) throw new Error(`Không tìm thấy Variant #${vId}`);
  if (!supplier) throw new Error(`Không tìm thấy Nhà cung cấp #${sId}`);
  if (!pName) throw new Error(`Không tìm thấy Kho slot #${pnId}`);

  const [saved] = await db(TABLES.ACTIVATION_KEY_RULES)
    .insert({
      variant_id: vId,
      supplier_id: sId,
      product_name_id: pnId,
      is_active: is_active !== false,
      note: note ? String(note).trim() : null,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .onConflict(["variant_id", "supplier_id"])
    .merge({
      product_name_id: pnId,
      is_active: is_active !== false,
      note: note ? String(note).trim() : null,
      updated_at: db.fn.now(),
    })
    .returning("*");

  return saved;
};

/**
 * Bật/Tắt nhanh trạng thái của quy tắc
 */
const toggleActivationKeyRule = async (id) => {
  const ruleId = Number(id);
  if (!ruleId) throw new Error("ID quy tắc không hợp lệ!");

  const existing = await db(TABLES.ACTIVATION_KEY_RULES).where("id", ruleId).first();
  if (!existing) throw new Error(`Không tìm thấy quy tắc #${ruleId}`);

  const [updated] = await db(TABLES.ACTIVATION_KEY_RULES)
    .where("id", ruleId)
    .update({
      is_active: !existing.is_active,
      updated_at: db.fn.now(),
    })
    .returning("*");

  return updated;
};

/**
 * Xóa một quy tắc cấp key
 */
const deleteActivationKeyRule = async (id) => {
  const ruleId = Number(id);
  if (!ruleId) throw new Error("ID quy tắc không hợp lệ!");

  const deletedCount = await db(TABLES.ACTIVATION_KEY_RULES).where("id", ruleId).del();
  if (!deletedCount) throw new Error(`Không tìm thấy quy tắc #${ruleId}`);

  return { success: true, message: "Đã xóa quy tắc cấu hình thành công!" };
};

/**
 * Tìm quy tắc đang active khớp với cặp Variant + Supplier khi tạo đơn
 */
const findMatchingKeyRule = async ({ variantId, supplierId }) => {
  if (!variantId || !supplierId) return null;

  return await db(`${TABLES.ACTIVATION_KEY_RULES} as akr`)
    .join(`${TABLES.VARIANT} as v`, "v.id", "akr.variant_id")
    .leftJoin(`${TABLES.PRODUCT} as p`, "p.id", "v.product_id")
    .select(
      "akr.*",
      "v.variant_name",
      "v.display_name as variant_display_name",
      "p.package_name as product_name"
    )
    .where("akr.variant_id", Number(variantId))
    .where("akr.supplier_id", Number(supplierId))
    .where("akr.is_active", true)
    .first();
};

module.exports = {
  generateRandomKeyCode,
  listActivationKeys,
  createActivationKeys,
  revokeActivationKey,
  deleteActivationKey,
  activateKeyWithTransaction,
  listActivationKeyRules,
  saveActivationKeyRule,
  toggleActivationKeyRule,
  deleteActivationKeyRule,
  findMatchingKeyRule,
};
