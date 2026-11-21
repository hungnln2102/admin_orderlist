const schemaOrders = process.env.DB_SCHEMA_ORDERS
  || process.env.SCHEMA_ORDERS
  || process.env.DB_SCHEMA_BUSINESS
  || "business";

const ALLOWED_STATUSES = [
  "UNPAID",
  "PROCESSING",
  "RENEW_REQUIRED",
  "PAID",
  "EXPIRED",
  "CANCELED",
];

function quoteIdentifier(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error("Invalid PostgreSQL identifier for order status migration");
  }
  return `"${value}"`;
}

function getOrderTable() {
  return `${quoteIdentifier(schemaOrders)}.${quoteIdentifier("order_list")}`;
}

exports.up = async function (knex) {
  const orderTable = getOrderTable();
  const allowedStatusesSql = ALLOWED_STATUSES.map((status) => `'${status}'`).join(", ");

  await knex.transaction(async (trx) => {
    await trx.raw(`
      UPDATE ${orderTable}
      SET status = CASE BTRIM(status)
        WHEN 'Chưa Thanh Toán' THEN 'UNPAID'
        WHEN 'Đang Xử Lý' THEN 'PROCESSING'
        WHEN 'Cần Gia Hạn' THEN 'RENEW_REQUIRED'
        WHEN 'Đã Thanh Toán' THEN 'PAID'
        WHEN 'Hết Hạn' THEN 'EXPIRED'
        WHEN 'Đã Hoàn' THEN 'CANCELED'
        WHEN 'Đã Hoàn Tiền' THEN 'CANCELED'
        WHEN 'Chưa Hoàn Tiền' THEN 'CANCELED'
        WHEN 'Đã Hủy' THEN 'CANCELED'
        WHEN 'Hủy' THEN 'CANCELED'
        WHEN 'REFUNDED' THEN 'CANCELED'
        WHEN 'REFUND_PENDING' THEN 'CANCELED'
        ELSE BTRIM(status)
      END
      WHERE BTRIM(status) IN (
        'Chưa Thanh Toán',
        'Đang Xử Lý',
        'Cần Gia Hạn',
        'Đã Thanh Toán',
        'Hết Hạn',
        'Đã Hoàn',
        'Đã Hoàn Tiền',
        'Chưa Hoàn Tiền',
        'Đã Hủy',
        'Hủy',
        'REFUNDED',
        'REFUND_PENDING'
      );
    `);

    const invalidResult = await trx.raw(`
      SELECT COALESCE(NULLIF(BTRIM(status), ''), '<NULL_OR_EMPTY>') AS status, COUNT(*)::integer AS count
      FROM ${orderTable}
      WHERE status IS NULL OR BTRIM(status) NOT IN (${allowedStatusesSql})
      GROUP BY COALESCE(NULLIF(BTRIM(status), ''), '<NULL_OR_EMPTY>')
      ORDER BY status;
    `);
    const invalidStatuses = invalidResult.rows || invalidResult;
    if (invalidStatuses.length > 0) {
      const details = invalidStatuses.map((row) => `${row.status} (${row.count})`).join(", ");
      throw new Error(`Cannot normalize order_list.status; unsupported values remain: ${details}`);
    }

    await trx.raw(`ALTER TABLE ${orderTable} DROP CONSTRAINT IF EXISTS "order_list_status_check";`);
    await trx.raw(`
      ALTER TABLE ${orderTable}
      ADD CONSTRAINT "order_list_status_check"
      CHECK (status IS NOT NULL AND status IN (${allowedStatusesSql}));
    `);
  });
};

exports.down = async function (knex) {
  const orderTable = getOrderTable();
  await knex.raw(`ALTER TABLE ${orderTable} DROP CONSTRAINT IF EXISTS "order_list_status_check";`);
};