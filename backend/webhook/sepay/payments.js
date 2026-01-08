const {
  pool,
  ORDER_TABLE,
  PAYMENT_RECEIPT_TABLE,
  PAYMENT_SUPPLY_TABLE,
  ORDER_COLS,
  PAYMENT_RECEIPT_COLS,
  SUPPLIER_TABLE,
  SUPPLIER_COLS,
  SUPPLIER_COST_TABLE,
  SUPPLIER_COST_COLS,
  PAYMENT_SUPPLY_COLS,
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
  fetchProductPricing,
} = require("./utils");

let paymentReceiptOrderColCache = null;
const PAYMENT_RECEIPT_BASE_TABLE = PAYMENT_RECEIPT_TABLE.split(".").pop();
const PAYMENT_RECEIPT_SCHEMA = PAYMENT_RECEIPT_TABLE.includes(".")
  ? PAYMENT_RECEIPT_TABLE.split(".")[0]
  : process.env.DB_SCHEMA_ORDERS || process.env.SCHEMA_ORDERS || "orders";

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
      [PAYMENT_RECEIPT_SCHEMA, PAYMENT_RECEIPT_BASE_TABLE]
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

const normalizeKeyText = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const buildReceiptIdempotencyKey = ({
  orderCode,
  paidDate,
  amount,
  receiverAccount,
  senderParsed,
  noteValue,
}) =>
  [
    normalizeKeyText(orderCode),
    normalizeKeyText(paidDate),
    String(Number(amount) || 0),
    normalizeKeyText(receiverAccount),
    normalizeKeyText(senderParsed),
    normalizeKeyText(noteValue),
  ].join("|");

const insertPaymentReceipt = async (transaction, options = {}) => {
  if (!transaction) return { inserted: false, skipped: true, reason: "missing_transaction" };

  const orderCode =
    (options.orderCode !== undefined ? String(options.orderCode || "") : "") ||
    extractOrderCodeFromText(
      transaction.transaction_content,
      transaction.note,
      transaction.description
    ) ||
    "";
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
    (await getPaymentReceiptOrderColumn()) ||
    PAYMENT_RECEIPT_COLS.orderCode ||
    "id_order";

  const externalClient = options.client || null;
  const client = externalClient || (await pool.connect());
  const manageTransaction = !externalClient;

  const receiptKey = buildReceiptIdempotencyKey({
    orderCode,
    paidDate,
    amount,
    receiverAccount,
    senderParsed,
    noteValue,
  });

  try {
    if (manageTransaction) {
      await client.query("BEGIN");
    }

    // Ensure concurrent identical webhooks cannot double-insert / double-update.
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2));",
      ["sepay_payment_receipt", receiptKey]
    );

    const existsSql = `
      SELECT ${safeIdent(PAYMENT_RECEIPT_COLS.id)} AS id
      FROM ${PAYMENT_RECEIPT_TABLE}
      WHERE LOWER(${safeIdent(orderCodeColumn)}) = LOWER($1)
        AND ${safeIdent(PAYMENT_RECEIPT_COLS.paidDate)} = $2
        AND ${safeIdent(PAYMENT_RECEIPT_COLS.amount)} = $3
        AND COALESCE(${safeIdent(PAYMENT_RECEIPT_COLS.receiver)}::text, '') = $4
        AND COALESCE(${safeIdent(PAYMENT_RECEIPT_COLS.sender)}::text, '') = $5
        AND COALESCE(${safeIdent(PAYMENT_RECEIPT_COLS.note)}::text, '') = $6
      LIMIT 1
    `;

    const existsRes = await client.query(existsSql, [
      orderCode,
      paidDate,
      amount,
      receiverAccount,
      senderParsed || "",
      noteValue,
    ]);

    if (existsRes.rows.length) {
      if (manageTransaction) {
        await client.query("COMMIT");
      }
      return {
        inserted: false,
        duplicate: true,
        existingId: existsRes.rows[0]?.id ?? null,
        receiptKey,
        orderCode,
        paidDate,
        amount,
      };
    }

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
      RETURNING ${safeIdent(PAYMENT_RECEIPT_COLS.id)} AS id
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

    const insertRes = await client.query(sql, [
      orderCode,
      paidDate,
      amount,
      receiverAccount,
      senderParsed || "",
      noteValue,
    ]);

    if (manageTransaction) {
      await client.query("COMMIT");
    }

    return {
      inserted: true,
      id: insertRes.rows[0]?.id ?? null,
      receiptKey,
      orderCode,
      paidDate,
      amount,
    };
  } catch (err) {
    if (manageTransaction) {
      await client.query("ROLLBACK");
    }
    throw err;
  } finally {
    if (manageTransaction) {
      client.release();
    }
  }
};

const ensureSupplyAndPriceFromOrder = async (orderCode, options = {}) => {
  if (!orderCode) return null;
  const referenceImport = normalizeMoney(options.referenceImport);
  const externalClient = options.client || null;
  const client = externalClient || (await pool.connect());
  const manageTransaction = !externalClient;
  try {
    if (manageTransaction) {
      await client.query("BEGIN");
    }

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
      if (manageTransaction) {
        await client.query("ROLLBACK");
      }
      return null;
    }

    const productName = String(orderRes.rows[0].product_name || "").trim();
    const supplyName = String(orderRes.rows[0].supply_name || "").trim();
    const costValue = normalizeMoney(orderRes.rows[0].cost_value);

    let variantId = null;
    if (productName) {
      const pricingInfo = await fetchProductPricing(client, productName);
      variantId = pricingInfo?.variantId ?? null;
    }

    let supplierId = null;
    if (supplyName) {
    const supplyRes = await client.query(
        `SELECT ${SUPPLIER_COLS.id} AS id
         FROM ${SUPPLIER_TABLE}
         WHERE LOWER(${SUPPLIER_COLS.supplierName}) = LOWER($1)
         LIMIT 1`,
        [supplyName]
      );

      if (supplyRes.rows.length) {
        supplierId = supplyRes.rows[0].id;
      } else {
        const insertSupply = await client.query(
          `INSERT INTO ${SUPPLIER_TABLE} (${SUPPLIER_COLS.supplierName})
           VALUES ($1)
           RETURNING ${SUPPLIER_COLS.id} AS id`,
          [supplyName]
        );
        supplierId = insertSupply.rows[0].id;
      }
    }

    const resolvedProductId = variantId;
    let supplyPriceValue = costValue || referenceImport || 0;
    let supplyPriceScaled = false;
    let rawSupplyPrice = null;
    if (resolvedProductId && supplierId) {
      const priceRes = await client.query(
        `SELECT ${SUPPLIER_COST_COLS.price} AS price
         FROM ${SUPPLIER_COST_TABLE}
         WHERE ${SUPPLIER_COST_COLS.productId} = $1
           AND ${SUPPLIER_COST_COLS.supplierId} = $2
         ORDER BY ${SUPPLIER_COST_COLS.id} DESC
         LIMIT 1`,
        [resolvedProductId, supplierId]
      );

      if (priceRes.rows.length) {
        rawSupplyPrice = normalizeMoney(priceRes.rows[0].price);
        const normalized = normalizeImportValue(rawSupplyPrice, costValue, referenceImport);
        supplyPriceValue = normalized.value;
        supplyPriceScaled = normalized.scaled;
        if (supplyPriceScaled && rawSupplyPrice !== supplyPriceValue) {
          try {
            await client.query(
              `UPDATE ${SUPPLIER_COST_TABLE}
               SET ${SUPPLIER_COST_COLS.price} = $1
             WHERE ${SUPPLIER_COST_COLS.productId} = $2
               AND ${SUPPLIER_COST_COLS.supplierId} = $3`,
              [supplyPriceValue, resolvedProductId, supplierId]
            );
          } catch (adjustErr) {
            console.error(
              "Failed to normalize supplier_cost for productId=%s, sourceId=%s:",
              resolvedProductId,
              supplierId,
              adjustErr
            );
          }
        }
      } else {
        try {
          const insertPrice = supplyPriceValue || referenceImport || costValue;
          await client.query(
            `INSERT INTO ${SUPPLIER_COST_TABLE} (${SUPPLIER_COST_COLS.productId}, ${SUPPLIER_COST_COLS.supplierId}, ${SUPPLIER_COST_COLS.price})
             VALUES ($1, $2, $3)
             ON CONFLICT ON CONSTRAINT supplier_cost_pkey DO NOTHING`,
          [resolvedProductId, supplierId, insertPrice]
          );
        } catch (insertErr) {
          console.error(
            "Insert supplier_cost failed, productId=%s, sourceId=%s:",
            resolvedProductId,
            supplierId,
            insertErr
          );
        }
        supplyPriceValue = supplyPriceValue || referenceImport || costValue;
      }
    }

    if (manageTransaction) {
      await client.query("COMMIT");
    }
    return {
      productId: resolvedProductId,
      variantId,
      supplierId,
      price: supplyPriceValue,
      priceScaled: supplyPriceScaled,
    };
  } catch (err) {
    if (manageTransaction) {
      await client.query("ROLLBACK");
    }
    throw err;
  } finally {
    if (manageTransaction) {
      client.release();
    }
  }
};

const updatePaymentSupplyBalance = async (sourceId, priceValue, noteDate, options = {}) => {
  if (!(sourceId && Number.isFinite(priceValue) && priceValue > 0)) return;
  const externalClient = options.client || null;
  const client = externalClient || (await pool.connect());
  const manageTransaction = !externalClient;
  try {
    if (manageTransaction) {
      await client.query("BEGIN");
    }

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

    if (manageTransaction) {
      await client.query("COMMIT");
    }
  } catch (err) {
    if (manageTransaction) {
      await client.query("ROLLBACK");
    }
    throw err;
  } finally {
    if (manageTransaction) {
      client.release();
    }
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
