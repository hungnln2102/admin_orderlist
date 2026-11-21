const { TABLES, COLS } = require("@/db");
const { listImportWarehouseTags } = require("@/domains/warehouse/services/importWarehouseTagService");

const A = COLS.ACCOUNTS;
const AS = COLS.ACCOUNT_SLOTS;
const PN = COLS.PRODUCT_NAMES;
const PP = COLS.PACKAGE_PRODUCT;
const V = COLS.VARIANT;
const PRD = COLS.PRODUCT;

function normalizeWarehouseAccountUsername(order) {
  const value = order?.information_order || order?.slot || order?.customer || "";
  return String(value).trim().toLowerCase();
}

async function resolveWarehouseProductNameIdInTrx(trx, order) {
  const variantId = Number(order?.id_product);
  let productName = "";

  if (Number.isInteger(variantId) && variantId > 0) {
    const variant = await trx(TABLES.VARIANT + " as v")
      .leftJoin(TABLES.PRODUCT + " as p", "p." + PRD.ID, "v." + V.PRODUCT_ID)
      .where("v." + V.ID, variantId)
      .select(
        "v." + V.VARIANT_NAME + " as variant_name",
        "v." + V.DISPLAY_NAME + " as display_name",
        "p." + PRD.PACKAGE_NAME + " as package_name"
      )
      .first();
    productName = variant?.package_name || variant?.variant_name || variant?.display_name || "";
  }

  if (!productName) productName = String(order?.information_order || "").trim();
  if (!productName) return null;

  const productNameRow = await trx(TABLES.PRODUCT_NAMES)
    .whereRaw("LOWER(TRIM(??)) = ?", [PN.NAME, productName.toLowerCase()])
    .first();
  return productNameRow ? Number(productNameRow[PN.ID]) : null;
}

function hasWarehouseSyncFields(payload) {
  return [
    "information_order",
    "id_product",
    "slot",
    "note",
    "days",
    "expired_at",
    "cost",
    "package_slots",
    "warehouse_password",
    "warehouse_backup_email",
    "warehouse_two_fa",
    "warehouse_otp_type",
    "otp_type",
  ].some((field) => payload[field] !== undefined);
}

async function syncExistingImportOrderToWarehouseInTrx(trx, { existingOrder, updatedOrder, payload }) {
  if (!String(existingOrder.id_order || "").toUpperCase().startsWith("MAVN")) return null;
  if (!hasWarehouseSyncFields(payload)) return null;

  const oldAccountUsername = normalizeWarehouseAccountUsername(existingOrder);
  const oldProductNameId = await resolveWarehouseProductNameIdInTrx(trx, existingOrder);
  if (!oldAccountUsername || !oldProductNameId) return null;

  const account = await trx(TABLES.ACCOUNTS)
    .whereRaw("LOWER(TRIM(??)) = ?", [A.ACCOUNT_USERNAME, oldAccountUsername])
    .forUpdate()
    .first();
  if (!account) return null;

  let matchingSlots = await trx(TABLES.ACCOUNT_SLOTS)
    .where({ [AS.ACCOUNT_ID]: account[A.ID], [AS.NAME_ID]: oldProductNameId })
    .forUpdate();
  if (matchingSlots.length === 0) return null;
  if (matchingSlots.length > 1 && Number(existingOrder.id_product) > 0) {
    const tags = await listImportWarehouseTags(Number(existingOrder.id_product), trx);
    matchingSlots = matchingSlots.filter((slot) => tags.includes(slot[AS.VARIANT_TAG]));
  }
  if (matchingSlots.length === 0) return null;
  if (matchingSlots.length > 1) {
    throw new Error(`Không thể đồng bộ kho: tài khoản ${oldAccountUsername} có nhiều slot cùng dịch vụ.`);
  }

  const slot = matchingSlots[0];
  const slotUpdates = { [AS.UPDATED_AT]: trx.fn.now() };
  if (payload.warehouse_password !== undefined) slotUpdates[AS.PASSWORD] = payload.warehouse_password || null;
  else if (payload.slot !== undefined) slotUpdates[AS.PASSWORD] = payload.slot || null;
  if (payload.warehouse_backup_email !== undefined) slotUpdates[AS.BACKUP_EMAIL] = payload.warehouse_backup_email || null;
  if (payload.warehouse_two_fa !== undefined) slotUpdates[AS.TWO_FA] = payload.warehouse_two_fa || null;
  if (payload.warehouse_otp_type !== undefined) slotUpdates[AS.OTP_TYPE] = payload.warehouse_otp_type || null;
  else if (payload.otp_type !== undefined) slotUpdates[AS.OTP_TYPE] = payload.otp_type || null;
  if (payload.note !== undefined) slotUpdates[AS.SERVICE_NOTE] = payload.note || null;
  if (payload.days !== undefined) slotUpdates[AS.DAYS] = Number(updatedOrder.days || 0) || null;
  if (payload.expired_at !== undefined) slotUpdates[AS.EXPIRED_AT] = updatedOrder.expired_at || null;

  await trx(TABLES.ACCOUNT_SLOTS).where(AS.ID, slot[AS.ID]).update(slotUpdates);

  if (payload.information_order !== undefined) {
    const nextAccountUsername = normalizeWarehouseAccountUsername(updatedOrder);
    if (!nextAccountUsername) throw new Error("Không thể đồng bộ kho: tài khoản mới không được để trống.");
    await trx(TABLES.ACCOUNTS)
      .where(A.ID, account[A.ID])
      .update({ [A.ACCOUNT_USERNAME]: nextAccountUsername, [A.UPDATED_AT]: trx.fn.now() });
  }

  const packageUpdates = { [PP.UPDATED_AT]: trx.fn.now() };
  if (payload.cost !== undefined) packageUpdates[PP.COST] = Number(updatedOrder.cost || 0);
  if (payload.package_slots !== undefined) packageUpdates[PP.SLOT] = Number(payload.package_slots || 0) || null;
  const packageHasBusinessChanges = Object.keys(packageUpdates).length > 1;
  let packageProductId = null;
  if (packageHasBusinessChanges) {
    const matchingPackages = await trx(TABLES.PACKAGE_PRODUCT)
      .where({ [PP.ACCOUNT_ID]: account[A.ID], [PP.PRODUCT_NAME_ID]: oldProductNameId })
      .forUpdate();
    if (matchingPackages.length > 1) {
      throw new Error(`Không thể đồng bộ kho gói: tài khoản ${oldAccountUsername} có nhiều gói cùng dịch vụ.`);
    }
    if (matchingPackages.length === 1) {
      packageProductId = matchingPackages[0][PP.ID];
      await trx(TABLES.PACKAGE_PRODUCT).where(PP.ID, packageProductId).update(packageUpdates);
    }
  }

  return { accountId: account[A.ID], slotId: slot[AS.ID], packageProductId };
}
module.exports = { syncExistingImportOrderToWarehouseInTrx };
