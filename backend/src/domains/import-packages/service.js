const { db, withTransaction } = require("@/db");
const { getDefinition, PRODUCT_SCHEMA, SCHEMA_PRODUCT, tableName } = require("@/config/dbSchema");
const { normalizeDateInput } = require("@/utils/normalizers");
const { TABLES, ruleCols, stockCols, pkgCols, productCols } = require("@/domains/import-packages/constants");
const logger = require("@/utils/logger");

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

const SRV_DEF = getDefinition("STOCK_SERVICES", PRODUCT_SCHEMA);
const SRV_COLS = SRV_DEF.columns;
TABLES.stockServices = tableName(SRV_DEF.tableName, SCHEMA_PRODUCT);

/**
 * Tao luon stock + package trong mot transaction.
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
  const eventBus = require("@/events/eventBus");
  const EVENTS = require("@/events/eventTypes");

  const result = await withTransaction(async (trx) => {
    // 1. Lấy tên sản phẩm (display_name) từ variant
    const variantRow = await trx(tableName("variant", SCHEMA_PRODUCT))
      .select("display_name")
      .where("id", productId)
      .first();
    const category = variantRow?.display_name || null;

    const now = new Date().toISOString();

    // 2. Kiểm tra xem tài khoản đã tồn tại trong product_stocks chưa
    let stockId = null;
    let isNewStock = false;
    
    if (account) {
      const existingStock = await trx(TABLES.stock)
        .select(stockCols.ID)
        .where(stockCols.ACCOUNT_USERNAME, account)
        .first();
        
      if (existingStock) {
        stockId = existingStock[stockCols.ID];
      }
    }

    let stockObj = {};
    if (!stockId) {
      // Chưa tồn tại -> tạo mới
      const [insertedStock] = await trx(TABLES.stock)
        .insert({
          [stockCols.ACCOUNT_USERNAME]: account || null,
          [stockCols.NOTE]: note || null,
          [stockCols.STATUS]: "Tồn",
          [stockCols.IS_VERIFIED]: false,
          [stockCols.CREATED_AT]: now,
          [stockCols.UPDATED_AT]: now,
        })
        .returning("*");
      stockId = insertedStock.id !== undefined ? insertedStock.id : insertedStock;
      stockObj = insertedStock;
      isNewStock = true;
    } else {
      const existingStock = await trx(TABLES.stock).where(stockCols.ID, stockId).first();
      stockObj = existingStock;
    }

    // 2.5 Insert STOCK_SERVICES
    const [srv] = await trx(TABLES.stockServices)
      .insert({
        [SRV_COLS.STOCK_ID]: stockId,
        product_id: productId,
        [SRV_COLS.PASSWORD_ENCRYPTED]: password || null,
        [SRV_COLS.BACKUP_EMAIL]: backup_email || null,
        [SRV_COLS.TWO_FA_ENCRYPTED]: two_fa || null,
        [SRV_COLS.EXPIRES_AT]: normalizeDateInput(expires_at) || null,
        [SRV_COLS.STATUS]: "Tồn",
        [SRV_COLS.CREATED_AT]: now,
        [SRV_COLS.UPDATED_AT]: now,
      })
      .returning("*");
      
    const srvRow = srv.id !== undefined ? srv : { id: srv };

    const normalizedMatchMode =
      matchMode === "slot" ? "slot" : "information_order";
    const resolvedSlotLimit =
      slotLimit ?? rule?.default_slot_limit ?? 1;

    // 3. Insert PACKAGE_PRODUCT liên kết với stock
    const [pkg] = await trx(TABLES.package)
      .insert({
        [pkgCols.PACKAGE_ID]: productId,
        [pkgCols.SUPPLIER]: supplierId || null,
        [pkgCols.COST]: importPrice ?? null,
        [pkgCols.SLOT]: resolvedSlotLimit,
        [pkgCols.MATCH]: normalizedMatchMode,
        [pkgCols.STOCK_ID]: stockId,
        [pkgCols.STOCK_SERVICE_ID]: srvRow.id,
        [pkgCols.STORAGE_ID]: null,
        [pkgCols.STORAGE_TOTAL]: null,
      })
      .returning("*");
      
    const pkgRow = pkg.id !== undefined ? pkg : { id: pkg };

    logger.info("[import-packages] Tao stock/service + package thanh cong", {
      stockId,
      packageId: pkgRow.id,
      productId,
      isNewStock,
    });

    return {
      stock: {
        id: stockId,
        category: category,
        account: stockObj[stockCols.ACCOUNT_USERNAME],
        password: password,
        backup_email: backup_email,
        two_fa: two_fa,
        note: stockObj[stockCols.NOTE],
        status: stockObj[stockCols.STATUS],
        expires_at: expires_at,
        is_verified: stockObj[stockCols.IS_VERIFIED],
        created_at: stockObj[stockCols.CREATED_AT],
        updated_at: stockObj[stockCols.UPDATED_AT],
      },
      pkg: {
        id: pkgRow.id,
        package_id: pkgRow[pkgCols.PACKAGE_ID],
        supplier: pkgRow[pkgCols.SUPPLIER],
        import_price: pkgRow[pkgCols.COST],
        slot: pkgRow[pkgCols.SLOT],
        match: pkgRow[pkgCols.MATCH],
        stock_id: pkgRow[pkgCols.STOCK_ID],
        storage_id: pkgRow[pkgCols.STORAGE_ID],
        storage_total: pkgRow[pkgCols.STORAGE_TOTAL],
      },
      payloadForEvent: {
        stockId,
        account: stockObj[stockCols.ACCOUNT_USERNAME],
        serviceId: srvRow.id,
        category,
        password,
        backup_email,
        two_fa,
        expires_at,
        note,
        packageId: pkgRow.id,
        isNewStock
      }
    };
  });

  // 4. Emit event sau khi transaction thanh cong
  eventBus.emit(EVENTS.IMPORT_PACKAGE_CREATED, result.payloadForEvent);

  delete result.payloadForEvent;
  return result;
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
