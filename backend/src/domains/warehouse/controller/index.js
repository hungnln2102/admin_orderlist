const { db } = require("@/db");
const {
  getDefinition,
  PRODUCT_SCHEMA,
  WAREHOUSE_SCHEMA,
  SCHEMA_PRODUCT,
  SCHEMA_WAREHOUSE,
  tableName,
} = require("@/config/dbSchema");
const { normalizeDateInput } = require("@/utils/normalizers");
const {
  syncOrdersForPackagesUsingStock,
} = require("@/services/packageOrderAccountSync");
const logger = require("@/utils/logger");
const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");

const warehouseDef = getDefinition("PRODUCT_STOCK", WAREHOUSE_SCHEMA);
const cols = warehouseDef.columns;
const warehouseTable = tableName(warehouseDef.tableName, SCHEMA_WAREHOUSE);

const servicesDef = getDefinition("STOCK_SERVICES", WAREHOUSE_SCHEMA);
const srvCols = servicesDef.columns;
const servicesTable = tableName(servicesDef.tableName, SCHEMA_WAREHOUSE);

const pkgDef = getDefinition("PACKAGE_PRODUCT", PRODUCT_SCHEMA);
const pkgCols = pkgDef.columns;
const pkgTable = tableName(pkgDef.tableName, SCHEMA_PRODUCT);
const normalizeProductId = (value) => {
  const numericId = Number(value);
  return Number.isFinite(numericId) && numericId > 0 ? numericId : null;
};

const formatWarehouseService = (srv) => {
  const displayName = srv.product_type || srv.display_name || srv.variant_name || null;

  return {
    id: srv.id ?? srv[srvCols.id],
    stock_id: srv.stock_id ?? srv[srvCols.stockId],
    product_id: srv.product_id ?? null,
    warehouse_product_name_id: srv.warehouse_product_name_id ?? srv.name_id ?? srv[srvCols.nameId] ?? null,
    category: displayName,
    display_name: displayName,
    variant_name: srv.variant_name ?? null,
    password: srv.password ?? srv[srvCols.passwordEncrypted],
    backup_email: srv.backup_email ?? srv[srvCols.backupEmail],
    two_fa: srv.two_fa ?? srv[srvCols.twoFaEncrypted],
    note: srv.note ?? srv[srvCols.note] ?? null,
    expires_at: srv.expires_at ?? srv[srvCols.expiresAt],
    status: srv.status ?? srv[srvCols.status],
    created_at: srv.created_at ?? srv[srvCols.createdAt],
    updated_at: srv.updated_at ?? srv[srvCols.updatedAt],
  };
};

const listWarehouse = async (_req, res) => {
  try {
    // We group services inside the email account
    const alias = "ps";
    const sAlias = "ss";
    const stocks = await db(`${warehouseTable} as ${alias}`)
      .select({
        id: `${alias}.${cols.id}`,
        account: `${alias}.${cols.accountUsername}`,
        created_at: `${alias}.${cols.createdAt}`,
        updated_at: `${alias}.${cols.updatedAt}`,
      })
      .orderBy(`${alias}.${cols.id}`, "desc");

    const stockIds = stocks.map(s => s.id);
    let servicesByStock = {};

    if (stockIds.length > 0) {
      const services = await db(`${servicesTable} as ${sAlias}`)
        .leftJoin(`${SCHEMA_WAREHOUSE}.product_names as pn`, `pn.id`, `${sAlias}.${srvCols.nameId}`)
        .leftJoin(`${SCHEMA_PRODUCT}.product as p`, `p.id`, `pn.product_id`)
        .select({
          id: `${sAlias}.${srvCols.id}`,
          stock_id: `${sAlias}.${srvCols.stockId}`,
          product_id: `pn.product_id`,
          warehouse_product_name_id: `${sAlias}.${srvCols.nameId}`,
          category: db.raw("COALESCE(pn.name, p.package_name)"),
          display_name: `p.package_name`,
          variant_name: db.raw("NULL"),
          product_type: `pn.name`,
          password: `${sAlias}.${srvCols.passwordEncrypted}`,
          backup_email: `${sAlias}.${srvCols.backupEmail}`,
          two_fa: `${sAlias}.${srvCols.twoFaEncrypted}`,
          note: `${sAlias}.${srvCols.note}`,
          expires_at: `${sAlias}.${srvCols.expiresAt}`,
          status: `${sAlias}.${srvCols.status}`,
          created_at: `${sAlias}.${srvCols.createdAt}`,
          updated_at: `${sAlias}.${srvCols.updatedAt}`,
        })
        .whereIn(`${sAlias}.${srvCols.stockId}`, stockIds);

      // Check if services are used in packages
      const srvIds = services.map(s => s.id);
      let inUseSrvIds = new Set();
      let inUseStockIds = new Set();
      if (stockIds.length > 0) {
        const query = db(pkgTable).select(pkgCols.stockServiceId, pkgCols.storageId, pkgCols.stockId);
        query.where(function () {
          this.whereIn(pkgCols.storageId, stockIds)
            .orWhereIn(pkgCols.stockId, stockIds);
          if (srvIds.length > 0) {
            this.orWhereIn(pkgCols.stockServiceId, srvIds);
          }
        });

        const usedPkgs = await query;
        usedPkgs.forEach(p => {
          if (p.stock_service_id) inUseSrvIds.add(Number(p.stock_service_id));
          if (p.storage_id) inUseStockIds.add(Number(p.storage_id));
          if (p.stock_id && !p.stock_service_id) inUseStockIds.add(Number(p.stock_id));
        });
      }

      for (const srv of services) {
        if (inUseSrvIds.has(Number(srv.id)) || inUseStockIds.has(Number(srv.stock_id))) {
          srv.status = 'UNAVAILABLE';
        } else {
          srv.status = 'AVAILABLE';
        }

        if (!servicesByStock[srv.stock_id]) {
          servicesByStock[srv.stock_id] = [];
        }
        servicesByStock[srv.stock_id].push(formatWarehouseService(srv));
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

const ensureProductName = async (trx, nameStr, productId = null) => {
  if (!nameStr) return null;
  const normalized = String(nameStr).trim();
  if (!normalized) return null;
  const existing = await trx(`${SCHEMA_WAREHOUSE}.product_names`).where("name", normalized).first();
  if (existing) {
    if (productId && existing.product_id !== productId) {
      await trx(`${SCHEMA_WAREHOUSE}.product_names`).where("id", existing.id).update({ product_id: productId });
    }
    return existing.id;
  }
  const [inserted] = await trx(`${SCHEMA_WAREHOUSE}.product_names`).insert({ name: normalized, product_id: productId }).returning("id");
  return inserted?.id ?? inserted ?? null;
};

const createWarehouse = async (req, res) => {
  // Support both legacy single-service creation and new multi-service creation
  let { account, services = [] } = req.body || {};
  if (account) account = String(account).trim().toLowerCase();

  // Handle legacy payload fallback
  if (services.length === 0 && req.body.category) {
    services.push({
      category: req.body.category,
      password: req.body.password,
      backup_email: req.body.backup_email,
      two_fa: req.body.two_fa,
      note: req.body.note,
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
            [cols.createdAt]: now,
            [cols.updatedAt]: now,
          })
          .returning("*");

        stockRow = stock.id !== undefined ? stock : { id: stock, [cols.accountUsername]: account };
      }

      const insertedServices = [];
      for (const srv of services) {
        let pId = normalizeProductId(srv.product_id);
        let nameId = normalizeProductId(srv.warehouse_product_name_id);
        
        // Ensure nameId and update product_id if possible
        if (!nameId && srv.category) {
          nameId = await ensureProductName(trx, srv.category, pId);
        } else if (pId && !nameId) {
          // If they just selected product_id but no category, fetch parent name
          const parentProduct = await trx(`${SCHEMA_PRODUCT}.product`).where("id", pId).first();
          if (parentProduct) {
            nameId = await ensureProductName(trx, parentProduct.package_name, pId);
          }
        } else if (nameId && pId) {
          await ensureProductName(trx, srv.category || "Unknown", pId); // Just updates the product_id if needed
        }

        const [insertedSrv] = await trx(servicesTable)
          .insert({
            [srvCols.stockId]: stockRow.id,
            [srvCols.nameId]: nameId,
            [srvCols.passwordEncrypted]: srv.password ?? null,
            [srvCols.backupEmail]: srv.backup_email ?? null,
            [srvCols.twoFaEncrypted]: srv.two_fa ?? null,
            [srvCols.note]: srv.note ?? null,
            [srvCols.status]: "AVAILABLE",
            [srvCols.expiresAt]: normalizeDateInput(srv.expires_at) || null,
            [srvCols.createdAt]: now,
            [srvCols.updatedAt]: now,
          })
          .returning("*");

        insertedServices.push(insertedSrv.id !== undefined ? insertedSrv : { id: insertedSrv, product_id: pId });
      }

      const serviceProductIds = insertedServices
        .map((srv) => srv.product_id)
        .filter((productId) => productId != null);
      const variants = serviceProductIds.length
        ? await trx(`${SCHEMA_PRODUCT}.variant`).select("id", "display_name", "variant_name").whereIn("id", serviceProductIds)
        : [];
      const variantById = new Map(variants.map((variant) => [Number(variant.id), variant]));

      const serviceNameIds = insertedServices
        .map((srv) => srv.name_id)
        .filter((nameId) => nameId != null);
      const names = serviceNameIds.length
        ? await trx(`${SCHEMA_WAREHOUSE}.product_names`).select("id", "name").whereIn("id", serviceNameIds)
        : [];
      const nameById = new Map(names.map((n) => [Number(n.id), n.name]));

      const formattedServices = insertedServices.map((srv) =>
        formatWarehouseService({
          ...srv,
          ...variantById.get(Number(srv.product_id)),
          product_type: nameById.get(Number(srv.name_id)),
          product_id: srv.product_id,
        })
      );

      return {
        id: stockRow.id,
        account: stockRow[cols.accountUsername],
        services: formattedServices
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
  let { account, services = [] } = req.body || {};
  if (account) account = String(account).trim().toLowerCase();

  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    const row = await db.transaction(async (trx) => {
      const before = await trx(warehouseTable).where(cols.id, id).first();
      if (!before) return null;

      const [updated] = await trx(warehouseTable)
        .where(cols.id, id)
        .update({
          [cols.accountUsername]: account ?? null,
          [cols.updatedAt]: new Date().toISOString(),
        })
        .returning("*");

      const oldAcc = before[cols.accountUsername] ?? null;
      const newAcc = updated[cols.accountUsername] ?? null;
      const same = String(oldAcc ?? "").trim().toLowerCase() === String(newAcc ?? "").trim().toLowerCase();
      if (!same) {
        await syncOrdersForPackagesUsingStock(trx, id, oldAcc, newAcc);
      }

      let updatedServices = [];
      // Sync services (replace or update)
      if (services && services.length > 0) {
        const existingSrvs = await trx(servicesTable).where(srvCols.stockId, id).select(srvCols.id);
        const existingIds = new Set(existingSrvs.map(s => s.id));
        const keptIds = new Set();

        for (const srv of services) {
          let pId = normalizeProductId(srv.product_id);
          let nameId = normalizeProductId(srv.warehouse_product_name_id);
          
          if (!nameId && srv.category) {
            nameId = await ensureProductName(trx, srv.category, pId);
          } else if (pId && !nameId) {
            const parentProduct = await trx(`${SCHEMA_PRODUCT}.product`).where("id", pId).first();
            if (parentProduct) {
              nameId = await ensureProductName(trx, parentProduct.package_name, pId);
            }
          } else if (nameId && pId) {
            await ensureProductName(trx, srv.category || "Unknown", pId);
          }

          if (srv.id && existingIds.has(srv.id)) {
            // Update
            const [updatedSrv] = await trx(servicesTable).where(srvCols.id, srv.id).update({
              [srvCols.nameId]: nameId,
              [srvCols.passwordEncrypted]: srv.password ?? null,
              [srvCols.backupEmail]: srv.backup_email ?? null,
              [srvCols.twoFaEncrypted]: srv.two_fa ?? null,
              [srvCols.note]: srv.note ?? null,
              [srvCols.expiresAt]: normalizeDateInput(srv.expires_at) || null,
              [srvCols.updatedAt]: new Date().toISOString()
            }).returning("*");

            const fetchedUpdated = updatedSrv.id !== undefined ? updatedSrv : await trx(servicesTable).where(srvCols.id, srv.id).first();
            fetchedUpdated.product_id = pId;
            updatedServices.push(fetchedUpdated);
            keptIds.add(srv.id);
          } else {
            // Insert new
            const now = new Date().toISOString();
            const [insertedSrv] = await trx(servicesTable).insert({
              [srvCols.stockId]: id,
              [srvCols.nameId]: nameId,
              [srvCols.passwordEncrypted]: srv.password ?? null,
              [srvCols.backupEmail]: srv.backup_email ?? null,
              [srvCols.twoFaEncrypted]: srv.two_fa ?? null,
              [srvCols.note]: srv.note ?? null,
              [srvCols.status]: "AVAILABLE",
              [srvCols.expiresAt]: normalizeDateInput(srv.expires_at) || null,
              [srvCols.createdAt]: now,
              [srvCols.updatedAt]: now,
            }).returning("*");

            const fetchedInserted = insertedSrv.id !== undefined ? insertedSrv : await trx(servicesTable).where(srvCols.id, insertedSrv).first();
            fetchedInserted.product_id = pId;
            updatedServices.push(fetchedInserted);
          }
        }

        // Delete removed services
        const toDelete = [...existingIds].filter(eid => !keptIds.has(eid));
        if (toDelete.length > 0) {
          await trx(servicesTable).whereIn(srvCols.id, toDelete).del();
        }
      } else {
        // If services array is empty, delete all existing services
        await trx(servicesTable).where(srvCols.stockId, id).del();
      }
      const serviceProductIds = updatedServices
        .map((srv) => srv.product_id)
        .filter((productId) => productId != null);
      const variants = serviceProductIds.length
        ? await trx(`${SCHEMA_PRODUCT}.variant`).select("id", "display_name", "variant_name").whereIn("id", serviceProductIds)
        : [];
      const variantById = new Map(variants.map((variant) => [Number(variant.id), variant]));

      const serviceNameIds = updatedServices
        .map((srv) => srv.name_id)
        .filter((nameId) => nameId != null);
      const names = serviceNameIds.length
        ? await trx(`${SCHEMA_WAREHOUSE}.product_names`).select("id", "name").whereIn("id", serviceNameIds)
        : [];
      const nameById = new Map(names.map((n) => [Number(n.id), n.name]));

      const formattedServices = updatedServices.map((srv) =>
        formatWarehouseService({
          ...srv,
          ...variantById.get(Number(srv.product_id)),
          product_type: nameById.get(Number(srv.name_id)),
          product_id: srv.product_id,
        })
      );

      return {
        id: updated[cols.id],
        account: updated[cols.accountUsername],
        created_at: updated[cols.createdAt],
        updated_at: updated[cols.updatedAt],
        services: formattedServices
      };
    });

    if (!row) {
      return res.status(404).json({ error: "Không tìm thấy" });
    }

    eventBus.emit(EVENTS.WAREHOUSE_STOCK_UPDATED, {
      stockId: row.id,
      account: row.account,
      services: row.services
    });

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

    eventBus.emit(EVENTS.WAREHOUSE_STOCK_DELETED, { stockId: id });

    res.json({ success: true });
  } catch (error) {
    logger.error("[warehouse] Delete failed", {
      id,
      error: error.message,
      stack: error.stack,
    });

    if (error.message.includes("violates foreign key constraint")) {
      return res.status(400).json({ error: "Tài khoản này đang được liên kết với Đơn hàng/Gói sản phẩm. Vui lòng huỷ liên kết trước khi xoá." });
    }

    res.status(500).json({ error: "Không thể xoá kho hàng." });
  }
};

const listProductNames = async (req, res) => {
  try {
    const names = await db(`${SCHEMA_WAREHOUSE}.product_names`).select("*").orderBy("id", "desc");
    res.json(names);
  } catch (error) {
    logger.error("[warehouse] listProductNames failed", { error: error.message });
    res.status(500).json({ error: "Không thể tải danh mục." });
  }
};

const createProductName = async (req, res) => {
  const { name, product_id } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Tên danh mục không được để trống" });
  
  try {
    const normalized = String(name).trim();
    const existing = await db(`${SCHEMA_WAREHOUSE}.product_names`).where("name", normalized).first();
    if (existing) return res.status(400).json({ error: "Tên danh mục đã tồn tại" });
    
    const [inserted] = await db(`${SCHEMA_WAREHOUSE}.product_names`)
      .insert({ name: normalized, product_id: product_id || null })
      .returning("*");
      
    res.json(inserted);
  } catch (error) {
    logger.error("[warehouse] createProductName failed", { error: error.message });
    res.status(500).json({ error: "Không thể tạo danh mục." });
  }
};

const updateProductName = async (req, res) => {
  const { id } = req.params;
  const { name, product_id } = req.body;
  if (!id) return res.status(400).json({ error: "Missing id" });
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Tên danh mục không được để trống" });

  try {
    const normalized = String(name).trim();
    const existing = await db(`${SCHEMA_WAREHOUSE}.product_names`).where("name", normalized).whereNot("id", id).first();
    if (existing) return res.status(400).json({ error: "Tên danh mục đã tồn tại" });

    const [updated] = await db(`${SCHEMA_WAREHOUSE}.product_names`)
      .where("id", id)
      .update({ name: normalized, product_id: product_id || null })
      .returning("*");
      
    res.json(updated);
  } catch (error) {
    logger.error("[warehouse] updateProductName failed", { error: error.message });
    res.status(500).json({ error: "Không thể cập nhật danh mục." });
  }
};

const deleteProductName = async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    await db(`${SCHEMA_WAREHOUSE}.product_names`).where("id", id).del();
    res.json({ success: true });
  } catch (error) {
    logger.error("[warehouse] deleteProductName failed", { error: error.message });
    if (error.message.includes("violates foreign key constraint")) {
      return res.status(400).json({ error: "Danh mục này đang được sử dụng trong các tài khoản kho. Vui lòng gỡ bỏ liên kết trước khi xoá." });
    }
    res.status(500).json({ error: "Không thể xoá danh mục." });
  }
};

module.exports = {
  listWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  ensureProductName,
  listProductNames,
  createProductName,
  updateProductName,
  deleteProductName,
};
