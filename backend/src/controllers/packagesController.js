const { db, withTransaction } = require("../db");
const {
  normalizeDateInput,
  toNullableNumber,
  hasAccountStoragePayload,
} = require("../utils/normalizers");
const { DB_SCHEMA, getDefinition, tableName } = require("../config/dbSchema");
const {
  PACKAGE_PRODUCTS_SELECT,
  mapPackageProductRow,
  fetchPackageProductById,
  QUOTED_COLS,
} = require("../services/packageProductService");
const { getNextAccountStorageId } = require("../services/idService");

const PACKAGE_DEF = getDefinition("PACKAGE_PRODUCT");
const ACCOUNT_DEF = getDefinition("ACCOUNT_STORAGE");
const pkgCols = PACKAGE_DEF.columns;
const accCols = ACCOUNT_DEF.columns;

const TABLES = {
  packageProduct: tableName(DB_SCHEMA.PACKAGE_PRODUCT.TABLE),
  accountStorage: tableName(DB_SCHEMA.ACCOUNT_STORAGE.TABLE),
};

const listPackageProducts = async (_req, res) => {
  try {
    const result = await db.raw(`${PACKAGE_PRODUCTS_SELECT} ORDER BY pp.id ASC`);
    const rows = (result.rows || []).map(mapPackageProductRow);
    res.json(rows);
  } catch (error) {
    console.error("[packages] Truy vấn thất bại:", error);
    res.status(500).json({ error: "Không thể tải sản phẩm đóng gói." });
  }
};

const createPackageProduct = async (req, res) => {
  const {
    packageName,
    informationUser,
    informationPass,
    informationMail,
    note,
    supplier,
    importPrice,
    slotLimit,
    accountUser,
    accountPass,
    accountMail,
    accountNote,
    capacity,
    expired,
    hasCapacityField,
    matchMode,
  } = req.body || {};

  if (!packageName || typeof packageName !== "string") {
    return res.status(400).json({ error: "Tên gói sản phẩm là bắt buộc." });
  }
  const trimmedPackageName = packageName.trim();
  if (!trimmedPackageName) {
    return res.status(400).json({ error: "Tên gói sản phẩm không được để trống." });
  }

  const normalizedExpired = normalizeDateInput(expired);
  const normalizedSlotLimit = toNullableNumber(slotLimit);
const normalizedMatchMode =
    matchMode === "slot" ? "slot" : pkgCols.informationOrder || "information_order";

  try {
    const newRow = await withTransaction(async (trx) => {
      const [pkgRow] = await trx(TABLES.packageProduct)
        .insert({
          [pkgCols.package]: trimmedPackageName,
          [pkgCols.username]: informationUser || null,
          [pkgCols.password]: informationPass || null,
          [pkgCols.mail2nd]: informationMail || null,
          [pkgCols.note]: note || null,
          [pkgCols.supplier]: supplier || null,
          [pkgCols.cost]: toNullableNumber(importPrice),
          [pkgCols.expired]: normalizedExpired,
          [pkgCols.slot]: normalizedSlotLimit,
          [pkgCols.match]: normalizedMatchMode,
        })
        .returning("id");

      const packageId =
        pkgRow?.id ??
        pkgRow?.ID ??
        pkgRow?.packageProductId ??
        pkgRow?.package_id;

      let createdAccountStorageId = null;
      const mailFamily = informationUser || null;
      if (
        hasAccountStoragePayload({
          accountUser,
          accountPass,
          accountMail,
          accountNote,
          capacity,
        })
      ) {
        const nextStorageId = await getNextAccountStorageId(trx);
        await trx(TABLES.accountStorage).insert({
          [accCols.id]: nextStorageId,
          [accCols.username]: accountUser || null,
          [accCols.password]: accountPass || null,
          [accCols.mail2nd]: accountMail || null,
          [accCols.note]: accountNote || null,
          [accCols.storage]: toNullableNumber(capacity),
          [accCols.mailFamily]: mailFamily,
        });
        createdAccountStorageId = nextStorageId;
      }

      const fetched = await fetchPackageProductById(trx, packageId);
      if (fetched) return { ...fetched, hasCapacityField: Boolean(hasCapacityField) };

      // Fallback mapping if fetch fails
      return mapPackageProductRow({
        package_id: packageId,
        package_name: trimmedPackageName,
        package_username: informationUser || null,
        package_password: informationPass || null,
        package_mail_2nd: informationMail || null,
        package_note: note || null,
        package_supplier: supplier || null,
        package_import: toNullableNumber(importPrice),
        package_expired: normalizedExpired,
        package_slot: normalizedSlotLimit,
        package_match: normalizedMatchMode,
        account_id: createdAccountStorageId,
        account_username: accountUser || null,
        account_password: accountPass || null,
        account_mail_2nd: accountMail || null,
        account_note: accountNote || null,
        account_storage: toNullableNumber(capacity),
        account_mail_family: mailFamily,
        has_capacity_field: Boolean(hasCapacityField),
        package_products: [],
      });
    });

    res.status(201).json(newRow);
  } catch (error) {
    console.error("[packages] Insert failed:", error);
    res.status(500).json({ error: "Không thể tạo sản phẩm đóng gói." });
  }
};

const updatePackageProduct = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "ID sản phẩm đóng gói là bắt buộc." });
  }
  const {
    packageName,
    informationUser,
    informationPass,
    informationMail,
    note,
    supplier,
    importPrice,
    slotLimit,
    accountStorageId,
    accountUser,
    accountPass,
    accountMail,
    accountNote,
    capacity,
    expired,
    hasCapacityField,
    matchMode,
  } = req.body || {};

  if (!packageName || typeof packageName !== "string") {
    return res.status(400).json({ error: "Tên gói sản phẩm là bắt buộc." });
  }

  let storageIdNumber = null;
  if (accountStorageId !== undefined && accountStorageId !== null && accountStorageId !== "") {
    const parsed = Number(accountStorageId);
    storageIdNumber = Number.isFinite(parsed) ? parsed : null;
  }

  const normalizedExpired = normalizeDateInput(expired);
  const normalizedSlotLimit = toNullableNumber(slotLimit);
const normalizedMatchMode =
    matchMode === "slot" ? "slot" : pkgCols.informationOrder || "information_order";

  try {
    const updated = await withTransaction(async (trx) => {
      const [updatedPkg] = await trx(TABLES.packageProduct)
        .where(pkgCols.id, id)
        .update({
          [pkgCols.package]: packageName.trim(),
          [pkgCols.username]: informationUser || null,
          [pkgCols.password]: informationPass || null,
          [pkgCols.mail2nd]: informationMail || null,
          [pkgCols.note]: note || null,
          [pkgCols.supplier]: supplier || null,
          [pkgCols.cost]: toNullableNumber(importPrice),
          [pkgCols.expired]: normalizedExpired,
          [pkgCols.slot]: normalizedSlotLimit,
          [pkgCols.match]: normalizedMatchMode,
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

      const shouldUpsertAccountStorage = hasAccountStoragePayload({
        accountUser,
        accountPass,
        accountMail,
        accountNote,
        capacity,
      });
      const mailFamily = informationUser || null;

      if (storageIdNumber && shouldUpsertAccountStorage) {
        await trx(TABLES.accountStorage)
          .where(accCols.id, storageIdNumber)
          .update({
            [accCols.username]: accountUser || null,
            [accCols.password]: accountPass || null,
            [accCols.mail2nd]: accountMail || null,
            [accCols.note]: accountNote || null,
            [accCols.storage]: toNullableNumber(capacity),
            [accCols.mailFamily]: mailFamily,
          });
      } else if (!storageIdNumber && shouldUpsertAccountStorage) {
        const nextStorageId = await getNextAccountStorageId(trx);
        storageIdNumber = nextStorageId;
        await trx(TABLES.accountStorage).insert({
          [accCols.id]: nextStorageId,
          [accCols.username]: accountUser || null,
          [accCols.password]: accountPass || null,
          [accCols.mail2nd]: accountMail || null,
          [accCols.note]: accountNote || null,
          [accCols.storage]: toNullableNumber(capacity),
          [accCols.mailFamily]: mailFamily,
        });
      }

      const fetched = await fetchPackageProductById(trx, packageId ?? id);
      if (fetched) return { ...fetched, hasCapacityField: Boolean(hasCapacityField) };

      return mapPackageProductRow({
        package_id: packageId ?? id,
        package_name: packageName.trim(),
        package_username: informationUser || null,
        package_password: informationPass || null,
        package_mail_2nd: informationMail || null,
        package_note: note || null,
        package_supplier: supplier || null,
        package_import: toNullableNumber(importPrice),
        package_expired: normalizedExpired,
        account_id: storageIdNumber,
        account_username: accountUser || null,
        account_password: accountPass || null,
        account_mail_2nd: accountMail || null,
        account_note: accountNote || null,
        account_storage: toNullableNumber(capacity),
        account_mail_family: mailFamily,
        has_capacity_field: Boolean(hasCapacityField),
        package_match: normalizedMatchMode,
        package_products: [],
      });
    });

    if (!updated) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm đóng gói." });
    }
    res.json(updated);
  } catch (error) {
    console.error(`[packages] Update failed for id=${id}:`, error);
    res.status(500).json({ error: "Không thể cập nhật sản phẩm đóng gói." });
  }
};

const deletePackageProduct = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "ID sản phẩm đóng gói là bắt buộc." });
  }

  try {
    console.log("[packages] deletePackageProduct called with id:", id);
    const deletedRows = await db(TABLES.packageProduct)
      .where(pkgCols.id, id)
      .del()
      .returning([pkgCols.id, pkgCols.package]);

    console.log("[packages] deletePackageProduct result:", deletedRows);

    if (!deletedRows || deletedRows.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm đóng gói." });
    }

    res.json({
      deleted: deletedRows.length,
      deletedIds: deletedRows.map((row) => row[pkgCols.id]).filter(Boolean),
      deletedNames: [],
    });
  } catch (error) {
    console.error(`[packages] Delete failed for id=${id}:`, error);
    res.status(500).json({ error: "Không thể xóa sản phẩm đóng gói." });
  }
};

const bulkDeletePackages = async (req, res) => {
  const { packages } = req.body || {};
  if (!Array.isArray(packages)) {
    return res.status(400).json({ error: "các gói phải là một mảng." });
  }
  const names = Array.from(
    new Set(
      packages
        .map((name) => (typeof name === "string" ? name.trim() : ""))
        .filter(Boolean)
    )
  );
  if (!names.length) {
    return res.status(400).json({ error: "Không có tên gói nào được cung cấp." });
  }

  try {
    const deleteResult = await db(TABLES.packageProduct)
      .whereIn(pkgCols.package, names)
      .del()
      .returning(pkgCols.package);

    const deletedNames = (deleteResult || []).map((row) => row.package).filter(Boolean);
    res.json({
      deleted: deleteResult?.length || 0,
      deletedNames,
    });
  } catch (error) {
    console.error("[packages] Delete failed:", error);
    res.status(500).json({ error: "Không thể xóa sản phẩm đóng gói." });
  }
};

module.exports = {
  listPackageProducts,
  createPackageProduct,
  updatePackageProduct,
  deletePackageProduct,
  bulkDeletePackages,
};
