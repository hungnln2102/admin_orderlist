const crypto = require("crypto");
const { db, withTransaction } = require("@/db");
const { TABLES, COLS } = require("@/db/tables");
const { getPackageProducts, deletePackageProduct } = require("./packageProductService");
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

  const K = COLS.ACTIVATION_KEYS;
  const O = COLS.ORDER_LIST;
  const keyScope = () => db({ ak: TABLES.ACTIVATION_KEYS })
    .leftJoin({ o: TABLES.ORDER_LIST }, `o.${O.ID_ORDER}`, `ak.${K.ID_ORDER}`);
  const effectiveStatus = db.raw("CASE WHEN ?? = ? AND ?? <> ? THEN ? ELSE ?? END", [
    `o.${O.STATUS}`, ORDER_STATUS.EXPIRED, `ak.${K.STATUS}`, "REVOKED", "EXPIRED", `ak.${K.STATUS}`,
  ]);
  const effectiveCustomer = db.raw("CASE WHEN ?? IS NULL THEN ?? ELSE NULLIF(CONCAT_WS(' ', NULLIF(??, ''), CASE WHEN NULLIF(??, '') IS NOT NULL THEN CONCAT('(', ??, ')') END), '') END", [
    `o.${O.ID}`, `ak.${K.CUSTOMER_INFO}`, `o.${O.CUSTOMER}`, `o.${O.CONTACT}`, `o.${O.CONTACT}`,
  ]);
  let query = keyScope()
    .leftJoin(`${TABLES.PRODUCT_NAMES} as pn`, "pn.id", "ak.product_name_id")
    .leftJoin(`${TABLES.ACCOUNT_SLOTS} as ss`, "ss.id", "ak.account_slot_id")
    .select(
      "ak.id",
      "ak.key_code",
      "ak.product_name_id",
      `ak.${COLS.ACTIVATION_KEYS.TARGET_VARIANT_TAG}`,
      "pn.name as product_name",
      "ak.id_order",
      { status: effectiveStatus },
      "ak.account_slot_id",
      "ak.assigned_account",
      { customer_info: effectiveCustomer },
      "ak.activated_at",
      db.raw("CASE WHEN ?? IS NULL THEN ?? ELSE ?? END AS ??", [
        `ak.${K.ID_ORDER}`, `ak.${K.EXPIRED_AT}`, `o.${O.EXPIRED_AT}`, K.EXPIRED_AT,
      ]),
      "ak.note",
      "ak.created_by",
      "ak.created_at",
      "ak.updated_at",
      "ss.slot_index",
      "ss.password as slot_password"
    );

  let countQuery = keyScope();

  if (status && status !== "all") {
    const requestedStatus = status.toUpperCase();
    const keyStatuses = requestedStatus === "AVAILABLE" ? ["AVAILABLE", "INACTIVE"] : [requestedStatus];
    query = query.whereIn(effectiveStatus, keyStatuses);
    countQuery = countQuery.whereIn(effectiveStatus, keyStatuses);
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
        .orWhereRaw("LOWER(COALESCE(?, '')) LIKE ?", [effectiveCustomer, s]);
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
  const countsRaw = await keyScope()
    .select({ status: effectiveStatus })
    .count(`ak.${K.ID} as count`)
    .groupByRaw("1");

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
      counts.available += c;
    }
    if (st === "available") counts.available += c;
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

const parseRuleId = (value) => {
  const ruleId = Number(value);
  if (!["string", "number"].includes(typeof value) || !Number.isSafeInteger(ruleId) || ruleId < 1) {
    throw new Error("Vui lòng chọn quy tắc cấp key.");
  }
  return ruleId;
};

const eligibleOrderQuery = (connection) => {
  const O = COLS.ORDER_LIST;
  const K = COLS.ACTIVATION_KEYS;
  return connection({ o: TABLES.ORDER_LIST })
    .whereNotIn(`o.${O.STATUS}`, [ORDER_STATUS.CANCELED, ORDER_STATUS.EXPIRED])
    .whereRaw("UPPER(BTRIM(??)) NOT LIKE ?", [`o.${O.ID_ORDER}`, "MAVN%"])
    .whereRaw("COALESCE(BTRIM(??), '') = ''", [`o.${O.INFORMATION_ORDER}`])
    .whereNotExists(connection({ ak: TABLES.ACTIVATION_KEYS })
      .select(`ak.${K.ID}`)
      .whereRaw("UPPER(BTRIM(??)) = UPPER(BTRIM(??))", [`ak.${K.ID_ORDER}`, `o.${O.ID_ORDER}`]));
};

const listEligibleOrders = async ({ rule_id, search } = {}) => {
  const ruleId = parseRuleId(rule_id);
  const R = COLS.ACTIVATION_KEY_RULES;
  const O = COLS.ORDER_LIST;
  const selection = await db(TABLES.ACTIVATION_KEY_RULES).where(R.ID, ruleId)
    .first(R.VARIANT_ID, R.SUPPLIER_ID);
  if (!selection) return [];

  const { rule } = await resolveOrderActivationRule({
    variantId: selection[R.VARIANT_ID], supplierId: selection[R.SUPPLIER_ID],
  });
  if (Number(rule?.[R.ID]) !== ruleId) return [];

  const term = typeof search === "string" ? search.trim().toLowerCase() : "";
  return eligibleOrderQuery(db)
    .where({ [`o.${O.ID_PRODUCT}`]: rule[R.VARIANT_ID], [`o.${O.SUPPLY_ID}`]: rule[R.SUPPLIER_ID] })
    .modify((query) => {
      if (term) query.where((filter) => filter
        .whereRaw("STRPOS(LOWER(??), ?) > 0", [`o.${O.ID_ORDER}`, term])
        .orWhereRaw("STRPOS(LOWER(??), ?) > 0", [`o.${O.CUSTOMER}`, term]));
    })
    .orderBy(`o.${O.ID}`, "desc")
    .limit(50)
    .select(`o.${O.ID_ORDER}`, `o.${O.CUSTOMER}`);
};

const createActivationKeys = async (payload, user = null) => {
  const { rule_id, id_order } = payload || {};
  const ruleId = parseRuleId(rule_id);
  const orderCode = typeof id_order === "string" ? id_order.trim() : "";
  if (!orderCode) throw new Error("Vui lòng chọn đơn hàng.");
  if (Object.keys(payload).some((field) => !["rule_id", "id_order"].includes(field))) {
    throw new Error("Chỉ nhận quy tắc cấp key và mã đơn hàng.");
  }

  return withTransaction(async (trx) => {
    const K = COLS.ACTIVATION_KEYS;
    const R = COLS.ACTIVATION_KEY_RULES;
    const O = COLS.ORDER_LIST;
    const order = await eligibleOrderQuery(trx)
      .whereRaw("UPPER(BTRIM(??)) = ?", [`o.${O.ID_ORDER}`, orderCode.toUpperCase()])
      .forUpdate("o")
      .first();
    if (!order) throw new Error("Đơn hàng không đủ điều kiện cấp key.");

    const { rule } = await resolveOrderActivationRule({
      variantId: order[O.ID_PRODUCT], supplierId: order[O.SUPPLY_ID],
    }, trx);
    if (Number(rule?.[R.ID]) !== ruleId) {
      throw new Error("Quy tắc cấp key không còn phù hợp với đơn hàng.");
    }

    let key;
    for (let attempt = 0; attempt < 5 && !key; attempt++) {
      [key] = await trx(TABLES.ACTIVATION_KEYS)
        .insert({
          [K.KEY_CODE]: generateOrderActivationKey(),
          [K.ID_ORDER]: order[O.ID_ORDER],
          [K.PRODUCT_NAME_ID]: rule[R.PRODUCT_NAME_ID],
          [K.TARGET_VARIANT_TAG]: rule[R.TARGET_VARIANT_TAG],
          [K.PRODUCT_ID]: rule.parent_product_id || null,
          [K.CREATED_BY]: user?.username || user?.email || "Admin",
        })
        .onConflict(K.KEY_CODE).ignore().returning("*");
    }
    if (!key) throw new Error("Không thể tạo mã kích hoạt.");

    await trx(TABLES.ORDER_LIST).where(O.ID, order[O.ID]).update({
      [O.INFORMATION_ORDER]: key[K.KEY_CODE],
      [O.UPDATED_AT]: trx.fn.now(),
    });
    await publishEventInTrx(trx, {
      eventName: EVENTS.ORDER_UPDATED,
      aggregateType: "ORDER",
      aggregateId: order[O.ID],
      action: "UPDATE",
      source: "ACTIVATION_KEY",
      changedFields: [O.INFORMATION_ORDER],
      payload: { orderId: order[O.ID], id_order: order[O.ID_ORDER], changed_fields: [O.INFORMATION_ORDER] },
    });
    return [key];
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
    if (key[K.ID_ORDER]) {
      throw new Error("Không thể xóa mã key đã gắn đơn hàng. Vui lòng chọn Thu hồi thay vì Xóa!");
    }
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
const activateKeyWithTransaction = async ({ keyCode, customerInfo = "", recovery, orderContact, rejectedSlot, validateReplacement }) => {
  const code = String(keyCode || "").trim().toUpperCase();
  if (!code) {
    throw new Error("Vui lòng nhập mã key kích hoạt!");
  }

  const validations = new Map();
  const runAllocation = async (trx) => {
    const keyCols = COLS.ACTIVATION_KEYS;
    const O = COLS.ORDER_LIST;
    const S = COLS.ACCOUNT_SLOTS;
    const A = COLS.ACCOUNTS;
    const pack = COLS.PACKAGE_PRODUCT;
    const findKey = (column) => trx(TABLES.ACTIVATION_KEYS)
      .whereRaw("UPPER(TRIM(??)) = ?", [column, code])
      .orderBy(keyCols.ID, "desc")
      .first(keyCols.ID, keyCols.ID_ORDER, keyCols.PRODUCT_NAME_ID);
    const candidate = await findKey(keyCols.KEY_CODE) || await findKey(keyCols.ID_ORDER);
    if (!candidate) {
      throw new Error(`Mã kích hoạt hoặc Mã đơn hàng "${code}" không tồn tại trên hệ thống!`);
    }

    // Luồng cập nhật thanh toán cũng khóa đơn hàng trước mã key.
    const orderCode = candidate[keyCols.ID_ORDER];
    // Package removal can update keys from other orders of the same product.
    await trx.raw("SELECT pg_advisory_xact_lock(hashtext(?), hashtext(?))", [
      "activation_key_package_allocation", String(candidate[keyCols.PRODUCT_NAME_ID]),
    ]);
    const order = orderCode
      ? await trx(TABLES.ORDER_LIST).where(O.ID_ORDER, orderCode).forUpdate().first()
      : null;
    const key = await trx(TABLES.ACTIVATION_KEYS)
      .where(keyCols.ID, candidate[keyCols.ID]).forUpdate().first();
    if (!key || key[keyCols.ID_ORDER] !== orderCode) {
      throw new Error("Mã kích hoạt đã thay đổi. Vui lòng thử lại.");
    }

    const wasAssigned = Boolean(key[keyCols.ACCOUNT_SLOT_ID] || key[keyCols.ASSIGNED_ACCOUNT]);
    if (order?.[O.STATUS] === ORDER_STATUS.EXPIRED) {
      throw new Error("Đơn hàng đã hết hạn sử dụng!");
    }
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

    if (!orderCode && (key.status === "EXPIRED" || (key.expired_at && new Date(key.expired_at) <= new Date()))) {
      throw new Error("Mã kích hoạt này đã hết hạn sử dụng!");
    }

    let targetTag = key[keyCols.TARGET_VARIANT_TAG];
    const previousPackageId = key[keyCols.PACKAGE_PRODUCT_ID];
    const lockPackages = () => trx(TABLES.PACKAGE_PRODUCT)
      .where(pack.PRODUCT_NAME_ID, key[keyCols.PRODUCT_NAME_ID])
      .orderBy(pack.ID, "asc")
      .forUpdate()
      .select(pack.ID, pack.ACCOUNT_SLOT_ID, pack.PROVIDER_BY_SLOT);

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

    const orderSlot = String(order?.[O.SLOT] || "").trim().toLowerCase();
    const packageManaged = Boolean(targetTag || previousPackageId);
    let missingSubscription;
    let rejectedPackageId;
    const enqueueMissingSubscription = async (replaced) => {
      if (!missingSubscription) return;
      const { enqueueAdobeMissingSubscription } = require("@/domains/notifications/telegram/dispatchers/adobeRecoveryNotifier");
      await enqueueAdobeMissingSubscription({ trx, orderCode, ...missingSubscription, replaced });
    };
    const quarantinePackage = async (packageId, slotId) => {
      await trx(TABLES.ACCOUNT_SLOTS).where(S.ID, slotId).update({
        [S.STATUS]: "UNAVAILABLE",
        [S.UPDATED_AT]: trx.fn.now(),
      });
      // The tag survives the FK reset and gives subsequent requests the same allocation scope.
      await trx(TABLES.ACTIVATION_KEYS).where(keyCols.PACKAGE_PRODUCT_ID, packageId).update({
        [keyCols.TARGET_VARIANT_TAG]: trx.raw("COALESCE(NULLIF(BTRIM(??), ''), ?)", [keyCols.TARGET_VARIANT_TAG, targetTag || null]),
        [keyCols.ACCOUNT_SLOT_ID]: slotId,
        [keyCols.UPDATED_AT]: trx.fn.now(),
      });
      await deletePackageProduct(packageId, trx);
    };
    const quarantineRejectedPackage = async (replaced) => {
      if (!missingSubscription) return;
      // Legacy keys can be linked through the order slot instead of the package FK.
      if (targetTag && !previousPackageId && !replaced) {
        await trx(TABLES.ACTIVATION_KEYS).where(keyCols.ID, key[keyCols.ID]).update({
          [keyCols.TARGET_VARIANT_TAG]: targetTag,
          [keyCols.ACCOUNT_SLOT_ID]: missingSubscription.slotId,
          [keyCols.UPDATED_AT]: trx.fn.now(),
        });
      }
      await quarantinePackage(rejectedPackageId, missingSubscription.slotId);
      await enqueueMissingSubscription(replaced);
    };
    const outOfStock = async () => {
      await quarantineRejectedPackage(false);
      return { replacementRequired: wasAssigned, outOfStock: true };
    };
    const resolveStatusProvider = (slot, providerBySlot) => {
      const configured = providerBySlot?.adobe_check;
      if (configured) {
        const { getActiveSlots } = require("@/domains/system/services/otpPortalDispatcher");
        const input = getActiveSlots().find((item) => item.slot_key === "adobe_check" && item.enabled !== false);
        if (input?.assigned_services?.includes(configured)) return configured;
      }
      if (slot[S.STATUS_PROVIDER_KEY]) {
        return slot[S.STATUS_CHECK_ENABLED] ? slot[S.STATUS_PROVIDER_KEY] : null;
      }
      return findAdobeStatusProvider({ variantId: order[O.ID_PRODUCT], supplierId: order[O.SUPPLY_ID] }, trx);
    };
    const lockedPackages = recovery === "replace" || (recovery && recovery !== "lookup" && targetTag)
      ? await lockPackages() : null;
    if (recovery) {
      let currentPackage = lockedPackages && previousPackageId
        ? lockedPackages.find((entry) => String(entry[pack.ID]) === String(previousPackageId))
        : previousPackageId
        ? await trx(TABLES.PACKAGE_PRODUCT)
          .where({ [pack.ID]: previousPackageId, [pack.PRODUCT_NAME_ID]: key[keyCols.PRODUCT_NAME_ID] })
          .forShare()
          .first(pack.ID, pack.ACCOUNT_SLOT_ID, pack.PROVIDER_BY_SLOT)
        : null;
      if (!currentPackage && !previousPackageId && (orderSlot || key[keyCols.ACCOUNT_SLOT_ID])) {
        const matches = await trx({ p: TABLES.PACKAGE_PRODUCT })
          .join({ ss: TABLES.ACCOUNT_SLOTS }, `ss.${S.ID}`, `p.${pack.ACCOUNT_SLOT_ID}`)
          .join({ a: TABLES.ACCOUNTS }, `a.${A.ID}`, `ss.${S.ACCOUNT_ID}`)
          .where(`p.${pack.PRODUCT_NAME_ID}`, key[keyCols.PRODUCT_NAME_ID])
          .where(`ss.${S.NAME_ID}`, key[keyCols.PRODUCT_NAME_ID])
          .modify((query) => {
            if (targetTag) query.whereRaw("BTRIM(??) = ?", [`ss.${S.VARIANT_TAG}`, targetTag]);
          })
          .modify((query) => {
            if (orderSlot) query.whereRaw("LOWER(TRIM(??)) = ?", [`a.${A.ACCOUNT_USERNAME}`, orderSlot]);
            else query.where(`ss.${S.ID}`, key[keyCols.ACCOUNT_SLOT_ID]);
          })
          .limit(2)
          .forShare("p")
          .select(`p.${pack.ID}`, `p.${pack.ACCOUNT_SLOT_ID}`, `p.${pack.PROVIDER_BY_SLOT}`);
        if (matches.length > 1) throw new Error("Ambiguous Adobe package for order slot.");
        [currentPackage] = matches;
      }
      if (!currentPackage && !targetTag && (previousPackageId || orderSlot)) {
        const R = COLS.ACTIVATION_KEY_RULES;
        const rule = await findMatchingKeyRule({
          variantId: order[O.ID_PRODUCT],
          supplierId: order[O.SUPPLY_ID],
        }, trx);
        if (String(rule?.[R.PRODUCT_NAME_ID]) === String(key[keyCols.PRODUCT_NAME_ID])) {
          targetTag = rule[R.TARGET_VARIANT_TAG];
        }
      }
      const slotId = currentPackage?.[pack.ACCOUNT_SLOT_ID] ||
        (!packageManaged && !targetTag && key[keyCols.ACCOUNT_SLOT_ID]);
      const assignedSlot = slotId && await trx({ slot: TABLES.ACCOUNT_SLOTS })
        .join({ account: TABLES.ACCOUNTS }, `account.${A.ID}`, `slot.${S.ACCOUNT_ID}`)
        .where(`slot.${S.ID}`, slotId)
        .where(`slot.${S.NAME_ID}`, key[keyCols.PRODUCT_NAME_ID])
        .modify((query) => {
          if (recovery === "replace") query.forUpdate("slot");
          else query.forShare();
        })
        .first(`slot.${S.PASSWORD}`, `slot.${S.STATUS_CHECK_ENABLED}`,
          `slot.${S.STATUS_PROVIDER_KEY}`, `slot.${S.VARIANT_TAG}`, `slot.${S.STATUS}`, `account.${A.ACCOUNT_USERNAME}`);
      if (assignedSlot && String(assignedSlot[S.STATUS] || "").toUpperCase() !== "UNAVAILABLE") {
        const assignedAccount = assignedSlot[A.ACCOUNT_USERNAME];
        const normalizedAccount = String(assignedAccount || "").trim().toLowerCase();
        const statusProviderKey = await resolveStatusProvider(assignedSlot, currentPackage?.[pack.PROVIDER_BY_SLOT]);
        if (recovery === "replace" && currentPackage && statusProviderKey === "fix_ades_status" && normalizedAccount &&
            ["expired", "not_found"].includes(rejectedSlot?.reason) &&
            String(rejectedSlot?.id) === String(slotId) &&
            String(rejectedSlot?.account || "").trim().toLowerCase() === normalizedAccount) {
          targetTag ||= String(assignedSlot[S.VARIANT_TAG] || "").trim();
          if (!targetTag) {
            const R = COLS.ACTIVATION_KEY_RULES;
            const rule = await findMatchingKeyRule({ variantId: order[O.ID_PRODUCT], supplierId: order[O.SUPPLY_ID] }, trx);
            if (String(rule?.[R.PRODUCT_NAME_ID]) === String(key[keyCols.PRODUCT_NAME_ID])) {
              targetTag = rule[R.TARGET_VARIANT_TAG];
            }
          }
          missingSubscription = { slotId, account: assignedAccount, reason: rejectedSlot.reason };
          rejectedPackageId = currentPackage[pack.ID];
        } else if (recovery !== "lookup" && recovery !== "replace") {
          const keyChanged = String(key[keyCols.ACCOUNT_SLOT_ID]) !== String(slotId) ||
            key[keyCols.ASSIGNED_ACCOUNT] !== assignedAccount ||
            Boolean(currentPackage && String(previousPackageId) !== String(currentPackage[pack.ID]));
          const orderChanged = order[O.SLOT] !== assignedAccount;
          if (keyChanged) {
            await trx(TABLES.ACTIVATION_KEYS).where(keyCols.ID, key[keyCols.ID]).update({
              [keyCols.ACCOUNT_SLOT_ID]: slotId,
              [keyCols.ASSIGNED_ACCOUNT]: assignedAccount,
              ...(currentPackage ? { [keyCols.PACKAGE_PRODUCT_ID]: currentPackage[pack.ID] } : {}),
              [keyCols.UPDATED_AT]: trx.fn.now(),
            });
          }
          if (orderChanged) await updateOrderAccount(assignedAccount);
          if (keyChanged || orderChanged) await publishOrderUpdated();
        }
        if (!missingSubscription) {
          return {
            account: assignedAccount,
            password: assignedSlot[S.PASSWORD] || "",
            statusProviderKey,
            slotId,
            packageBacked: Boolean(currentPackage),
          };
        }
      }
      if (recovery === "lookup" || (recovery === "replace" && !missingSubscription && !targetTag) ||
          (recovery === "check" && wasAssigned && !packageManaged && !targetTag)) {
        return { replacementRequired: true };
      }
      if ((packageManaged || missingSubscription) && !targetTag) return outOfStock();
    }

    if (!recovery && key.status === "ACTIVATED" && wasAssigned) {
      // Key đã dùng vẫn phải trả đủ thông tin để khách tra cứu lại tài khoản đã cấp.
      const assignedSlot = key.account_slot_id
        ? await trx(TABLES.ACCOUNT_SLOTS)
          .select(COLS.ACCOUNT_SLOTS.PASSWORD, COLS.ACCOUNT_SLOTS.BACKUP_EMAIL, COLS.ACCOUNT_SLOTS.TWO_FA, COLS.ACCOUNT_SLOTS.EXPIRED_AT,
            S.STATUS)
          .where(COLS.ACCOUNT_SLOTS.ID, key.account_slot_id)
          .first()
        : null;
      if (String(assignedSlot?.[S.STATUS] || "").toUpperCase() === "UNAVAILABLE") {
        throw new Error("Tài khoản đã ngừng cấp. Vui lòng sử dụng luồng khôi phục tài khoản.");
      }
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
        (!wasAssigned || String(item.id) !== String(previousPackageId)) &&
        String(item.id) !== String(rejectedPackageId)
      );
    }

    const needsValidation = Boolean(recovery && targetTag);
    if (needsValidation && typeof validateReplacement !== "function") {
      throw new Error("Thiếu bước xác minh tài khoản Adobe thay thế.");
    }
    const availableSlots = (targetTag && !availablePackages.length) ? [] : await trx(`${TABLES.ACCOUNT_SLOTS} as ss`)
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
          if (missingSubscription) {
            builder.whereNot(`ss.${S.ID}`, missingSubscription.slotId)
              .whereRaw("LOWER(BTRIM(??)) <> ?", [`acc.${A.ACCOUNT_USERNAME}`, missingSubscription.account.trim().toLowerCase()]);
          } else if (wasAssigned) {
            builder.whereRaw("LOWER(BTRIM(??)) <> ?", [`acc.${A.ACCOUNT_USERNAME}`,
              String(key[keyCols.ASSIGNED_ACCOUNT] || orderSlot).trim().toLowerCase()]);
          }
          builder.where((expiry) => expiry.whereNull(`ss.${S.EXPIRED_AT}`).orWhere(`ss.${S.EXPIRED_AT}`, ">", trx.fn.now()));
        }
      })
      .modify((builder) => {
        if (targetTag) {
          builder.whereRaw("UPPER(??) IS DISTINCT FROM ?", [`ss.${S.STATUS}`, "UNAVAILABLE"]);
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
      .modify((builder) => {
        if (!needsValidation) builder.limit(1);
      });

    let validatedStatus;
    let [slot] = availableSlots;
    if (needsValidation) {
      slot = null;
      const rejectedPackages = [];
      for (const candidate of availableSlots) {
        const candidatePackage = availablePackages.find((entry) => String(entry.warehouseSlotId) === String(candidate.slot_id));
        const statusProviderKey = await resolveStatusProvider(candidate, candidatePackage?.providerBySlot);
        if (statusProviderKey !== "fix_ades_status") {
          if (wasAssigned || missingSubscription) continue;
          slot = candidate;
          break;
        }
        const validationKey = JSON.stringify([candidatePackage?.id, candidate.slot_id, candidate.account_username, statusProviderKey]);
        if (!validations.has(validationKey)) {
          return { candidate: { validationKey, account: candidate.account_username, statusProviderKey } };
        }
        const status = validations.get(validationKey);
        if (["expired", "not_found"].includes(status?.status_type)) {
          rejectedPackages.push({ packageId: candidatePackage.id, slotId: candidate.slot_id });
        }
        if (status?.status_type !== "active") continue;
        slot = candidate;
        validatedStatus = status;
        break;
      }
      for (const rejected of rejectedPackages) {
        await quarantinePackage(rejected.packageId, rejected.slotId);
      }
    }

    if (!slot) {
      if (recovery) return outOfStock();
      throw new Error(
        "Hiện tại kho đã hết slot trống cho sản phẩm này. Vui lòng liên hệ Admin qua kênh hỗ trợ để được nạp thêm tài khoản!"
      );
    }

    const selectedPackage = availablePackages.find((item) => String(item.warehouseSlotId) === String(slot.slot_id));
    const packageId = selectedPackage?.id ?? null;
    const assignedAccount = slot.account_username;
    const orderCustomer = order
      ? [order[O.CUSTOMER], order[O.CONTACT] && `(${order[O.CONTACT]})`].filter(Boolean).join(" ")
      : null;
    const finalCustomer = String(order ? orderCustomer : (customerInfo || key.customer_info || "")).trim();

    // 3. Cập nhật slot trong Kho thành IN_USE
    if (!packageId) await trx(TABLES.ACCOUNT_SLOTS)
      .where("id", slot.slot_id)
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
        account_slot_id: slot.slot_id,
        ...(packageId ? {
          [keyCols.PACKAGE_PRODUCT_ID]: packageId,
          [keyCols.TARGET_VARIANT_TAG]: targetTag,
        } : {}),
        assigned_account: assignedAccount,
        ...(!orderCode ? { [keyCols.CUSTOMER_INFO]: finalCustomer || null } : {}),
        [keyCols.ACTIVATED_AT]: key[keyCols.ACTIVATED_AT] || trx.fn.now(),
        updated_at: trx.fn.now(),
      });

    if (order) await publishOrderUpdated();
    if (recovery) {
      await quarantineRejectedPackage(true);
      const statusProviderKey = await resolveStatusProvider(slot, selectedPackage?.providerBySlot);
      return {
        account: assignedAccount,
        password: slot.slot_password || "",
        replaced: wasAssigned,
        statusProviderKey,
        slotId: slot.slot_id,
        packageBacked: Boolean(packageId),
        ...(validatedStatus ? { validatedStatus } : {}),
      };
    }

    return {
      success: true,
      account: assignedAccount,
      password: slot.slot_password || "",
      backup_email: slot.backup_email || "",
      two_fa: slot.two_fa || "",
      slot_index: slot.slot_index,
      expired_at: slot.expired_at,
      id_order: key.id_order,
      message: `Kích hoạt thành công! Bạn đã được cấp tài khoản: ${assignedAccount}`,
    };
  };

  while (true) {
    const result = await withTransaction(runAllocation);
    if (!result.candidate) return result;
    const { validationKey, account, statusProviderKey } = result.candidate;
    const status = await validateReplacement({ account, statusProviderKey });
    validations.set(validationKey, status);
  }
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
  const S = COLS.ACCOUNT_SLOTS;
  const [packages, unavailableSlots] = await Promise.all([
    getPackageProducts(),
    db(TABLES.ACCOUNT_SLOTS)
      .whereIn(S.NAME_ID, rules.map((rule) => rule.product_name_id))
      .whereRaw("UPPER(??) = ?", [S.STATUS, "UNAVAILABLE"])
      .pluck(S.ID),
  ]);
  const unavailableSlotIds = new Set(unavailableSlots.map(Number));
  return rules.map((rule) => ({
    ...rule,
    available_slots_count: packages.reduce((count, item) =>
      item.productNameId === Number(rule.product_name_id) && matchesPackageTag(item, rule.target_variant_tag) &&
        !unavailableSlotIds.has(item.warehouseSlotId)
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
  const rule = adobeSource ? null : await findMatchingKeyRule(selection, connection);
  return { adobeSource, rule };
};

module.exports = {
  generateOrderActivationKey,
  listActivationKeys,
  listEligibleOrders,
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
