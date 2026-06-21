const { db, withTransaction } = require("../../db");
const { normalizeDateInput } = require("../../utils/normalizers");
const { TABLES, ruleCols, stockCols, pkgCols, productCols } = require("./constants");
const logger = require("../../utils/logger");

/**
 * Doc rule cau hinh import-package theo productId.
 * Neu khong co rule thi tra ve null.
 */
const findRuleByProductId = async (trxOrDb, productId) => {
  const row = await (trxOrDb || db)(TABLES.rule)
    .where(ruleCols.productId, productId)
    .first();
  return row || null;
};

/**
 * Tao luon stock + package trong mot transaction.
 *
 * @param {object} payload
 * @param {number} payload.productId
 * @param {number|null} payload.supplierId
 * @param {number|null} payload.importPrice
 * @param {number|null} payload.slotLimit
 * @param {string|null} payload.matchMode  "information_order" | "slot"
 * @param {string|null} payload.account
 * @param {string|null} payload.password
 * @param {string|null} payload.backup_email
 * @param {string|null} payload.two_fa
 * @param {string|null} payload.expires_at
 * @param {string|null} payload.note
 * @returns {{ stock: object, pkg: object }}
 */
const createImportPackage = async (payload) => {
  const {
    productId,
    supplierId,
    importPrice,
    slotLimit,
    matchMode,
    account,
    password,
    backup_email,
    two_fa,
    expires_at,
    note,
  } = payload;

  const rule = await findRuleByProductId(db, productId);

  return withTransaction(async (trx) => {
    // 1. Lay ten san pham de dien vao category cua stock
    const productRow = await trx(TABLES.product)
      .select(productCols.packageName)
      .where(productCols.id, productId)
      .first();
    const category = productRow?.[productCols.packageName] || null;

    const now = new Date().toISOString();

    // 2. Insert PRODUCT_STOCK
    const [stock] = await trx(TABLES.stock)
      .insert({
        [stockCols.productType]: category,
        [stockCols.accountUsername]: account || null,
        [stockCols.passwordEncrypted]: password || null,
        [stockCols.backupEmail]: backup_email || null,
        [stockCols.twoFaEncrypted]: two_fa || null,
        [stockCols.note]: note || null,
        [stockCols.status]: "Ton",
        [stockCols.expiresAt]: normalizeDateInput(expires_at) || null,
        [stockCols.isVerified]: false,
        [stockCols.createdAt]: now,
        [stockCols.updatedAt]: now,
      })
      .returning([
        stockCols.id,
        stockCols.productType,
        stockCols.accountUsername,
        stockCols.passwordEncrypted,
        stockCols.backupEmail,
        stockCols.twoFaEncrypted,
        stockCols.note,
        stockCols.status,
        stockCols.expiresAt,
        stockCols.isVerified,
        stockCols.createdAt,
        stockCols.updatedAt,
      ]);

    const normalizedMatchMode =
      matchMode === "slot" ? "slot" : "information_order";
    const resolvedSlotLimit =
      slotLimit ?? rule?.default_slot_limit ?? 1;

    // 3. Insert PACKAGE_PRODUCT lien ket voi stock vua tao
    const [pkg] = await trx(TABLES.package)
      .insert({
        [pkgCols.packageId]: productId,
        [pkgCols.supplier]: supplierId || null,
        [pkgCols.cost]: importPrice ?? null,
        [pkgCols.slot]: resolvedSlotLimit,
        [pkgCols.match]: normalizedMatchMode,
        [pkgCols.stockId]: stock[stockCols.id],
        [pkgCols.storageId]: null,
        [pkgCols.storageTotal]: null,
      })
      .returning([
        pkgCols.id,
        pkgCols.packageId,
        pkgCols.supplier,
        pkgCols.cost,
        pkgCols.slot,
        pkgCols.match,
        pkgCols.stockId,
        pkgCols.storageId,
        pkgCols.storageTotal,
      ]);

    logger.info("[import-packages] Tao stock + package thanh cong", {
      stockId: stock[stockCols.id],
      packageId: pkg[pkgCols.id],
      productId,
    });

    return {
      stock: {
        id: stock[stockCols.id],
        category: stock[stockCols.productType],
        account: stock[stockCols.accountUsername],
        password: stock[stockCols.passwordEncrypted],
        backup_email: stock[stockCols.backupEmail],
        two_fa: stock[stockCols.twoFaEncrypted],
        note: stock[stockCols.note],
        status: stock[stockCols.status],
        expires_at: stock[stockCols.expiresAt],
        is_verified: stock[stockCols.isVerified],
        created_at: stock[stockCols.createdAt],
        updated_at: stock[stockCols.updatedAt],
      },
      pkg: {
        id: pkg[pkgCols.id],
        package_id: pkg[pkgCols.packageId],
        supplier: pkg[pkgCols.supplier],
        import_price: pkg[pkgCols.cost],
        slot: pkg[pkgCols.slot],
        match: pkg[pkgCols.match],
        stock_id: pkg[pkgCols.stockId],
        storage_id: pkg[pkgCols.storageId],
        storage_total: pkg[pkgCols.storageTotal],
      },
    };
  });
};

/**
 * Expire: xoa package, tuy chon xoa stock.
 *
 * @param {number} stockId - ID cua PRODUCT_STOCK
 * @param {boolean} deleteStock - Co xoa luon PRODUCT_STOCK khong
 */
const expireImportPackage = async (stockId, deleteStock = false) => {
  return withTransaction(async (trx) => {
    // Xoa tat ca package lien ket voi stock nay
    const deletedPkgs = await trx(TABLES.package)
      .where(pkgCols.stockId, stockId)
      .orWhere(pkgCols.storageId, stockId)
      .del()
      .returning([pkgCols.id]);

    let deletedStock = null;
    if (deleteStock) {
      const [removed] = await trx(TABLES.stock)
        .where(stockCols.id, stockId)
        .del()
        .returning([stockCols.id]);
      deletedStock = removed ?? null;
    }

    logger.info("[import-packages] Expire done", {
      stockId,
      deletedPackages: deletedPkgs.length,
      stockDeleted: !!deletedStock,
    });

    return {
      deletedPackages: deletedPkgs.map((r) => r[pkgCols.id]),
      stockDeleted: !!deletedStock,
    };
  });
};

// ---- Rules CRUD ----

const listRules = async () => {
  const rows = await db(TABLES.rule).orderBy(ruleCols.id, "asc");
  return rows.map(mapRule);
};

const getRuleByProductId = async (productId) => {
  const row = await db(TABLES.rule)
    .where(ruleCols.productId, productId)
    .first();
  return row ? mapRule(row) : null;
};

const upsertRule = async (productId, payload) => {
  const {
    enabled = false,
    fields = [],
    defaultSlotLimit = 1,
    defaultMatchMode = "information_order",
  } = payload;

  const now = new Date().toISOString();
  const existing = await db(TABLES.rule)
    .where(ruleCols.productId, productId)
    .first();

  if (existing) {
    const [updated] = await db(TABLES.rule)
      .where(ruleCols.productId, productId)
      .update({
        [ruleCols.enabled]: enabled,
        [ruleCols.fields]: JSON.stringify(fields),
        [ruleCols.defaultSlotLimit]: defaultSlotLimit,
        [ruleCols.defaultMatchMode]: defaultMatchMode,
        [ruleCols.updatedAt]: now,
      })
      .returning("*");
    return mapRule(updated);
  }

  const [created] = await db(TABLES.rule)
    .insert({
      [ruleCols.productId]: productId,
      [ruleCols.enabled]: enabled,
      [ruleCols.fields]: JSON.stringify(fields),
      [ruleCols.defaultSlotLimit]: defaultSlotLimit,
      [ruleCols.defaultMatchMode]: defaultMatchMode,
      [ruleCols.createdAt]: now,
      [ruleCols.updatedAt]: now,
    })
    .returning("*");
  return mapRule(created);
};

const deleteRule = async (productId) => {
  const deleted = await db(TABLES.rule)
    .where(ruleCols.productId, productId)
    .del();
  return deleted > 0;
};

const mapRule = (row) => ({
  id: row[ruleCols.id],
  productId: row[ruleCols.productId],
  enabled: row[ruleCols.enabled],
  fields: Array.isArray(row[ruleCols.fields])
    ? row[ruleCols.fields]
    : (() => {
        try {
          return JSON.parse(row[ruleCols.fields] || "[]");
        } catch {
          return [];
        }
      })(),
  defaultSlotLimit: row[ruleCols.defaultSlotLimit],
  defaultMatchMode: row[ruleCols.defaultMatchMode],
  createdAt: row[ruleCols.createdAt],
  updatedAt: row[ruleCols.updatedAt],
});

module.exports = {
  createImportPackage,
  expireImportPackage,
  listRules,
  getRuleByProductId,
  upsertRule,
  deleteRule,
};
