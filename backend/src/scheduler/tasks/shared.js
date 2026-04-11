const { normalizeOrderRow } = require("../../controllers/Order/helpers");
const { STATUS } = require("../../utils/statuses");
const { COL, TABLES, normalizeDateSQL, intFromTextSQL, expiryDateSQL } = require("../sqlHelpers");

/**
 * SELECT renewal candidates: same columns and filters as notify tasks, parameterized by days left.
 * When daysLeft is 0, the computed `days_left` column is omitted from the SELECT list (legacy zero-day query shape).
 *
 * @param {string} sqlDate - SQL date expression (e.g. CURRENT_DATE or mock)
 * @param {number} daysLeft - exact `(expiry - sqlDate)` match in WHERE
 * @returns {string} SQL text
 */
function buildRenewalQuery(sqlDate, daysLeft) {
  const d = Number(daysLeft);
  if (!Number.isFinite(d) || Math.trunc(d) !== d) {
    throw new TypeError(`buildRenewalQuery: daysLeft must be a finite integer, got ${daysLeft}`);
  }
  const daysLeftSelect =
    d !== 0
      ? `,
        ( ${expiryDateSQL()} - ${sqlDate} ) AS days_left`
      : "";

  return `
      SELECT
        ${COL.idOrder},
        ${COL.idProduct},
        ${COL.informationOrder},
        ${COL.customer},
        ${COL.contact},
        ${COL.slot},
        ${normalizeDateSQL(COL.orderDate)} AS ${COL.orderDate},
        ${intFromTextSQL(COL.days)} AS ${COL.days},
        ${expiryDateSQL()} AS ${COL.expiryDate},
        ${COL.idSupply},
        ${COL.cost},
        ${COL.price},
        ${COL.note},
        ${COL.status}${daysLeftSelect}
      FROM ${TABLES.orderList}
      WHERE ( ${expiryDateSQL()} - ${sqlDate} ) = ${d}
        AND ${COL.status} = '${STATUS.RENEWAL}'
      ORDER BY ${COL.idOrder}
    `;
}

/**
 * Map a DB row to the Telegram renewal notification payload shape.
 * When `computedPrice` is passed (four-day flow), uses computed price plus contact and days_left fields.
 * When omitted (zero-day flow), uses normalized row price and omits contact / customer_link / days_left.
 *
 * @param {object} row - raw query row
 * @param {string} today - YMD today for normalizeOrderRow
 * @param {Map<number, string>} nameMap - variant id -> display name
 * @param {{ price: unknown }}|undefined} computedPrice - from computeOrderCurrentPrice when defined
 * @returns {object} notification row
 */
function normalizeNotifyRow(row, today, nameMap, computedPrice) {
  const normalized = normalizeOrderRow(row, today);
  const rawIdProduct = row.id_product ?? normalized.id_product ?? normalized.idProduct;
  const productDisplay =
    rawIdProduct != null && nameMap.get(Number(rawIdProduct)) != null
      ? nameMap.get(Number(rawIdProduct))
      : typeof rawIdProduct === "string"
        ? rawIdProduct
        : String(rawIdProduct ?? "");

  const idProductVal = productDisplay || normalized.id_product || normalized.idProduct;
  const out = {
    id_order: normalized.id_order || normalized.idOrder,
    idOrder: normalized.id_order || normalized.idOrder,
    order_code: normalized.id_order || normalized.idOrder,
    orderCode: normalized.id_order || normalized.idOrder,
    customer: normalized.customer,
    customer_name: normalized.customer,
    contact: normalized.contact,
    customer_link: normalized.contact,
  };

  out.id_product = idProductVal;
  out.idProduct = idProductVal;
  out.information_order = normalized.information_order || normalized.informationOrder;
  out.informationOrder = normalized.information_order || normalized.informationOrder;
  out.slot = normalized.slot;
  out.registration_date_display = normalized.registration_date_display;
  out.registration_date_str = normalized.registration_date_str;
  out.order_date = normalized.order_date || normalized.registration_date;
  out.days = normalized.days || normalized.total_days;
  out.total_days = normalized.days || normalized.total_days;
  out.expiry_date_display = normalized.expiry_date_display;
  out.expiry_date_str = normalized.expiry_date_display;
  out.expiry_date = normalized.expiry_date;
  out.price = computedPrice !== undefined ? computedPrice.price : normalized.price;

  if (computedPrice !== undefined) {
    out.days_left = row.days_left || 4;
  }

  return out;
}

module.exports = { buildRenewalQuery, normalizeNotifyRow };
