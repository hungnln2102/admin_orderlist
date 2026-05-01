const { db, withTransaction } = require("../../db");
const {
  toNullableNumber,
} = require("../../utils/normalizers");
const {
  PACKAGE_PRODUCTS_SELECT,
  mapPackageProductRow,
  fetchPackageProductById,
} = require("../../services/packageProductService");
const { syncOrdersMatchingPackageAccount } = require("../../services/packageOrderAccountSync");
const logger = require("../../utils/logger");
const { pkgCols, TABLES, productCols } = require("./constants");


const normalizeMatchMode = (matchMode) =>
  matchMode === "slot" ? "slot" : "information_order";

const listPackageProducts = async () => {
  const result = await db.raw(`${PACKAGE_PRODUCTS_SELECT} ORDER BY pp.id ASC`);
  const rows = (result.rows || []).map(mapPackageProductRow);
  return rows;
};

const createPackageProduct = async (payload) => {
  const {
    packageId,
    supplier,
    importPrice,
    slotLimit,
    matchMode,
    stockId,
    storageId,
    storageTotal,
  } = payload || {};

  const productIdNum = packageId != null ? Number(packageId) : null;
  if (productIdNum == null || !Number.isFinite(productIdNum) || productIdNum < 1) {
    throw new Error("packageId (product id) là bắt buộc.");
  }

  const normalizedSlotLimit = toNullableNumber(slotLimit);
  const normalizedMatchMode = normalizeMatchMode(matchMode);

  const newRow = await withTransaction(async (trx) => {
    const [pkgRow] = await trx(TABLES.packageProduct)
      .insert({
        [pkgCols.packageId]: productIdNum,
        [pkgCols.supplier]: supplier || null,
        [pkgCols.cost]: toNullableNumber(importPrice),
        [pkgCols.slot]: normalizedSlotLimit,
        [pkgCols.match]: normalizedMatchMode,
        [pkgCols.stockId]: toNullableNumber(stockId),
        [pkgCols.storageId]: toNullableNumber(storageId),
        [pkgCols.storageTotal]: toNullableNumber(storageTotal),
      })
      .returning("id");

    const packageId =
      pkgRow?.id ?? pkgRow?.ID ?? pkgRow?.packageProductId ?? pkgRow?.package_id;

    const fetched = await fetchPackageProductById(trx, packageId);
    if (fetched) return fetched;

    return mapPackageProductRow({
      package_id: packageId,
      product_id: productIdNum,
      package_name: null,
      package_supplier: supplier || null,
      package_import: toNullableNumber(importPrice),
      package_slot: normalizedSlotLimit,
      package_match: normalizedMatchMode,
      stock_id: toNullableNumber(stockId),
      storage_id: toNullableNumber(storageId),
      storage_total: toNullableNumber(storageTotal),
      package_products: [],
    });
  });

  return newRow;
};

const updatePackageProduct = async (id, payload) => {
  const {
    supplier,
    importPrice,
    slotLimit,
    matchMode,
    stockId,
    storageId,
    storageTotal,
  } = payload || {};

  const normalizedSlotLimit = toNullableNumber(slotLimit);
  const normalizedMatchMode = normalizeMatchMode(matchMode);

  const beforePackage = await fetchPackageProductById(db, id);

  const updated = await withTransaction(async (trx) => {
    const [updatedPkg] = await trx(TABLES.packageProduct)
      .where(pkgCols.id, id)
      .update({
        [pkgCols.supplier]: supplier || null,
        [pkgCols.cost]: toNullableNumber(importPrice),
        [pkgCols.slot]: normalizedSlotLimit,
        [pkgCols.match]: normalizedMatchMode,
        [pkgCols.stockId]: toNullableNumber(stockId),
        [pkgCols.storageId]: toNullableNumber(storageId),
        [pkgCols.storageTotal]: toNullableNumber(storageTotal),
      })
      .returning("id");

    if (!updatedPkg) {
      return null;
    }

    const packageId =
      updatedPkg?.id ??
      updatedPkg?.ID ??
      updatedPkg?.packageProductId ??
      updatedPkg?.package_id;

    const fetched = await fetchPackageProductById(trx, packageId ?? id);
    const resultRow =
      fetched ||
      mapPackageProductRow({
        package_id: packageId ?? id,
        product_id: null,
        package_name: null,
        package_supplier: supplier || null,
        package_import: toNullableNumber(importPrice),
        package_match: normalizedMatchMode,
        stock_id: toNullableNumber(stockId),
        storage_id: toNullableNumber(storageId),
        storage_total: toNullableNumber(storageTotal),
        package_products: [],
      });

    if (beforePackage && resultRow) {
      try {
        await syncOrdersMatchingPackageAccount(
          trx,
          resultRow,
          beforePackage.informationUser,
          resultRow.informationUser,
          { matchModeSource: beforePackage }
        );
      } catch (syncErr) {
        logger.error("[packages] Đồng bộ đơn theo tài khoản gói thất bại", {
          id,
          error: syncErr?.message || String(syncErr),
          stack: syncErr?.stack,
        });
        throw syncErr;
      }
    }

    return resultRow;
  });

  return updated;
};

const deletePackageProduct = async (id) =>
  withTransaction(async (trx) => {
    await trx(TABLES.packageProduct)
      .where(pkgCols.id, id)
      .update({ [pkgCols.match]: null });
    const deletedRows = await trx(TABLES.packageProduct)
      .where(pkgCols.id, id)
      .del()
      .returning([pkgCols.id, pkgCols.packageId]);

    return deletedRows;
  });

const bulkDeletePackages = async (productIds) =>
  withTransaction(async (trx) => {
    if (!Array.isArray(productIds) || productIds.length === 0) return [];
    await trx(TABLES.packageProduct)
      .whereIn(pkgCols.packageId, productIds)
      .update({ [pkgCols.match]: null });
    const deleteResult = await trx(TABLES.packageProduct)
      .whereIn(pkgCols.packageId, productIds)
      .del()
      .returning([pkgCols.id, pkgCols.packageId]);

    return deleteResult || [];
  });

/**
 * Đọc `product.package_requires_activation` — khớp UI: chỉ bắt storage khi loại gói bật trường kích hoạt.
 * @param {{ packageId?: unknown, package_id?: unknown }} payload
 * @param {{ packageProductRowId?: string|number }} [options] — khi PUT body không có package_id (dùng id dòng package_product)
 */
const fetchProductRequiresActivationForPackagePayload = async (payload, options = {}) => {
  let rawPid = payload?.packageId ?? payload?.package_id;
  if (
    (rawPid == null || rawPid === "" || !Number.isFinite(Number(rawPid))) &&
    options.packageProductRowId != null
  ) {
    const row = await db(TABLES.packageProduct)
      .select(pkgCols.packageId)
      .where(pkgCols.id, options.packageProductRowId)
      .first();
    rawPid = row?.[pkgCols.packageId];
  }
  const idNum = rawPid != null ? Number(rawPid) : NaN;
  if (!Number.isFinite(idNum) || idNum < 1) return false;
  const row = await db(TABLES.product)
    .select(productCols.packageRequiresActivation)
    .where(productCols.id, idNum)
    .first();
  return Boolean(row?.[productCols.packageRequiresActivation]);
};

/** @see database/migrations/092_product_package_requires_activation.sql */
const updateProductPackageOptions = async (productId, payload) => {
  const idNum = Number(productId);
  if (!Number.isFinite(idNum) || idNum < 1) {
    throw new Error("productId không hợp lệ.");
  }
  const raw = payload?.requiresActivation ?? payload?.package_requires_activation;
  const requiresActivation = Boolean(raw);

  const updatedCount = await db(TABLES.product)
    .where(productCols.id, idNum)
    .update({
      [productCols.packageRequiresActivation]: requiresActivation,
    });

  if (!updatedCount) {
    return null;
  }

  return {
    productId: idNum,
    packageRequiresActivation: requiresActivation,
  };
};

module.exports = {
  listPackageProducts,
  createPackageProduct,
  updatePackageProduct,
  deletePackageProduct,
  bulkDeletePackages,
  fetchProductRequiresActivationForPackagePayload,
  updateProductPackageOptions,
};
