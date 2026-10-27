const { db } = require("@/db");
const { TABLES } = require("@/db/tables");
const { eventBus, EVENTS } = require("@/events");
const { getVietnamDateString } = require("@/utils/time");
const browserLauncherService = require("./browserLauncherService");

/**
 * Format date value sang chuỗi hiển thị DD/MM/YYYY
 */
const formatDateDisplay = (dateVal) => {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateVal);
  }
};

/**
 * Lấy danh sách toàn bộ tài khoản kho và các dịch vụ bên trong
 */
const listWarehouseAccounts = async () => {

  const stocks = await db(TABLES.PRODUCT_KEYS)
    .select("id", "account_username", "created_at")
    .orderBy("id", "desc");

  if (!stocks || stocks.length === 0) return [];

  const stockIds = stocks.map((s) => s.id);

  const services = await db(`${TABLES.STOCK_SERVICES} as ss`)
    .leftJoin(`${TABLES.PRODUCT_NAMES} as pn`, "pn.id", "ss.name_id")
    .select(
      "ss.id",
      "ss.account_id",
      "ss.name_id",
      "pn.name as display_name",
      "ss.password",
      "ss.backup_email",
      "ss.two_fa",
      "ss.expired_at as expires_at",
      "ss.status",
      "ss.service_note as note",
      "ss.session_is_authenticated",
      "ss.session_checked_at",
      "ss.created_at",
      "ss.updated_at"
    )
    .whereIn("ss.account_id", stockIds)
    .orderBy("ss.id", "asc");

  const servicesByStock = new Map();
  services.forEach((srv) => {
    const sId = Number(srv.account_id);
    if (!servicesByStock.has(sId)) {
      servicesByStock.set(sId, []);
    }
    servicesByStock.get(sId).push({
      id: Number(srv.id),
      display_name: srv.display_name || "Dịch vụ",
      category: srv.display_name || "Dịch vụ",
      password: srv.password || "",
      backup_email: srv.backup_email || "",
      two_fa: srv.two_fa || "",
      expires_at: formatDateDisplay(srv.expires_at),
      raw_expires_at: srv.expires_at ? new Date(srv.expires_at).toISOString().split("T")[0] : "",
      status: srv.status === "UNAVAILABLE" ? "IN_USE" : (srv.status || "AVAILABLE"),
      note: srv.note || "",
      is_authenticated: srv.session_is_authenticated === true,
      session_checked_at: srv.session_checked_at ? new Date(srv.session_checked_at).toISOString() : null,
    });
  });

  return stocks.map((s) => ({
    id: Number(s.id),
    account: s.account_username || "—",
    created_at: formatDateDisplay(s.created_at),
    updated_at: formatDateDisplay(s.created_at),
    services: servicesByStock.get(Number(s.id)) || [],
  }));
};

/**
 * Tạo mới tài khoản kho
 */
const createWarehouseAccount = async (payload) => {
  const {
    account,
    serviceName,
    category,
    password,
    backupEmail,
    twoFa,
    expiresAt,
    note,
    services = [],
  } = payload;

  if (!account || !String(account).trim()) {
    throw new Error("Tài khoản kho không được để trống!");
  }

  const normalizedAccount = String(account).trim().toLowerCase();

  return await db.transaction(async (trx) => {
    const now = new Date();

    const [stock] = await trx(TABLES.PRODUCT_KEYS)
      .insert({
        account_username: normalizedAccount,
        created_at: now,
      })
      .returning("*");

    const stockId = stock.id;

    // Chuẩn bị danh sách slot cần thêm
    const slotsToInsert = [...services];
    if (slotsToInsert.length === 0 && (serviceName || category || password)) {
      slotsToInsert.push({
        display_name: serviceName || category || "Dịch vụ",
        password,
        backup_email: backupEmail,
        two_fa: twoFa,
        expires_at: expiresAt ? new Date(expiresAt) : null,
        note,
        status: "AVAILABLE",
      });
    }

    for (const slot of slotsToInsert) {
      const slotName = slot.display_name || slot.category || "Dịch vụ";
      let pName = await trx(TABLES.PRODUCT_NAMES)
        .whereRaw("LOWER(name) = ?", [slotName.toLowerCase().trim()])
        .first();

      let nameId = pName?.id;
      if (!nameId) {
        const [insertedP] = await trx(TABLES.PRODUCT_NAMES)
          .insert({ name: slotName.trim() })
          .returning("id");
        nameId = insertedP.id || insertedP;
      }

      const existingService = await trx(TABLES.STOCK_SERVICES)
        .where({ account_id: stockId, name_id: nameId })
        .first();

      if (existingService) {
        await trx(TABLES.STOCK_SERVICES)
          .where({ id: existingService.id })
          .update({
            password: slot.password || existingService.password,
            backup_email: slot.backup_email || existingService.backup_email,
            two_fa: slot.two_fa || existingService.two_fa,
            expired_at: slot.expires_at ? new Date(slot.expires_at) : existingService.expired_at,
            status: slot.status || existingService.status || "AVAILABLE",
            service_note: slot.note || existingService.service_note,
            updated_at: now,
          });
      } else {
        await trx(TABLES.STOCK_SERVICES).insert({
          account_id: stockId,
          name_id: nameId,
          password: slot.password || null,
          backup_email: slot.backup_email || null,
          two_fa: slot.two_fa || null,
          expired_at: slot.expires_at ? new Date(slot.expires_at) : null,
          status: slot.status || "AVAILABLE",
          service_note: slot.note || null,
          created_at: now,
          updated_at: now,
        });
      }
    }

    const result = { id: stockId, account: normalizedAccount };
    eventBus.emit(EVENTS.WAREHOUSE_STOCK_CREATED, result);
    return result;
  });
};

/**
 * Xóa tài khoản kho và các dịch vụ con
 */
const deleteWarehouseAccount = async (id) => {
  const stockId = Number(id);
  if (!stockId) throw new Error("ID tài khoản kho không hợp lệ!");

  return await db.transaction(async (trx) => {
    await trx(TABLES.STOCK_SERVICES).where("account_id", stockId).del();
    const deletedCount = await trx(TABLES.PRODUCT_KEYS).where("id", stockId).del();
    return { success: true, deleted: deletedCount > 0 };
  });
};

/**
 * Lấy danh mục dịch vụ (Catalog) kèm số lượng slot tồn kho
 */
/**
 * Cập nhật tài khoản gốc (đổi tên/email tài khoản mẹ)
 */
const updateWarehouseAccount = async (id, payload) => {
  const stockId = Number(id);
  if (!stockId) throw new Error("ID tài khoản kho không hợp lệ!");

  const { account } = payload || {};
  if (!account || !String(account).trim()) {
    throw new Error("Tên/Email tài khoản kho không được để trống!");
  }

  const normalizedAccount = String(account).trim().toLowerCase();

  return await db.transaction(async (trx) => {
    const existing = await trx(TABLES.PRODUCT_KEYS).where("id", stockId).first();
    if (!existing) {
      throw new Error(`Không tìm thấy tài khoản kho với ID ${stockId}`);
    }

    await trx(TABLES.PRODUCT_KEYS)
      .where("id", stockId)
      .update({
        account_username: normalizedAccount,
      });

    const result = { id: stockId, account: normalizedAccount };
    eventBus.emit(EVENTS.WAREHOUSE_STOCK_UPDATED, {
      accountId: stockId,
      accountUsername: normalizedAccount,
    });

    return result;
  });
};

const listCatalogItems = async () => {
  const pNames = await db(TABLES.PRODUCT_NAMES)
    .select("id", "name", "login_url")
    .orderBy("id", "asc");

  const slotStats = await db(TABLES.STOCK_SERVICES)
    .select("name_id")
    .count("id as total_slots")
    .sum({ in_stock: db.raw("CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END") })
    .sum({ reserved: db.raw("CASE WHEN status = 'RESERVED' THEN 1 ELSE 0 END") })
    .groupBy("name_id");

  const statMap = new Map();
  slotStats.forEach((st) => {
    statMap.set(st.name_id, {
      total: Number(st.total_slots || 0),
      inStock: Number(st.in_stock || 0),
      reserved: Number(st.reserved || 0),
    });
  });

  return pNames.map((p) => {
    const stats = statMap.get(p.id) || { total: 0, inStock: 0, reserved: 0 };
    let status = "ACTIVE";
    if (stats.inStock === 0) status = "OUT_OF_STOCK";
    else if (stats.inStock <= 3) status = "LOW_STOCK";

    return {
      id: p.id,
      name: p.name,
      category: p.name,
      loginUrl: p.login_url || null,
      totalSlots: stats.total,
      inStockSlots: stats.inStock,
      reservedSlots: stats.reserved,
      status,
    };
  });
};

/**
 * Tạo dịch vụ mới trong danh mục
 */
const createCatalogItem = async ({ name, category, productId = null, loginUrl = null }) => {
  const title = (name || category || "").trim();
  if (!title) throw new Error("Tên dịch vụ không được để trống!");

  const existing = await db(TABLES.PRODUCT_NAMES)
    .whereRaw("LOWER(name) = ?", [title.toLowerCase()])
    .first();

  if (existing) {
    if (loginUrl && loginUrl.trim() && existing.login_url !== loginUrl.trim()) {
      await db(TABLES.PRODUCT_NAMES)
        .where("id", existing.id)
        .update({ login_url: loginUrl.trim() });
      existing.login_url = loginUrl.trim();
    }
    return existing;
  }

  const [inserted] = await db(TABLES.PRODUCT_NAMES)
    .insert({
      name: title,
      product_id: productId || null,
      login_url: loginUrl ? loginUrl.trim() : null,
    })
    .returning("*");

  eventBus.emit(EVENTS.WAREHOUSE_CATALOG_CREATED, inserted);

  return inserted;
};

/**
 * Xóa dịch vụ khỏi danh mục kho (chỉ khi kho hoàn toàn trống)
 */
const deleteCatalogItem = async (id) => {
  if (!id) throw new Error("ID dịch vụ không được để trống!");

  const existing = await db(TABLES.PRODUCT_NAMES).where("id", id).first();
  if (!existing) {
    throw new Error(`Không tìm thấy dịch vụ kho với ID ${id}!`);
  }

  // 1. Kiểm tra tồn kho slot (AVAILABLE, RESERVED hoặc bất kỳ slot nào)
  const slotStats = await db(TABLES.STOCK_SERVICES)
    .where("name_id", id)
    .count("id as total_slots")
    .sum({ in_stock: db.raw("CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END") })
    .sum({ reserved: db.raw("CASE WHEN status = 'RESERVED' THEN 1 ELSE 0 END") })
    .first();

  const totalSlots = Number(slotStats?.total_slots || 0);
  const inStock = Number(slotStats?.in_stock || 0);
  const reserved = Number(slotStats?.reserved || 0);

  if (inStock > 0 || reserved > 0 || totalSlots > 0) {
    throw new Error(
      `Kho dịch vụ "${existing.name}" vẫn còn ${totalSlots} slot (${inStock} tồn kho, ${reserved} đã giữ chỗ). Kho phải trống hoàn toàn (0 slot) mới có thể xóa!`
    );
  }

  // 2. Kiểm tra nếu đang có gói nào liên kết trong warehouse.package_products
  const packageCount = await db(TABLES.PACKAGE_PRODUCT)
    .where("product_name_id", id)
    .count("id as count")
    .first();

  if (Number(packageCount?.count || 0) > 0) {
    throw new Error(
      `Dịch vụ "${existing.name}" đang được liên kết trong kho gói (${packageCount.count} gói). Vui lòng gỡ liên kết trước khi xóa!`
    );
  }

  // 3. Tiến hành xóa khỏi warehouse.product_names
  await db(TABLES.PRODUCT_NAMES).where("id", id).del();

  const payload = {
    id: existing.id,
    name: existing.name,
  };

  eventBus.emit(EVENTS.WAREHOUSE_CATALOG_DELETED, payload);

  return {
    success: true,
    message: `Đã xóa dịch vụ "${existing.name}" khỏi danh mục kho thành công.`,
    data: payload,
  };
};

/**
 * Mở trình duyệt Profile độc lập cho tài khoản kho
 */
const openAccountBrowser = async (accountId, { serviceName, slotId, userAgent } = {}) => {
  if (!accountId) {
    throw new Error("ID tài khoản kho không được để trống!");
  }

  const account = await db(TABLES.PRODUCT_KEYS).where("id", accountId).first();
  if (!account) {
    throw new Error(`Không tìm thấy tài khoản kho với ID ${accountId}!`);
  }

  let customUrl = null;
  let resolvedServiceName = serviceName || "";

  // 1. Nếu có slotId, truy vấn để lấy login_url từ warehouse.product_names
  let verifiedSlotId = null;
  if (slotId) {
    const slot = await db(TABLES.STOCK_SERVICES)
      .where({ id: slotId, account_id: account.id })
      .first();
    if (slot && slot.name_id) {
      verifiedSlotId = slot.id;
      const pName = await db(TABLES.PRODUCT_NAMES).where("id", slot.name_id).first();
      if (pName) {
        customUrl = pName.login_url;
        resolvedServiceName = resolvedServiceName || pName.name;
      }
    }
  }

  // 2. Nếu chưa có customUrl, thử tìm theo resolvedServiceName
  if (!customUrl && resolvedServiceName) {
    const pName = await db(TABLES.PRODUCT_NAMES)
      .whereRaw("LOWER(name) = ?", [resolvedServiceName.trim().toLowerCase()])
      .first();
    if (pName && pName.login_url) {
      customUrl = pName.login_url;
    }
  }

  const launchResult = await browserLauncherService.launchAccountBrowser({
    accountId: account.id,
    accountUsername: account.account_username,
    serviceName: resolvedServiceName,
    customUrl,
    userAgent,
  });

  if (verifiedSlotId) {
    await db(TABLES.STOCK_SERVICES)
      .where("id", verifiedSlotId)
      .update({
        session_is_authenticated: launchResult.data?.hasAuthenticatedSession === true,
        session_checked_at: new Date(),
        updated_at: new Date(),
      });
  }

  return launchResult;
};

/**
 * Cập nhật thông tin dịch vụ slot (password, backup_email, two_fa, expires_at, status, service_note)
 * và optionally cập nhật account_username của tài khoản mẹ
 */
const updateWarehouseServiceSlot = async (slotId, payload) => {
  const numericSlotId = Number(slotId);
  if (!numericSlotId) {
    throw new Error("ID slot dịch vụ không hợp lệ!");
  }

  const {
    password,
    backupEmail,
    twoFa,
    expiresAt,
    status,
    note,
    accountUsername,
  } = payload;

  return await db.transaction(async (trx) => {
    const existingSlot = await trx(TABLES.STOCK_SERVICES)
      .where("id", numericSlotId)
      .first();

    if (!existingSlot) {
      throw new Error(`Không tìm thấy slot dịch vụ với ID ${numericSlotId}`);
    }

    const now = new Date();
    const updateData = {
      updated_at: now,
    };

    if (password !== undefined) updateData.password = password || null;
    if (backupEmail !== undefined) updateData.backup_email = backupEmail || null;
    if (twoFa !== undefined) updateData.two_fa = twoFa || null;
    if (note !== undefined) updateData.service_note = note || null;
    if (status !== undefined) {
      updateData.status = status;
    }

    if (expiresAt !== undefined) {
      if (!expiresAt || !String(expiresAt).trim()) {
        updateData.expired_at = null;
      } else {
        const s = String(expiresAt).trim();
        const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (dmyMatch) {
          const [, day, month, year] = dmyMatch;
          updateData.expired_at = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00.000Z`);
        } else {
          const d = new Date(s);
          updateData.expired_at = isNaN(d.getTime()) ? null : d;
        }
      }
    }

    await trx(TABLES.STOCK_SERVICES)
      .where("id", numericSlotId)
      .update(updateData);

    // Cập nhật account_username nếu có
    if (accountUsername && String(accountUsername).trim()) {
      const normalizedAccount = String(accountUsername).trim().toLowerCase();
      await trx(TABLES.PRODUCT_KEYS)
        .where("id", existingSlot.account_id)
        .update({
          account_username: normalizedAccount,
          updated_at: now,
        });
    }

    const updatedSlot = await trx(`${TABLES.STOCK_SERVICES} as ss`)
      .leftJoin(`${TABLES.PRODUCT_NAMES} as pn`, "pn.id", "ss.name_id")
      .select(
        "ss.id",
        "ss.account_id",
        "ss.name_id",
        "pn.name as display_name",
        "ss.password",
        "ss.backup_email",
        "ss.two_fa",
        "ss.expired_at as expires_at",
        "ss.status",
        "ss.service_note as note",
        "ss.updated_at"
      )
      .where("ss.id", numericSlotId)
      .first();

    const result = {
      id: Number(updatedSlot.id),
      account_id: Number(updatedSlot.account_id),
      display_name: updatedSlot.display_name || "Dịch vụ",
      password: updatedSlot.password || "",
      backup_email: updatedSlot.backup_email || "",
      two_fa: updatedSlot.two_fa || "",
      expires_at: formatDateDisplay(updatedSlot.expires_at),
      raw_expires_at: updatedSlot.expires_at ? new Date(updatedSlot.expires_at).toISOString().split("T")[0] : "",
      status: updatedSlot.status || "AVAILABLE",
      note: updatedSlot.note || "",
    };

    eventBus.emit(EVENTS.WAREHOUSE_STOCK_UPDATED, {
      slotId: numericSlotId,
      accountId: updatedSlot.account_id,
      updatedFields: updateData,
    });

    return result;
  });
};

module.exports = {
  listWarehouseAccounts,
  createWarehouseAccount,
  deleteWarehouseAccount,
  updateWarehouseAccount,
  updateWarehouseServiceSlot,
  listCatalogItems,
  createCatalogItem,
  deleteCatalogItem,
  openAccountBrowser,
};
