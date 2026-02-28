/**
 * Supplier Service
 * Handles business logic for supplier/supply operations
 */

const { db } = require("../db");
const { TABLES, STATUS } = require("../controllers/Order/constants");
const { PARTNER_SCHEMA, SCHEMA_PARTNER, tableName } = require("../config/dbSchema");
const { toNullableNumber } = require("../utils/normalizers");
const { resolveSupplierNameColumn } = require("../controllers/SuppliesController/helpers");

const paymentSupplyCols = PARTNER_SCHEMA.PAYMENT_SUPPLY.COLS;
const PAYMENT_SUPPLY_TABLE = tableName(
  PARTNER_SCHEMA.PAYMENT_SUPPLY.TABLE,
  SCHEMA_PARTNER
);

/**
 * Find supplier ID by name
 * @param {string} supplyName - Supplier name
 * @param {Object} trx - Knex transaction (optional)
 * @returns {Promise<number|null>} Supplier ID or null
 */
const findSupplierIdByName = async (supplyName, trx = null) => {
  const query = trx || db;
  const name = supplyName === undefined || supplyName === null ? "" : String(supplyName);

  if (!name) return null;

  const supplierNameCol = await resolveSupplierNameColumn();
  const row = await query(TABLES.supplier)
    .select(PARTNER_SCHEMA.SUPPLIER.COLS.ID)
    .where(supplierNameCol, name)
    .first();

  return row && row[PARTNER_SCHEMA.SUPPLIER.COLS.ID] !== undefined
    ? Number(row[PARTNER_SCHEMA.SUPPLIER.COLS.ID]) || null
    : null;
};

/**
 * Format date for payment note
 * @param {Date} date - Date object
 * @returns {string} Formatted date (DD/MM/YYYY)
 */
const formatPaymentNote = (date = new Date()) => {
  const dt = date instanceof Date ? date : new Date();
  const day = String(dt.getDate()).padStart(2, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const year = dt.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Increase supplier debt (import value)
 * @param {number} supplyId - Supplier ID
 * @param {number} amount - Amount to add
 * @param {Date} noteDate - Date for note
 * @param {Object} trx - Knex transaction
 * @returns {Promise<void>}
 */
const increaseSupplierDebt = async (supplyId, amount, noteDate = new Date(), trx = null) => {
  const query = trx || db;
  const costValue = toNullableNumber(amount);

  if (!supplyId || !costValue || costValue <= 0) return;

  const colId = paymentSupplyCols.ID;
  const colImport = paymentSupplyCols.IMPORT_VALUE;
  const colPaid = paymentSupplyCols.PAID;
  const colStatus = paymentSupplyCols.STATUS;
  const colSourceId = paymentSupplyCols.SOURCE_ID;
  const colRound = paymentSupplyCols.ROUND;

  // Chỉ cộng vào chu kỳ đang "Chưa Thanh Toán" (tránh ghi đè chu kỳ đã PAID)
  const latestCycle = await query(PAYMENT_SUPPLY_TABLE)
    .where(colSourceId, supplyId)
    .andWhere(colStatus, STATUS.UNPAID)
    .orderBy(colId, "desc")
    .first();

  if (latestCycle) {
    const currentImport = toNullableNumber(latestCycle[colImport]) || 0;
    const currentPaid = toNullableNumber(latestCycle[colPaid]) || 0;
    const nextImport = currentImport + costValue;

    const updatePayload = {
      [colImport]: nextImport,
      [colPaid]: currentPaid,
    };

    if (latestCycle[colStatus] !== undefined) {
      updatePayload[colStatus] = latestCycle[colStatus];
    }

    await query(PAYMENT_SUPPLY_TABLE).where(colId, latestCycle[colId]).update(updatePayload);
  } else {
    await query(PAYMENT_SUPPLY_TABLE).insert({
      [colSourceId]: supplyId,
      [colImport]: costValue,
      [colPaid]: 0,
      [colRound]: formatPaymentNote(noteDate),
      [colStatus]: STATUS.UNPAID,
    });
  }
};

/**
 * Decrease supplier debt (import value)
 * @param {number} supplyId - Supplier ID
 * @param {number} amount - Amount to subtract
 * @param {Date} noteDate - Date for note
 * @param {Object} trx - Knex transaction
 * @returns {Promise<void>}
 */
const decreaseSupplierDebt = async (supplyId, amount, noteDate = new Date(), trx = null) => {
  const query = trx || db;
  const costValue = toNullableNumber(amount);

  if (!supplyId || !costValue || costValue <= 0) return;

  const colId = paymentSupplyCols.ID;
  const colImport = paymentSupplyCols.IMPORT_VALUE;
  const colPaid = paymentSupplyCols.PAID;
  const colStatus = paymentSupplyCols.STATUS;
  const colSourceId = paymentSupplyCols.SOURCE_ID;
  const colRound = paymentSupplyCols.ROUND;

  // Trừ vào chu kỳ UNPAID nếu có; nếu không có chu kỳ UNPAID (đã PAID hết),
  // tạo một dòng điều chỉnh âm để thể hiện NCC đang "dư/hoàn" lại.
  const latestCycle = await query(PAYMENT_SUPPLY_TABLE)
    .where(colSourceId, supplyId)
    .andWhere(colStatus, STATUS.UNPAID)
    .orderBy(colId, "desc")
    .first();

  if (latestCycle) {
    const currentImport = toNullableNumber(latestCycle[colImport]) || 0;
    const currentPaid = toNullableNumber(latestCycle[colPaid]) || 0;
    const nextImport = currentImport - costValue;

    const updatePayload = {
      [colImport]: nextImport,
      [colPaid]: currentPaid,
    };

    if (latestCycle[colStatus] !== undefined) {
      updatePayload[colStatus] = latestCycle[colStatus];
    }

    await query(PAYMENT_SUPPLY_TABLE).where(colId, latestCycle[colId]).update(updatePayload);
  } else {
    await query(PAYMENT_SUPPLY_TABLE).insert({
      [colSourceId]: supplyId,
      [colImport]: -costValue,
      [colPaid]: 0,
      [colRound]: `ADJ - ${formatPaymentNote(noteDate)}`,
      [colStatus]: STATUS.UNPAID,
    });
  }
};

module.exports = {
  findSupplierIdByName,
  increaseSupplierDebt,
  decreaseSupplierDebt,
  formatPaymentNote,
};
