const { db, withTransaction } = require("../../db");
const {
  normalizeDateInput,
  toNullableNumber,
  hasAccountStoragePayload,
} = require("../../utils/normalizers");
const {
  PACKAGE_PRODUCTS_SELECT,
  mapPackageProductRow,
  fetchPackageProductById,
} = require("../../services/packageProductService");
const { getNextAccountStorageId } = require("../../services/idService");
const { pkgCols, accCols, TABLES } = require("./constants");

const normalizeMatchMode = (matchMode) =>
  matchMode === "slot" ? "slot" : "information_order";

const listPackageProducts = async () => {
  const result = await db.raw(`${PACKAGE_PRODUCTS_SELECT} ORDER BY pp.id ASC`);
  const rows = (result.rows || []).map(mapPackageProductRow);
  return rows;
};

const createPackageProduct = async (payload) => {
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
  } = payload || {};

  const trimmedPackageName = packageName.trim();
  const normalizedExpired = normalizeDateInput(expired);
  const normalizedSlotLimit = toNullableNumber(slotLimit);
  const normalizedMatchMode = normalizeMatchMode(matchMode);

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
      pkgRow?.id ?? pkgRow?.ID ?? pkgRow?.packageProductId ?? pkgRow?.package_id;

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

  return newRow;
};

const updatePackageProduct = async (id, payload) => {
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
  } = payload || {};

  let storageIdNumber = null;
  if (accountStorageId !== undefined && accountStorageId !== null && accountStorageId !== "") {
    const parsed = Number(accountStorageId);
    storageIdNumber = Number.isFinite(parsed) ? parsed : null;
  }

  const normalizedExpired = normalizeDateInput(expired);
  const normalizedSlotLimit = toNullableNumber(slotLimit);
  const normalizedMatchMode = normalizeMatchMode(matchMode);

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
      .returning([pkgCols.id, pkgCols.package]);

    return deletedRows;
  });

const bulkDeletePackages = async (names) =>
  withTransaction(async (trx) => {
    await trx(TABLES.packageProduct)
      .whereIn(pkgCols.package, names)
      .update({ [pkgCols.match]: null });
    const deleteResult = await trx(TABLES.packageProduct)
      .whereIn(pkgCols.package, names)
      .del()
      .returning(pkgCols.package);

    return deleteResult || [];
  });

module.exports = {
  listPackageProducts,
  createPackageProduct,
  updatePackageProduct,
  deletePackageProduct,
  bulkDeletePackages,
};
