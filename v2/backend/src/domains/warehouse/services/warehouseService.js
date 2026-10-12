const { db } = require("@/db");
const { TABLES } = require("@/db/tables");
const { getVietnamDateString } = require("@/utils/time");

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
      "ss.stock_id",
      "ss.name_id",
      "pn.name as display_name",
      "ss.password_encrypted as password",
      "ss.backup_email",
      "ss.two_fa_encrypted as two_fa",
      "ss.expires_at",
      "ss.status",
      "ss.note",
      "ss.created_at",
      "ss.updated_at"
    )
    .whereIn("ss.stock_id", stockIds)
    .orderBy("ss.id", "asc");

  const servicesByStock = new Map();
  services.forEach((srv) => {
    const sId = Number(srv.stock_id);
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
      status: srv.status === "UNAVAILABLE" ? "IN_USE" : (srv.status || "AVAILABLE"),
      note: srv.note || "",
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

      await trx(TABLES.STOCK_SERVICES).insert({
        stock_id: stockId,
        name_id: nameId,
        password_encrypted: slot.password || null,
        backup_email: slot.backup_email || null,
        two_fa_encrypted: slot.two_fa || null,
        expires_at: slot.expires_at ? new Date(slot.expires_at) : null,
        status: slot.status || "AVAILABLE",
        note: slot.note || null,
        created_at: now,
        updated_at: now,
      });
    }

    return { id: stockId, account: normalizedAccount };
  });
};

/**
 * Xóa tài khoản kho và các dịch vụ con
 */
const deleteWarehouseAccount = async (id) => {
  const stockId = Number(id);
  if (!stockId) throw new Error("ID tài khoản kho không hợp lệ!");

  return await db.transaction(async (trx) => {
    await trx(TABLES.STOCK_SERVICES).where("stock_id", stockId).del();
    const deletedCount = await trx(TABLES.PRODUCT_KEYS).where("id", stockId).del();
    return { success: true, deleted: deletedCount > 0 };
  });
};

/**
 * Lấy danh mục dịch vụ (Catalog) kèm số lượng slot tồn kho
 */
const listCatalogItems = async () => {
  const pNames = await db(TABLES.PRODUCT_NAMES).select("id", "name").orderBy("id", "asc");

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
      inStockSlots: stats.inStock,
      reservedSlots: stats.reserved,
      status,
    };
  });
};

/**
 * Tạo dịch vụ mới trong danh mục
 */
const createCatalogItem = async ({ name, category, productId = null }) => {
  const title = (name || category || "").trim();
  if (!title) throw new Error("Tên dịch vụ không được để trống!");

  const existing = await db(TABLES.PRODUCT_NAMES)
    .whereRaw("LOWER(name) = ?", [title.toLowerCase()])
    .first();

  if (existing) {
    return existing;
  }

  const [inserted] = await db(TABLES.PRODUCT_NAMES)
    .insert({
      name: title,
      product_id: productId || null,
    })
    .returning("*");

  return inserted;
};

module.exports = {
  listWarehouseAccounts,
  createWarehouseAccount,
  deleteWarehouseAccount,
  listCatalogItems,
  createCatalogItem,
};
