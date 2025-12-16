const {
  pool,
  ORDER_TABLE,
  PAYMENT_RECEIPT_TABLE,
  PRODUCT_PRICE_TABLE,
  SUPPLY_TABLE,
  SUPPLY_PRICE_TABLE,
  PAYMENT_SUPPLY_TABLE,
  ORDER_COLS,
  PAYMENT_RECEIPT_COLS,
  PRODUCT_PRICE_COLS,
  SUPPLY_COLS,
  SUPPLY_PRICE_COLS,
  PAYMENT_SUPPLY_COLS,
  DB_SCHEMA,
} = require("./config");
const {
  normalizeAmount,
  parsePaidDate,
  extractOrderCodeFromText,
  extractSenderFromContent,
  safeIdent,
  normalizeMoney,
  normalizeImportValue,
  calcGiaBan,
  roundToThousands,
} = require("./utils");

let paymentReceiptOrderColCache = null;
const getPaymentReceiptOrderColumn = async () => {
  if (paymentReceiptOrderColCache) return paymentReceiptOrderColCache;

  const preferred = [
    process.env.PAYMENT_RECEIPT_ORDER_COLUMN,
    "id_order",
    "order_code",
    PAYMENT_RECEIPT_COLS.orderCode,
  ]
    .filter(Boolean)
    .map((c) => String(c).toLowerCase());

  try {
    const res = await pool.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
      `,
      [DB_SCHEMA, "payment_receipt"]
    );
    const names = res.rows.map((r) => String(r.column_name || "").toLowerCase());
    const found = preferred.find((c) => names.includes(c));
    paymentReceiptOrderColCache = found || names[0] || "id_order";
    console.log(
      `[Webhook] payment_receipt order column resolved to '${paymentReceiptOrderColCache}' (candidates: ${preferred.join(
        ", "
      )})`
    );
  } catch (err) {
    console.error("Failed to resolve payment_receipt column list:", err);
    paymentReceiptOrderColCache = "id_order";
  }
  return paymentReceiptOrderColCache;
};

const insertPaymentReceipt = async (transaction) => {
  if (!transaction) return;

  const orderCode =
    extractOrderCodeFromText(
      transaction.transaction_content,
      transaction.note,
      transaction.description
    ) || "";
  const paidDate = parsePaidDate(
    transaction.transaction_date || transaction.transaction_date_raw
  );
  const amount = normalizeAmount(
    transaction.transfer_amount || transaction.amount_in
  );
  const receiverAccount = transaction.account_number || transaction.accountNumber || "";
  const senderParsed = extractSenderFromContent(
    transaction.transaction_content || transaction.description
  );
  const noteValue = transaction.note || transaction.description || "";

  const orderCodeColumn =
    (await getPaymentReceiptOrderColumn()) || PAYMENT_RECEIPT_COLS.orderCode || "id_order";
  const sql = `
    INSERT INTO ${PAYMENT_RECEIPT_TABLE} (
      ${safeIdent(orderCodeColumn)},
      ${safeIdent(PAYMENT_RECEIPT_COLS.paidDate)},
      ${safeIdent(PAYMENT_RECEIPT_COLS.amount)},
      ${safeIdent(PAYMENT_RECEIPT_COLS.receiver)},
      ${safeIdent(PAYMENT_RECEIPT_COLS.sender)},
      ${safeIdent(PAYMENT_RECEIPT_COLS.note)}
    )
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  console.log("[Webhook] payment_receipt SQL:", sql.trim(), {
    params: [
      orderCode,
      paidDate,
      amount,
      receiverAccount,
      senderParsed || "",
      noteValue,
    ],
  });
  await pool.query(sql, [
    orderCode,
    paidDate,
    amount,
    receiverAccount,
    senderParsed || "",
    noteValue,
  ]);
};

const ensureSupplyAndPriceFromOrder = async (orderCode, options = {}) => {
  if (!orderCode) return null;
  const referenceImport = normalizeMoney(options.referenceImport);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderRes = await client.query(
      `SELECT
        ${ORDER_COLS.idProduct} AS product_name,
        ${ORDER_COLS.supply} AS supply_name,
        ${ORDER_COLS.cost} AS cost_value
      FROM ${ORDER_TABLE}
      WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
      LIMIT 1`,
      [orderCode]
    );

    if (!orderRes.rows.length) {
      await client.query("ROLLBACK");
      return null;
    }

    const productName = String(orderRes.rows[0].product_name || "").trim();
    const supplyName = String(orderRes.rows[0].supply_name || "").trim();
    const costValue = normalizeMoney(orderRes.rows[0].cost_value);

    let productId = null;
    if (productName) {
      const productRes = await client.query(
        `SELECT ${PRODUCT_PRICE_COLS.id} AS id
         FROM ${PRODUCT_PRICE_TABLE}
         WHERE LOWER(${PRODUCT_PRICE_COLS.product}) = LOWER($1)
         LIMIT 1`,
        [productName]
      );

      if (productRes.rows.length) {
        productId = productRes.rows[0].id;
      } else {
        const insertProduct = await client.query(
          `INSERT INTO ${PRODUCT_PRICE_TABLE} (${PRODUCT_PRICE_COLS.product})
           VALUES ($1)
           RETURNING ${PRODUCT_PRICE_COLS.id} AS id`,
          [productName]
        );
        productId = insertProduct.rows[0].id;
      }
    }

    let sourceId = null;
    if (supplyName) {
      const supplyRes = await client.query(
        `SELECT ${SUPPLY_COLS.id} AS id
         FROM ${SUPPLY_TABLE}
         WHERE LOWER(${SUPPLY_COLS.sourceName}) = LOWER($1)
         LIMIT 1`,
        [supplyName]
      );

      if (supplyRes.rows.length) {
        sourceId = supplyRes.rows[0].id;
      } else {
        const insertSupply = await client.query(
          `INSERT INTO ${SUPPLY_TABLE} (${SUPPLY_COLS.sourceName})
           VALUES ($1)
           RETURNING ${SUPPLY_COLS.id} AS id`,
          [supplyName]
        );
        sourceId = insertSupply.rows[0].id;
      }
    }

    let supplyPriceValue = costValue || referenceImport || 0;
    let supplyPriceScaled = false;
    let rawSupplyPrice = null;
    if (productId && sourceId) {
      const priceRes = await client.query(
        `SELECT ${SUPPLY_PRICE_COLS.price} AS price
         FROM ${SUPPLY_PRICE_TABLE}
         WHERE ${SUPPLY_PRICE_COLS.productId} = $1
           AND ${SUPPLY_PRICE_COLS.sourceId} = $2
         ORDER BY ${SUPPLY_PRICE_COLS.id} DESC
         LIMIT 1`,
        [productId, sourceId]
      );

      if (priceRes.rows.length) {
        rawSupplyPrice = normalizeMoney(priceRes.rows[0].price);
        const normalized = normalizeImportValue(rawSupplyPrice, costValue, referenceImport);
        supplyPriceValue = normalized.value;
        supplyPriceScaled = normalized.scaled;
        if (supplyPriceScaled && rawSupplyPrice !== supplyPriceValue) {
          try {
            await client.query(
              `UPDATE ${SUPPLY_PRICE_TABLE}
               SET ${SUPPLY_PRICE_COLS.price} = $1
             WHERE ${SUPPLY_PRICE_COLS.productId} = $2
               AND ${SUPPLY_PRICE_COLS.sourceId} = $3`,
              [supplyPriceValue, productId, sourceId]
            );
          } catch (adjustErr) {
            console.error(
              "Failed to normalize supply_price for productId=%s, sourceId=%s:",
              productId,
              sourceId,
              adjustErr
            );
          }
        }
      } else {
        try {
          const insertPrice = supplyPriceValue || referenceImport || costValue;
          await client.query(
            `INSERT INTO ${SUPPLY_PRICE_TABLE} (${SUPPLY_PRICE_COLS.productId}, ${SUPPLY_PRICE_COLS.sourceId}, ${SUPPLY_PRICE_COLS.price})
             VALUES ($1, $2, $3)
             ON CONFLICT ON CONSTRAINT supply_price_pkey DO NOTHING`,
            [productId, sourceId, insertPrice]
          );
        } catch (insertErr) {
          console.error(
            "Insert supply_price failed, productId=%s, sourceId=%s:",
            productId,
            sourceId,
            insertErr
          );
        }
        supplyPriceValue = supplyPriceValue || referenceImport || costValue;
      }
    }

    await client.query("COMMIT");
    return {
      productId,
      sourceId,
      price: supplyPriceValue,
      priceScaled: supplyPriceScaled,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const updatePaymentSupplyBalance = async (sourceId, priceValue, noteDate) => {
  if (!(sourceId && Number.isFinite(priceValue) && priceValue > 0)) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const latestRes = await client.query(
      `SELECT
        ${PAYMENT_SUPPLY_COLS.id} AS id,
        ${PAYMENT_SUPPLY_COLS.importValue} AS import_value,
        ${PAYMENT_SUPPLY_COLS.paid} AS paid_value,
        ${PAYMENT_SUPPLY_COLS.status} AS status_label
       FROM ${PAYMENT_SUPPLY_TABLE}
       WHERE ${PAYMENT_SUPPLY_COLS.sourceId} = $1
       ORDER BY ${PAYMENT_SUPPLY_COLS.id} DESC
       LIMIT 1`,
      [sourceId]
    );

    const formatNote = () => {
      const dt = noteDate instanceof Date ? noteDate : new Date();
      const day = String(dt.getDate()).padStart(2, "0");
      const month = String(dt.getMonth() + 1).padStart(2, "0");
      const year = dt.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const latest = latestRes.rows[0];
    const statusLabel = String(latest?.status_label || "");
    if (latest && statusLabel === "Chưa Thanh Toán") {
      await client.query(
        `UPDATE ${PAYMENT_SUPPLY_TABLE}
         SET ${PAYMENT_SUPPLY_COLS.importValue} = COALESCE(${PAYMENT_SUPPLY_COLS.importValue}, 0) + $2
         WHERE ${PAYMENT_SUPPLY_COLS.id} = $1`,
        [latest.id, priceValue]
      );
    } else {
      await client.query(
        `INSERT INTO ${PAYMENT_SUPPLY_TABLE} (
            ${PAYMENT_SUPPLY_COLS.sourceId},
            ${PAYMENT_SUPPLY_COLS.importValue},
            ${PAYMENT_SUPPLY_COLS.round},
            ${PAYMENT_SUPPLY_COLS.status},
            ${PAYMENT_SUPPLY_COLS.paid}
          )
          VALUES ($1, $2, $3, 'Chưa Thanh Toán', NULL)`,
        [sourceId, priceValue, formatNote()]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

const calculateSalePrice = ({ orderCode, giaNhap, giaBanCu, priceMax, pctCtv, pctKhach }) =>
  roundToThousands(
    calcGiaBan({
      orderId: orderCode,
      giaNhap,
      priceMax,
      pctCtv,
      pctKhach,
      giaBanFallback: giaBanCu,
    })
  );

module.exports = {
  insertPaymentReceipt,
  ensureSupplyAndPriceFromOrder,
  updatePaymentSupplyBalance,
  calculateSalePrice,
};
