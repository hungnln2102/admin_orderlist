const { db } = require("../../../db");
const {
  getDefinition,
  PRODUCT_SCHEMA,
  SCHEMA_PRODUCT,
  tableName,
} = require("../../../config/dbSchema");
const { normalizeDateInput } = require("../../../utils/normalizers");
const {
  syncOrdersForPackagesUsingStock,
} = require("../../../services/packageOrderAccountSync");
const logger = require("../../../utils/logger");
const eventBus = require("../../../events/eventBus");
const EVENTS = require("../../../events/eventTypes");

const warehouseDef = getDefinition("PRODUCT_STOCK", PRODUCT_SCHEMA);
const cols = warehouseDef.columns;
const warehouseTable = tableName(warehouseDef.tableName, SCHEMA_PRODUCT);

const servicesDef = getDefinition("STOCK_SERVICES", PRODUCT_SCHEMA);
const srvCols = servicesDef.columns;
const servicesTable = tableName(servicesDef.tableName, SCHEMA_PRODUCT);

const pkgDef = getDefinition("PACKAGE_PRODUCT", PRODUCT_SCHEMA);
const pkgCols = pkgDef.columns;
const pkgTable = tableName(pkgDef.tableName, SCHEMA_PRODUCT);

const listWarehouse = async (_req, res) => {
  try {
    // We group services inside the email account
    const alias = "ps";
    const sAlias = "ss";
    const stocks = await db(`${warehouseTable} as ${alias}`)
      .select({
        id: `${alias}.${cols.id}`,
        account: `${alias}.${cols.accountUsername}`,
        note: `${alias}.${cols.note}`,
        status: `${alias}.${cols.status}`,
        is_verified: `${alias}.${cols.isVerified}`,
        created_at: `${alias}.${cols.createdAt}`,
        updated_at: `${alias}.${cols.updatedAt}`,
      })
      .orderBy(`${alias}.${cols.id}`, "desc");

    const stockIds = stocks.map(s => s.id);
    let servicesByStock = {};

    if (stockIds.length > 0) {
      const services = await db(`${servicesTable} as ${sAlias}`)
        .select({
          id: `${sAlias}.${srvCols.id}`,
          stock_id: `${sAlias}.${srvCols.stockId}`,
          category: `${sAlias}.${srvCols.productType}`,
          password: `${sAlias}.${srvCols.passwordEncrypted}`,
          backup_email: `${sAlias}.${srvCols.backupEmail}`,
          two_fa: `${sAlias}.${srvCols.twoFaEncrypted}`,
          expires_at: `${sAlias}.${srvCols.expiresAt}`,
          status: `${sAlias}.${srvCols.status}`,
          created_at: `${sAlias}.${srvCols.createdAt}`,
          updated_at: `${sAlias}.${srvCols.updatedAt}`,
        })
        .whereIn(`${sAlias}.${srvCols.stockId}`, stockIds);

      // Check if services are used in packages
      const srvIds = services.map(s => s.id);
      let inUseSrvIds = new Set();
      if (srvIds.length > 0) {
        const usedPkgs = await db(pkgTable)
          .select(pkgCols.stockServiceId)
          .whereIn(pkgCols.stockServiceId, srvIds);
        inUseSrvIds = new Set(usedPkgs.map(p => p.stock_service_id));
      }

      for (const srv of services) {
        if (inUseSrvIds.has(srv.id)) {
          srv.status = 'Đang Sử Dụng';
        } else {
          srv.status = 'Tồn';
        }

        if (!servicesByStock[srv.stock_id]) {
          servicesByStock[srv.stock_id] = [];
        }
        servicesByStock[srv.stock_id].push(srv);
      }
    }

    const result = stocks.map(stock => ({
      ...stock,
      services: servicesByStock[stock.id] || []
    }));

    res.json(result);
  } catch (error) {
    logger.error("[warehouse] Query failed", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể tải kho hàng." });
  }
};

const createWarehouse = async (req, res) => {
  // Support both legacy single-service creation and new multi-service creation
  const {
    account,
    note,
    status,
    is_verified,
    services = []
  } = req.body || {};

  // Handle legacy payload fallback
  if (services.length === 0 && req.body.category) {
    services.push({
      category: req.body.category,
      password: req.body.password,
      backup_email: req.body.backup_email,
      two_fa: req.body.two_fa,
      expires_at: req.body.expires_at,
    });
  }

  try {
    const row = await db.transaction(async (trx) => {
      const now = new Date().toISOString();
      let stockRow;
      
      if (account) {
        const existingStock = await trx(warehouseTable).where(cols.accountUsername, account).first();
        if (existingStock) {
          stockRow = existingStock;
        }
      }

      if (!stockRow) {
        const [stock] = await trx(warehouseTable)
          .insert({
            [cols.accountUsername]: account ?? null,
            [cols.note]: note ?? null,
            [cols.status]: status ?? "Tồn",
            [cols.isVerified]: is_verified ?? false,
            [cols.createdAt]: now,
            [cols.updatedAt]: now,
          })
          .returning("*");
          
        stockRow = stock.id !== undefined ? stock : { id: stock, [cols.accountUsername]: account };
      }

      const insertedServices = [];
      for (const srv of services) {
        const [insertedSrv] = await trx(servicesTable)
          .insert({
            [srvCols.stockId]: stockRow.id,
            [srvCols.productType]: srv.category ?? null,
            [srvCols.passwordEncrypted]: srv.password ?? null,
            [srvCols.backupEmail]: srv.backup_email ?? null,
            [srvCols.twoFaEncrypted]: srv.two_fa ?? null,
            [srvCols.status]: "Tồn",
            [srvCols.expiresAt]: normalizeDateInput(srv.expires_at) || null,
            [srvCols.createdAt]: now,
            [srvCols.updatedAt]: now,
          })
          .returning("*");
        
        insertedServices.push(insertedSrv.id !== undefined ? insertedSrv : { id: insertedSrv });
      }

      return {
        id: stockRow.id,
        account: stockRow[cols.accountUsername],
        services: insertedServices
      };
    });

    // Emit Event cho Subscriber (Auto-Assembly) xu ly tao package_product
    eventBus.emit(EVENTS.WAREHOUSE_STOCK_CREATED, {
      stockId: row.id,
      account: row.account,
      services: row.services,
    });

    res.status(201).json(row);
  } catch (error) {
    logger.error("[warehouse] Insert failed", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể tạo kho hàng." });
  }
};

const updateWarehouse = async (req, res) => {
  const { id } = req.params;
  const {
    account,
    note,
    status,
    is_verified,
    services = []
  } = req.body || {};

  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    const row = await db.transaction(async (trx) => {
      const before = await trx(warehouseTable).where(cols.id, id).first();
      if (!before) return null;

      const [updated] = await trx(warehouseTable)
        .where(cols.id, id)
        .update({
          [cols.accountUsername]: account ?? null,
          [cols.note]: note ?? null,
          [cols.status]: status ?? null,
          [cols.isVerified]: is_verified ?? false,
          [cols.updatedAt]: new Date().toISOString(),
        })
        .returning("*");

      const oldAcc = before[cols.accountUsername] ?? null;
      const newAcc = updated[cols.accountUsername] ?? null;
      const same = String(oldAcc ?? "").trim() === String(newAcc ?? "").trim();
      if (!same) {
        await syncOrdersForPackagesUsingStock(trx, id, oldAcc, newAcc);
      }

      // Sync services (replace or update)
      // For simplicity in this endpoint, we'll clear and recreate or selectively update.
      // Assuming 'services' payload contains full list including IDs for existing ones.
      if (services.length > 0) {
        const existingSrvs = await trx(servicesTable).where(srvCols.stockId, id).select(srvCols.id);
        const existingIds = new Set(existingSrvs.map(s => s.id));
        const keptIds = new Set();

        for (const srv of services) {
          if (srv.id && existingIds.has(srv.id)) {
            // Update
            await trx(servicesTable).where(srvCols.id, srv.id).update({
              [srvCols.productType]: srv.category ?? null,
              [srvCols.passwordEncrypted]: srv.password ?? null,
              [srvCols.backupEmail]: srv.backup_email ?? null,
              [srvCols.twoFaEncrypted]: srv.two_fa ?? null,
              [srvCols.expiresAt]: normalizeDateInput(srv.expires_at) || null,
              [srvCols.updatedAt]: new Date().toISOString()
            });
            keptIds.add(srv.id);
          } else {
            // Insert new
            const now = new Date().toISOString();
            await trx(servicesTable).insert({
              [srvCols.stockId]: id,
              [srvCols.productType]: srv.category ?? null,
              [srvCols.passwordEncrypted]: srv.password ?? null,
              [srvCols.backupEmail]: srv.backup_email ?? null,
              [srvCols.twoFaEncrypted]: srv.two_fa ?? null,
              [srvCols.status]: "Tồn",
              [srvCols.expiresAt]: normalizeDateInput(srv.expires_at) || null,
              [srvCols.createdAt]: now,
              [srvCols.updatedAt]: now,
            });
          }
        }

        // Delete removed services
        const toDelete = [...existingIds].filter(eid => !keptIds.has(eid));
        if (toDelete.length > 0) {
          await trx(servicesTable).whereIn(srvCols.id, toDelete).del();
        }
      }

      return updated;
    });

    if (!row) {
      return res.status(404).json({ error: "Không tìm thấy" });
    }
    res.json(row);
  } catch (error) {
    logger.error("[warehouse] Update failed", {
      id,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể cập nhật kho hàng." });
  }
};

const deleteWarehouse = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    await db.transaction(async (trx) => {
      await trx(servicesTable).where(srvCols.stockId, id).del();
      await trx(warehouseTable).where(cols.id, id).del();
    });
    res.json({ success: true });
  } catch (error) {
    logger.error("[warehouse] Delete failed", {
      id,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể xóa kho hàng." });
  }
};

module.exports = {
  listWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
};
