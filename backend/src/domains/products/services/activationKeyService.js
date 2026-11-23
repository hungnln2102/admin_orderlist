const crypto = require("crypto");
const { db, withTransaction } = require("@/db");
const { TABLES, COLS } = require("@/db/tables");
const { getPackageProducts } = require("./packageProductService");
const { EVENTS, publishEventInTrx } = require("@/events");
const { ORDER_STATUS } = require("@/constants/orderStatus");
const { findAdobeStatusProvider, findDirectAdobeSource } = require("@/domains/system/services/adobeOrderSourceService");

function matchesPackageTag(pack, targetTag) {
  return pack.variantTags?.includes(targetTag);
}

const generateOrderActivationKey = () =>
  `MAVKEY${crypto.randomInt(36 ** 6).toString(36).toUpperCase().padStart(6, "0")}`;

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
      `ak.${COLS.ACTIVATION_KEYS.TARGET_VARIANT_TAG}`,
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
    const requestedStatus = status.toUpperCase();
    const keyStatus = requestedStatus === "AVAILABLE" ? "INACTIVE" : requestedStatus;
    query = query.where("ak.status", keyStatus);
    countQuery = countQuery.where("ak.status", keyStatus);
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
    inactive: 0,
    activated: 0,
    revoked: 0,
    expired: 0,
  };

  countsRaw.forEach((row) => {
    const st = String(row.status || "").toLowerCase();
    const c = Number(row.count) || 0;
    counts.total += c;
    if (st === "inactive") {
      counts.inactive = c;
      counts.available = c;
    }
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
    keysToInsert.push({
      [COLS.ACTIVATION_KEYS.KEY_CODE]: generateOrderActivationKey(),
      product_name_id: pNameId,
      product_id: product_id ? Number(product_id) : null,
      id_order: id_order ? String(id_order).trim() : null,
      status: "INACTIVE",
      customer_info: customer_info ? String(customer_info).trim() : null,
      expired_at: expired_at ? new Date(expired_at) : null,
      note: note ? String(note).trim() : null,
      created_by: createdBy,
      created_at: now,
      updated_at: now,
    });
  }

  return db.transaction(async (trx) => {
    const inserted = [];
    const keyColumn = COLS.ACTIVATION_KEYS.KEY_CODE;
    let pending = keysToInsert;
    for (let attempt = 0; attempt < 5 && pending.length; attempt++) {
      const batch = await trx(TABLES.ACTIVATION_KEYS)
        .insert(pending)
        .onConflict(keyColumn)
        .ignore()
        .returning("*");
      inserted.push(...batch);
      pending = pending.slice(batch.length).map((key) => ({
        ...key,
        [keyColumn]: generateOrderActivationKey(),
      }));
    }
    if (pending.length) throw new Error("Không thể tạo mã kích hoạt.");
    return inserted;
  });
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

  return db.transaction(async (trx) => {
    const K = COLS.ACTIVATION_KEYS;
    const key = await trx(TABLES.ACTIVATION_KEYS).where(K.ID, keyId).forUpdate().first();
    if (!key) throw new Error(`Không tìm thấy mã key #${keyId}`);
    if (key[K.STATUS] === "ACTIVATED") {
      throw new Error("Không thể xóa mã key đã kích hoạt. Vui lòng chọn Thu hồi thay vì Xóa!");
    }

    await trx(TABLES.ACTIVATION_KEYS).where(K.ID, keyId).del();
    return { success: true, message: "Đã xóa mã key thành công!" };
  });
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
const activateKeyWithTransaction = async ({ keyCode, customerInfo = "", recovery, orderContact }) => {
  const code = String(keyCode || "").trim().toUpperCase();
  if (!code) {
    throw new Error("Vui lòng nhập mã key kích hoạt!");
  }

  return withTransaction(async (trx) => {
    const keyCols = COLS.ACTIVATION_KEYS;
    const O = COLS.ORDER_LIST;
    const S = COLS.ACCOUNT_SLOTS;
    const A = COLS.ACCOUNTS;
    const pack = COLS.PACKAGE_PRODUCT;
    const findKey = (column) => trx(TABLES.ACTIVATION_KEYS)
      .whereRaw("UPPER(TRIM(??)) = ?", [column, code])
      .orderBy(keyCols.ID, "desc")
      .first(keyCols.ID, keyCols.ID_ORDER);
    const candidate = await findKey(keyCols.KEY_CODE) || await findKey(keyCols.ID_ORDER);
    if (!candidate) {
      throw new Error(`Mã kích hoạt hoặc Mã đơn hàng "${code}" không tồn tại trên hệ thống!`);
    }

    // Luồng cập nhật thanh toán cũng khóa đơn hàng trước mã key.
    const orderCode = candidate[keyCols.ID_ORDER];
    const order = orderCode
      ? await trx(TABLES.ORDER_LIST).where(O.ID_ORDER, orderCode).forUpdate().first()
      : null;
    const key = await trx(TABLES.ACTIVATION_KEYS)
      .where(keyCols.ID, candidate[keyCols.ID]).forUpdate().first();
    if (!key || key[keyCols.ID_ORDER] !== orderCode) {
      throw new Error("Mã kích hoạt đã thay đổi. Vui lòng thử lại.");
    }

    const wasAssigned = Boolean(key[keyCols.ACCOUNT_SLOT_ID] || key[keyCols.ASSIGNED_ACCOUNT]);
    const paidOrder = order && [ORDER_STATUS.PAID, ORDER_STATUS.RENEW_REQUIRED].includes(order[O.STATUS]);
    const checkKey = String(key[keyCols.KEY_CODE] || "").trim().toUpperCase() === code;
    if (recovery) {
      const contact = String(orderContact || "").trim().toLowerCase();
      if (!checkKey && !contact) return { contactRequired: true };
      const P = COLS.PRODUCT_NAMES;
      const product = await trx(TABLES.PRODUCT_NAMES).where(P.ID, key[keyCols.PRODUCT_NAME_ID]).first(P.NAME);
      if (key[keyCols.STATUS] !== "ACTIVATED" || !paidOrder ||
          !(new Date(order[O.EXPIRED_AT]) > new Date()) ||
          !/^adobe\b/i.test(product?.[P.NAME] || "") ||
          (!checkKey && contact !== String(order[O.CONTACT] || "").trim().toLowerCase())) {
        throw new Error("Không xác minh được quyền sử dụng tài khoản.");
      }
    } else if (orderCode && !paidOrder) {
      throw new Error("Mã kích hoạt này chưa được thanh toán.");
    }

    if (!recovery && !checkKey && orderCode) {
      const P = COLS.PRODUCT_NAMES;
      const product = await trx(TABLES.PRODUCT_NAMES).where(P.ID, key[keyCols.PRODUCT_NAME_ID]).first(P.NAME);
      const contact = String(customerInfo || "").trim().toLowerCase();
      if (/^adobe\b/i.test(product?.[P.NAME] || "") &&
          (!contact || contact !== String(order[O.CONTACT] || "").trim().toLowerCase())) {
        throw new Error("Không xác minh được quyền sử dụng tài khoản.");
      }
    }

    if (key.status === "EXPIRED" || (key.expired_at && new Date(key.expired_at) <= new Date())) {
      throw new Error("Mã kích hoạt này đã hết hạn sử dụng!");
    }

    const targetTag = key[keyCols.TARGET_VARIANT_TAG];
    const previousPackageId = key[keyCols.PACKAGE_PRODUCT_ID];
    const lockPackages = () => trx(TABLES.PACKAGE_PRODUCT)
      .where(pack.PRODUCT_NAME_ID, key[keyCols.PRODUCT_NAME_ID])
      .orderBy(pack.ID, "asc")
      .forUpdate()
      .select(pack.ID, pack.ACCOUNT_SLOT_ID);

    const updateOrderAccount = async (assignedAccount) => {
      if (!order || order[O.SLOT] === assignedAccount) return;
      await trx(TABLES.ORDER_LIST).where(O.ID, order[O.ID]).update({
        [O.SLOT]: assignedAccount,
        [O.UPDATED_AT]: trx.fn.now(),
      });
    };
    const publishOrderUpdated = () => publishEventInTrx(trx, {
      eventName: EVENTS.ORDER_UPDATED,
      aggregateType: "ORDER",
      aggregateId: order[O.ID],
      action: "UPDATE",
      source: recovery ? "ADOBE_ACCOUNT_RECOVERY" : "ACTIVATION_KEY",
      payload: { id: order[O.ID], id_order: orderCode },
    });

    const packageManaged = Boolean(targetTag || previousPackageId);
    const resolveStatusProvider = (slot) => {
      if (slot[S.STATUS_PROVIDER_KEY]) {
        return slot[S.STATUS_CHECK_ENABLED] ? slot[S.STATUS_PROVIDER_KEY] : null;
      }
      return findAdobeStatusProvider({ variantId: order[O.ID_PRODUCT], supplierId: order[O.SUPPLY_ID] }, trx);
    };
    const lockedPackages = recovery && recovery !== "lookup" && targetTag ? await lockPackages() : null;
    if (recovery) {
      const currentPackage = lockedPackages
        ? lockedPackages.find((entry) => String(entry[pack.ID]) === String(previousPackageId))
        : previousPackageId
        ? await trx(TABLES.PACKAGE_PRODUCT)
          .where({ [pack.ID]: previousPackageId, [pack.PRODUCT_NAME_ID]: key[keyCols.PRODUCT_NAME_ID] })
          .forShare()
          .first(pack.ACCOUNT_SLOT_ID)
        : null;
      const slotId = packageManaged ? currentPackage?.[pack.ACCOUNT_SLOT_ID] : key[keyCols.ACCOUNT_SLOT_ID];
      const assignedSlot = slotId && await trx({ slot: TABLES.ACCOUNT_SLOTS })
        .join({ account: TABLES.ACCOUNTS }, `account.${A.ID}`, `slot.${S.ACCOUNT_ID}`)
        .where(`slot.${S.ID}`, slotId)
        .where(`slot.${S.NAME_ID}`, key[keyCols.PRODUCT_NAME_ID])
        .forShare()
        .first(`slot.${S.PASSWORD}`, `slot.${S.STATUS_CHECK_ENABLED}`,
          `slot.${S.STATUS_PROVIDER_KEY}`, `account.${A.ACCOUNT_USERNAME}`);
      if (assignedSlot) {
        const assignedAccount = assignedSlot[A.ACCOUNT_USERNAME];
        if (recovery !== "lookup") {
          const keyChanged = String(key[keyCols.ACCOUNT_SLOT_ID]) !== String(slotId) ||
            key[keyCols.ASSIGNED_ACCOUNT] !== assignedAccount;
          const orderChanged = order[O.SLOT] !== assignedAccount;
          if (keyChanged) {
            await trx(TABLES.ACTIVATION_KEYS).where(keyCols.ID, key[keyCols.ID]).update({
              [keyCols.ACCOUNT_SLOT_ID]: slotId,
              [keyCols.ASSIGNED_ACCOUNT]: assignedAccount,
              [keyCols.UPDATED_AT]: trx.fn.now(),
            });
          }
          if (orderChanged) await updateOrderAccount(assignedAccount);
          if (keyChanged || orderChanged) await publishOrderUpdated();
        }
        const statusProviderKey = await resolveStatusProvider(assignedSlot);
        return { account: assignedAccount, password: assignedSlot[S.PASSWORD] || "", statusProviderKey };
      }
      if (recovery === "lookup" || (recovery === "check" && wasAssigned && !packageManaged)) {
        return { replacementRequired: true };
      }
      if (packageManaged && !targetTag) return { replacementRequired: wasAssigned, outOfStock: true };
    }

    if (!recovery && key.status === "ACTIVATED" && wasAssigned) {
      // Key đã dùng vẫn phải trả đủ thông tin để khách tra cứu lại tài khoản đã cấp.
      const assignedSlot = key.account_slot_id
        ? await trx(TABLES.ACCOUNT_SLOTS)
          .select(COLS.ACCOUNT_SLOTS.PASSWORD, COLS.ACCOUNT_SLOTS.BACKUP_EMAIL, COLS.ACCOUNT_SLOTS.TWO_FA, COLS.ACCOUNT_SLOTS.EXPIRED_AT,
            COLS.ACCOUNT_SLOTS.STATUS_CHECK_ENABLED, COLS.ACCOUNT_SLOTS.STATUS_PROVIDER_KEY)
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

    if (key.status !== "ACTIVATED") {
      throw new Error("Mã kích hoạt này chưa được thanh toán.");
    }

    // 2. Tìm 1 slot trống (AVAILABLE) trong kho thuộc sản phẩm này
    let availablePackages = [];
    if (targetTag && key.product_name_id) {
      if (!lockedPackages) await lockPackages();
      const packages = await getPackageProducts({ connection: trx, productNameId: key.product_name_id });
      availablePackages = packages.filter((item) =>
        matchesPackageTag(item, targetTag) && item.usedSlots < item.totalSlots &&
        (!wasAssigned || String(item.id) !== String(previousPackageId))
      );
    }

    const availableSlot = (targetTag && !availablePackages.length) ? null : await trx(`${TABLES.ACCOUNT_SLOTS} as ss`)
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
        "ss." + COLS.ACCOUNT_SLOTS.STATUS_CHECK_ENABLED,
        "ss." + COLS.ACCOUNT_SLOTS.STATUS_PROVIDER_KEY,
        "acc.account_username"
      )
      .where("ss.name_id", key.product_name_id)
      .modify((builder) => {
        if (recovery) {
          if (!packageManaged) builder.whereNot(`acc.${A.ACCOUNT_USERNAME}`, key[keyCols.ASSIGNED_ACCOUNT] || "");
          builder.where((expiry) => expiry.whereNull(`ss.${S.EXPIRED_AT}`).orWhere(`ss.${S.EXPIRED_AT}`, ">", trx.fn.now()));
        }
      })
      .modify((builder) => {
        if (targetTag) {
          builder.whereRaw(`BTRIM(ss.${COLS.ACCOUNT_SLOTS.VARIANT_TAG}) = ?`, [targetTag]);
          const slotIds = availablePackages.map((item) => item.warehouseSlotId);
          builder.whereIn(`ss.${S.ID}`, slotIds);
          builder.orderByRaw(`array_position(ARRAY[${slotIds.map(() => "?").join(", ")}]::bigint[], ??)`, [
            ...slotIds, `ss.${S.ID}`,
          ]);
        } else {
          builder.whereIn("ss.status", ["AVAILABLE", "available"]);
        }
      })
      .orderBy("ss.id", "asc")
      .forUpdate()
      .first();

    if (!availableSlot) {
      if (recovery) return { replacementRequired: wasAssigned, outOfStock: true };
      throw new Error(
        "Hiện tại kho đã hết slot trống cho sản phẩm này. Vui lòng liên hệ Admin qua kênh hỗ trợ để được nạp thêm tài khoản!"
      );
    }

    const packageId = availablePackages.find((item) => String(item.warehouseSlotId) === String(availableSlot.slot_id))?.id ?? null;
    const assignedAccount = availableSlot.account_username;
    const finalCustomer = String(customerInfo || key.customer_info || "").trim();

    // 3. Cập nhật slot trong Kho thành IN_USE
    if (!packageId) await trx(TABLES.ACCOUNT_SLOTS)
      .where("id", availableSlot.slot_id)
      .update({
        status: "IN_USE",
        id_order: key.id_order || null,
        customer: finalCustomer || null,
        updated_at: trx.fn.now(),
      });

    // 4. Nếu có id_order: Cập nhật tài khoản vào cột `slot` của đơn hàng khách
    await updateOrderAccount(assignedAccount);

    // 5. Cập nhật trạng thái mã Key thành ACTIVATED
    await trx(TABLES.ACTIVATION_KEYS)
      .where("id", key.id)
      .update({
        status: "ACTIVATED",
        account_slot_id: availableSlot.slot_id,
        ...(packageId ? { [keyCols.PACKAGE_PRODUCT_ID]: packageId } : {}),
        assigned_account: assignedAccount,
        customer_info: finalCustomer || null,
        [keyCols.ACTIVATED_AT]: key[keyCols.ACTIVATED_AT] || trx.fn.now(),
        updated_at: trx.fn.now(),
      });

    if (order) await publishOrderUpdated();
    if (recovery) {
      const statusProviderKey = await resolveStatusProvider(availableSlot);
      return { account: assignedAccount, password: availableSlot.slot_password || "", replaced: wasAssigned, statusProviderKey };
    }

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
      `akr.${COLS.ACTIVATION_KEY_RULES.TARGET_VARIANT_TAG}`,
      db.raw(`(
        akr.${COLS.ACTIVATION_KEY_RULES.IS_ACTIVE}
        AND akr.${COLS.ACTIVATION_KEY_RULES.TARGET_VARIANT_TAG} IS NOT NULL
      ) as is_active`),
      "akr.note",
      "akr.created_at",
      "akr.updated_at"
    )
    .orderBy("akr.id", "desc");

  if (!rules.length) return rules;
  const packages = await getPackageProducts();
  return rules.map((rule) => ({
    ...rule,
    available_slots_count: packages.reduce((count, item) =>
      item.productNameId === Number(rule.product_name_id) && matchesPackageTag(item, rule.target_variant_tag)
        ? count + Math.max(0, item.totalSlots - item.usedSlots)
        : count, 0),
  }));
};

/**
 * Tạo mới hoặc cập nhật quy tắc cấp key theo Variant + NCC
 */
const saveActivationKeyRule = async ({ variant_id, supplier_id, product_name_id, target_variant_tag, is_active = true, note = "" }, id) => {
  const vId = Number(variant_id);
  const sId = Number(supplier_id);
  const pnId = Number(product_name_id);
  const targetVariantTag = String(target_variant_tag || "").trim();

  if (!vId || !sId || !pnId || !targetVariantTag) {
    throw new Error("Vui lòng chọn đầy đủ Variant, Nhà cung cấp, Sản phẩm kho và Tag đích!");
  }

  const [variant, supplier, pName] = await Promise.all([
    db(TABLES.VARIANT).where("id", vId).first(),
    db(TABLES.SUPPLIER).where("id", sId).first(),
    db(TABLES.PRODUCT_NAMES).where("id", pnId).first(),
  ]);

  if (!variant) throw new Error(`Không tìm thấy Variant #${vId}`);
  if (!supplier) throw new Error(`Không tìm thấy Nhà cung cấp #${sId}`);
  if (!pName) throw new Error(`Không tìm thấy Kho slot #${pnId}`);

  const targetTagExists = await db(TABLES.ACCOUNT_SLOTS)
    .where(COLS.ACCOUNT_SLOTS.NAME_ID, pnId)
    .whereRaw("BTRIM(??) = ?", [COLS.ACCOUNT_SLOTS.VARIANT_TAG, targetVariantTag])
    .first(COLS.ACCOUNT_SLOTS.ID);
  if (!targetTagExists) {
    throw new Error(`Tag "${targetVariantTag}" không thuộc sản phẩm kho đã chọn.`);
  }

  if (id !== undefined) {
    const ruleId = Number(id);
    if (!Number.isSafeInteger(ruleId) || ruleId <= 0) throw new Error("ID quy tắc không hợp lệ.");
    const cols = COLS.ACTIVATION_KEY_RULES;
    try {
      const [updated] = await db(TABLES.ACTIVATION_KEY_RULES).where(cols.ID, ruleId).update({
        [cols.VARIANT_ID]: vId,
        [cols.SUPPLIER_ID]: sId,
        [cols.PRODUCT_NAME_ID]: pnId,
        [cols.TARGET_VARIANT_TAG]: targetVariantTag,
        [cols.IS_ACTIVE]: is_active !== false,
        [cols.NOTE]: note ? String(note).trim() : null,
        [cols.UPDATED_AT]: db.fn.now(),
      }).returning("*");
      if (!updated) throw new Error("Quy tắc cấp key không còn tồn tại.");
      return updated;
    } catch (error) {
      if (error.code === "23505") throw new Error("Sản phẩm và NCC này đã có quy tắc cấp key.");
      throw error;
    }
  }

  const [saved] = await db(TABLES.ACTIVATION_KEY_RULES)
    .insert({
      variant_id: vId,
      supplier_id: sId,
      product_name_id: pnId,
      [COLS.ACTIVATION_KEY_RULES.TARGET_VARIANT_TAG]: targetVariantTag,
      is_active: is_active !== false,
      note: note ? String(note).trim() : null,
      created_at: db.fn.now(),
      updated_at: db.fn.now(),
    })
    .onConflict(["variant_id", "supplier_id"])
    .merge({
      product_name_id: pnId,
      [COLS.ACTIVATION_KEY_RULES.TARGET_VARIANT_TAG]: targetVariantTag,
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
  const nextActive = !Boolean(existing[COLS.ACTIVATION_KEY_RULES.IS_ACTIVE]);
  if (!existing[COLS.ACTIVATION_KEY_RULES.TARGET_VARIANT_TAG] && nextActive) {
    throw new Error("Vui lòng sửa quy tắc và chọn tag trước khi kích hoạt.");
  }

  const [updated] = await db(TABLES.ACTIVATION_KEY_RULES)
    .where("id", ruleId)
    .update({
      [COLS.ACTIVATION_KEY_RULES.IS_ACTIVE]: nextActive,
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
const findMatchingKeyRule = async ({ variantId, supplierId }, connection = db) => {
  if (!variantId || !supplierId) return null;
  const R = COLS.ACTIVATION_KEY_RULES;
  const V = COLS.VARIANT;
  const P = COLS.PRODUCT;

  const query = connection(`${TABLES.ACTIVATION_KEY_RULES} as akr`)
    .join(`${TABLES.VARIANT} as v`, `v.${V.ID}`, `akr.${R.VARIANT_ID}`)
    .leftJoin(`${TABLES.PRODUCT} as p`, `p.${P.ID}`, `v.${V.PRODUCT_ID}`)
    .select(
      "akr.*",
      `v.${V.VARIANT_NAME}`,
      `v.${V.DISPLAY_NAME} as variant_display_name`,
      `p.${P.ID} as parent_product_id`,
      `p.${P.PACKAGE_NAME} as product_name`
    )
    .where(`akr.${R.VARIANT_ID}`, Number(variantId))
    .where(`akr.${R.SUPPLIER_ID}`, Number(supplierId))
    .where(`akr.${R.IS_ACTIVE}`, true)
    .whereNotNull(`akr.${R.TARGET_VARIANT_TAG}`);
  if (connection.isTransaction) query.forShare("akr");
  return query.first();
};

const resolveOrderActivationRule = async (selection, connection = db) => {
  const adobeSource = await findDirectAdobeSource(selection, connection);
  const rule = adobeSource === "yuna" ? null : await findMatchingKeyRule(selection, connection);
  return { adobeSource, rule };
};

module.exports = {
  generateOrderActivationKey,
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
  resolveOrderActivationRule,
};
