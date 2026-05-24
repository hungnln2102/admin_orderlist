const { PAYMENT_RECEIPT_DEF } = require("../shared/constants");
const { TABLES } = require("../shared/constants");

/** Khớp với webhook `SUPPLIER_REFUND_MATCH_TOLERANCE`. */
const SUPPLIER_REFUND_MATCH_TOLERANCE = 5000;

const normalizeAccountDigits = (value) =>
  String(value || "").replace(/\D/g, "");

/**
 * Tìm biên nhận Sepay cho luồng NCC hoàn tiền về shop.
 * Ưu tiên khớp theo số tiền; nội dung CK (legacy) chỉ dùng khi client gửi kèm.
 */
async function findSupplierRefundReceipt(trx, {
  expectedPaidAmount,
  shopBankAccountNumber,
  paymentContent,
}) {
  const receiptCols = PAYMENT_RECEIPT_DEF.columns;
  const expected = Math.abs(Math.round(Number(expectedPaidAmount) || 0));
  if (!(expected > 0)) return null;

  const content = String(paymentContent || "").trim();
  if (content) {
    const byContent = await trx.raw(
      `
      SELECT
        pr.${receiptCols.id} AS id,
        pr.${receiptCols.amount} AS amount,
        pr.${receiptCols.paidDate} AS paid_date,
        pr.${receiptCols.receiver} AS receiver,
        pr.${receiptCols.note} AS note
      FROM ${TABLES.paymentReceipt} pr
      WHERE COALESCE(pr.${receiptCols.note}::text, '') ILIKE ?
        AND ABS(COALESCE(pr.${receiptCols.amount}::numeric, 0) - ?) <= ?
      ORDER BY pr.${receiptCols.paidDate} DESC, pr.${receiptCols.id} DESC
      LIMIT 1;
    `,
      [`%${content}%`, expected, SUPPLIER_REFUND_MATCH_TOLERANCE]
    );
    if (byContent.rows?.[0]) return byContent.rows[0];
  }

  const accountDigits = normalizeAccountDigits(shopBankAccountNumber);
  const params = [expected, SUPPLIER_REFUND_MATCH_TOLERANCE, expected];
  let receiverFilter = "";
  if (accountDigits) {
    receiverFilter = `
      AND REGEXP_REPLACE(COALESCE(pr.${receiptCols.receiver}::text, ''), '[^0-9]', '', 'g') LIKE ?
    `;
    params.push(`%${accountDigits}%`);
  }

  const byAmount = await trx.raw(
    `
    SELECT
      pr.${receiptCols.id} AS id,
      pr.${receiptCols.amount} AS amount,
      pr.${receiptCols.paidDate} AS paid_date,
      pr.${receiptCols.receiver} AS receiver,
      pr.${receiptCols.note} AS note
    FROM ${TABLES.paymentReceipt} pr
    WHERE ABS(COALESCE(pr.${receiptCols.amount}::numeric, 0) - ?) <= ?
      ${receiverFilter}
    ORDER BY ABS(COALESCE(pr.${receiptCols.amount}::numeric, 0) - ?) ASC,
             pr.${receiptCols.paidDate} DESC,
             pr.${receiptCols.id} DESC
    LIMIT 1;
  `,
    params
  );
  return byAmount.rows?.[0] || null;
}

module.exports = {
  SUPPLIER_REFUND_MATCH_TOLERANCE,
  findSupplierRefundReceipt,
};
