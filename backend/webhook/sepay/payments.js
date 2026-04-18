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
const { STATUS } = require("../../src/utils/statuses");
const {
  normalizeAmount,
  parsePaidDate,
  extractOrderCodeFromText,
  normalizeOrderCode,
  extractSenderFromContent,
  extractReferenceCodeFromText,
  safeIdent,
  normalizeMoney,
  normalizeImportValue,
  fetchProductPricing,
} = require("./utils");
const logger = require("../../src/utils/logger");
const {
  calculateOrderPricingFromResolvedValues,
} = require("../../src/services/pricing/core");
const { withSavepoint } = require("./savepoint");

let paymentReceiptOrderColCache = null;
let paymentReceiptColumnsCache = null;
const PAYMENT_RECEIPT_BASE_TABLE = PAYMENT_RECEIPT_TABLE.split(".").pop();
// Always prioritize receipt schema for webhook receipt flow.
// Do not fallback to orders.* because payment_receipt tables have been migrated.
const PAYMENT_RECEIPT_SCHEMA =
  process.env.DB_SCHEMA_RECEIPT || process.env.SCHEMA_RECEIPT || "receipt";
const PAYMENT_RECEIPT_TABLE_RESOLVED = `${PAYMENT_RECEIPT_SCHEMA}.${PAYMENT_RECEIPT_BASE_TABLE}`;
const PAYMENT_RECEIPT_FINANCIAL_STATE_TABLE = `${PAYMENT_RECEIPT_SCHEMA}.payment_receipt_financial_state`;
const PAYMENT_RECEIPT_FINANCIAL_AUDIT_TABLE = `${PAYMENT_RECEIPT_SCHEMA}.payment_receipt_financial_audit_log`;
const RECEIPT_STATE_COLS = {
  ID: "id",
  PAYMENT_RECEIPT_ID: "payment_receipt_id",
  IS_FINANCIAL_POSTED: "is_financial_posted",
  POSTED_REVENUE: "posted_revenue",
  POSTED_PROFIT: "posted_profit",
  RECONCILED_AT: "reconciled_at",
  ADJUSTMENT_APPLIED: "adjustment_applied",
  CREATED_AT: "created_at",
  UPDATED_AT: "updated_at",
};

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
    logger.debug("[Webhook] payment_receipt order column resolved", {
      column: paymentReceiptOrderColCache,
      candidates: preferred,
    });
  } catch (err) {
    logger.error("Failed to resolve payment_receipt column list", { error: err?.message, stack: err?.stack });
    paymentReceiptOrderColCache = "id_order";
  }
  return paymentReceiptOrderColCache;
};

const normalizeKeyText = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const normalizeOptionalText = (value) => {
  const text = String(value ?? "").trim();
  return text || "";
};

const normalizeSepayTransactionId = (value) => {
  if (value == null || value === "") return "";
  const numeric = Number.parseInt(String(value), 10);
  if (Number.isFinite(numeric) && numeric > 0) return String(numeric);
  return "";
};

const getPaymentReceiptColumns = async () => {
  if (paymentReceiptColumnsCache) return paymentReceiptColumnsCache;
  try {
    const res = await pool.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
      `,
      [PAYMENT_RECEIPT_SCHEMA, PAYMENT_RECEIPT_BASE_TABLE]
    );
    paymentReceiptColumnsCache = new Set(
      res.rows.map((r) => String(r.column_name || "").toLowerCase())
    );
  } catch (err) {
    logger.error("Failed to resolve payment_receipt columns", {
      error: err?.message,
      stack: err?.stack,
    });
    paymentReceiptColumnsCache = new Set();
  }
  return paymentReceiptColumnsCache;
};

const buildReceiptIdempotencyKey = ({
  sepayTransactionId,
  referenceCode,
  transferType,
  orderCode,
  paidDate,
  amount,
  receiverAccount,
  senderParsed,
  noteValue,
}) =>
  [
    normalizeKeyText(sepayTransactionId),
    normalizeKeyText(referenceCode),
    normalizeKeyText(transferType),
    normalizeKeyText(orderCode),
    normalizeKeyText(paidDate),
    String(Number(amount) || 0),
    normalizeKeyText(receiverAccount),
    normalizeKeyText(senderParsed),
    normalizeKeyText(noteValue),
  ].join("|");

const ensureReceiptFinancialState = async (client, receiptId) => {
  const normalizedId = Number(receiptId);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) return;
  await client.query(
    `
      INSERT INTO ${PAYMENT_RECEIPT_FINANCIAL_STATE_TABLE} (
        payment_receipt_id
      )
      VALUES ($1)
      ON CONFLICT (payment_receipt_id)
      DO UPDATE SET
        updated_at = NOW()
    `,
    [normalizedId]
  );
};

const getReceiptFinancialState = async (client, receiptId) => {
  const normalizedId = Number(receiptId);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) return null;
  await ensureReceiptFinancialState(client, normalizedId);
  const res = await client.query(
    `
      SELECT
        ${safeIdent(RECEIPT_STATE_COLS.ID)} AS id,
        ${safeIdent(RECEIPT_STATE_COLS.PAYMENT_RECEIPT_ID)} AS payment_receipt_id,
        ${safeIdent(RECEIPT_STATE_COLS.IS_FINANCIAL_POSTED)} AS is_financial_posted,
        COALESCE(${safeIdent(RECEIPT_STATE_COLS.POSTED_REVENUE)}::numeric, 0) AS posted_revenue,
        COALESCE(${safeIdent(RECEIPT_STATE_COLS.POSTED_PROFIT)}::numeric, 0) AS posted_profit,
        ${safeIdent(RECEIPT_STATE_COLS.RECONCILED_AT)} AS reconciled_at,
        ${safeIdent(RECEIPT_STATE_COLS.ADJUSTMENT_APPLIED)} AS adjustment_applied
      FROM ${PAYMENT_RECEIPT_FINANCIAL_STATE_TABLE}
      WHERE ${safeIdent(RECEIPT_STATE_COLS.PAYMENT_RECEIPT_ID)} = $1
      LIMIT 1
    `,
    [normalizedId]
  );
  return res.rows[0] || null;
};

const updateReceiptFinancialState = async (client, receiptId, patch = {}) => {
  const normalizedId = Number(receiptId);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) return null;
  await ensureReceiptFinancialState(client, normalizedId);

  const assignments = [];
  const values = [];
  const push = (column, value) => {
    assignments.push(`${safeIdent(column)} = $${values.length + 1}`);
    values.push(value);
  };

  if (Object.prototype.hasOwnProperty.call(patch, "is_financial_posted")) {
    push(RECEIPT_STATE_COLS.IS_FINANCIAL_POSTED, !!patch.is_financial_posted);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "posted_revenue")) {
    push(RECEIPT_STATE_COLS.POSTED_REVENUE, Number(patch.posted_revenue) || 0);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "posted_profit")) {
    push(RECEIPT_STATE_COLS.POSTED_PROFIT, Number(patch.posted_profit) || 0);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "reconciled_at")) {
    push(RECEIPT_STATE_COLS.RECONCILED_AT, patch.reconciled_at);
  }
  if (Object.prototype.hasOwnProperty.call(patch, "adjustment_applied")) {
    push(RECEIPT_STATE_COLS.ADJUSTMENT_APPLIED, !!patch.adjustment_applied);
  }

  push(RECEIPT_STATE_COLS.UPDATED_AT, new Date());
  values.push(normalizedId);

  const res = await client.query(
    `
      UPDATE ${PAYMENT_RECEIPT_FINANCIAL_STATE_TABLE}
      SET ${assignments.join(", ")}
      WHERE ${safeIdent(RECEIPT_STATE_COLS.PAYMENT_RECEIPT_ID)} = $${values.length}
      RETURNING
        ${safeIdent(RECEIPT_STATE_COLS.ID)} AS id,
        ${safeIdent(RECEIPT_STATE_COLS.PAYMENT_RECEIPT_ID)} AS payment_receipt_id,
        ${safeIdent(RECEIPT_STATE_COLS.IS_FINANCIAL_POSTED)} AS is_financial_posted,
        COALESCE(${safeIdent(RECEIPT_STATE_COLS.POSTED_REVENUE)}::numeric, 0) AS posted_revenue,
        COALESCE(${safeIdent(RECEIPT_STATE_COLS.POSTED_PROFIT)}::numeric, 0) AS posted_profit,
        ${safeIdent(RECEIPT_STATE_COLS.RECONCILED_AT)} AS reconciled_at,
        ${safeIdent(RECEIPT_STATE_COLS.ADJUSTMENT_APPLIED)} AS adjustment_applied
    `,
    values
  );
  return res.rows[0] || null;
};

/**
 * Ghi audit mỗi lần ghi số / nhánh rule (webhook hoặc reconcile).
 * @param {import('pg').PoolClient} client
 */
const insertFinancialAuditLog = async (
  client,
  { payment_receipt_id: paymentReceiptId, order_code: orderCode = "", rule_branch: ruleBranch, delta = {}, source = "webhook" }
) => {
  const id = Number(paymentReceiptId);
  if (!Number.isFinite(id) || id <= 0) return;
  const branch = String(ruleBranch || "").trim();
  if (!branch) return;
  const payload =
    delta && typeof delta === "object" && !Array.isArray(delta)
      ? JSON.stringify(delta)
      : JSON.stringify({ value: delta });
  await client.query(
    `
      INSERT INTO ${PAYMENT_RECEIPT_FINANCIAL_AUDIT_TABLE} (
        payment_receipt_id,
        order_code,
        rule_branch,
        delta,
        source
      )
      VALUES ($1, $2, $3, $4::jsonb, $5)
    `,
    [id, String(orderCode ?? "").trim(), branch, payload, String(source || "webhook")]
  );
};

const insertPaymentReceipt = async (transaction, options = {}) => {
  if (!transaction) return { inserted: false, skipped: true, reason: "missing_transaction" };

  const orderCode =
    normalizeOrderCode(
      options.orderCode !== undefined ? String(options.orderCode || "") : ""
    ) ||
    normalizeOrderCode(
      extractOrderCodeFromText(
      transaction.transaction_content,
      transaction.note,
      transaction.description
    )
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
  const sepayTransactionId = normalizeSepayTransactionId(
    transaction.transaction_id || transaction.id
  );
  const referenceCode = normalizeOptionalText(
    transaction.reference_code || transaction.referenceCode || transaction.reference_number
  ) || normalizeOptionalText(
    extractReferenceCodeFromText(
      transaction.transaction_content || transaction.note || transaction.description
    )
  );
  const transferType = normalizeOptionalText(
    transaction.transfer_type || transaction.transferType
  );
  const gateway = normalizeOptionalText(transaction.gateway);
  const noteValue = transaction.note || transaction.description || "";

  const orderCodeColumn =
    (await getPaymentReceiptOrderColumn()) ||
    PAYMENT_RECEIPT_COLS.orderCode ||
    "id_order";
  const paymentReceiptColumns = await getPaymentReceiptColumns();
  const hasReceiptColumn = (name) =>
    paymentReceiptColumns.has(String(name || "").toLowerCase());

  const externalClient = options.client || null;
  const client = externalClient || (await pool.connect());
  const manageTransaction = !externalClient;

  const receiptKey = buildReceiptIdempotencyKey({
    sepayTransactionId,
    referenceCode,
    transferType,
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

    if (sepayTransactionId && hasReceiptColumn(PAYMENT_RECEIPT_COLS.sepayTransactionId)) {
      const byTxnIdRes = await client.query(
        `
          SELECT ${safeIdent(PAYMENT_RECEIPT_COLS.id)} AS id
          FROM ${PAYMENT_RECEIPT_TABLE_RESOLVED}
          WHERE ${safeIdent(PAYMENT_RECEIPT_COLS.sepayTransactionId)}::text = $1
          LIMIT 1
        `,
        [sepayTransactionId]
      );
      if (byTxnIdRes.rows.length) {
        await ensureReceiptFinancialState(client, byTxnIdRes.rows[0]?.id);
        if (manageTransaction) {
          await client.query("COMMIT");
        }
        return {
          inserted: false,
          duplicate: true,
          existingId: byTxnIdRes.rows[0]?.id ?? null,
          receiptKey,
          orderCode,
          paidDate,
          amount,
        };
      }
    }

    if (
      referenceCode &&
      transferType &&
      hasReceiptColumn(PAYMENT_RECEIPT_COLS.referenceCode) &&
      hasReceiptColumn(PAYMENT_RECEIPT_COLS.transferType)
    ) {
      const byReferenceRes = await client.query(
        `
          SELECT ${safeIdent(PAYMENT_RECEIPT_COLS.id)} AS id
          FROM ${PAYMENT_RECEIPT_TABLE_RESOLVED}
          WHERE LOWER(COALESCE(${safeIdent(PAYMENT_RECEIPT_COLS.referenceCode)}::text, '')) = LOWER($1)
            AND LOWER(COALESCE(${safeIdent(PAYMENT_RECEIPT_COLS.transferType)}::text, '')) = LOWER($2)
            AND ${safeIdent(PAYMENT_RECEIPT_COLS.amount)} = $3
            AND ${safeIdent(PAYMENT_RECEIPT_COLS.paidDate)} = $4::date
          LIMIT 1
        `,
        [referenceCode, transferType, amount, paidDate]
      );
      if (byReferenceRes.rows.length) {
        await ensureReceiptFinancialState(client, byReferenceRes.rows[0]?.id);
        if (manageTransaction) {
          await client.query("COMMIT");
        }
        return {
          inserted: false,
          duplicate: true,
          existingId: byReferenceRes.rows[0]?.id ?? null,
          receiptKey,
          orderCode,
          paidDate,
          amount,
        };
      }
    }

    const existsSql = `
      SELECT ${safeIdent(PAYMENT_RECEIPT_COLS.id)} AS id
      FROM ${PAYMENT_RECEIPT_TABLE_RESOLVED}
      WHERE ${safeIdent(PAYMENT_RECEIPT_COLS.paidDate)} = $1::date
        AND ${safeIdent(PAYMENT_RECEIPT_COLS.amount)} = $2
        AND COALESCE(${safeIdent(PAYMENT_RECEIPT_COLS.receiver)}::text, '') = $3
        AND COALESCE(${safeIdent(PAYMENT_RECEIPT_COLS.sender)}::text, '') = $4
        AND COALESCE(${safeIdent(PAYMENT_RECEIPT_COLS.note)}::text, '') = $5
        AND (
          LOWER(COALESCE(${safeIdent(orderCodeColumn)}::text, '')) = LOWER($6)
          OR COALESCE(${safeIdent(orderCodeColumn)}::text, '') = ''
          OR $6 = ''
        )
      LIMIT 1
    `;

    const existsRes = await client.query(existsSql, [
      paidDate,
      amount,
      receiverAccount,
      senderParsed || "",
      noteValue,
      orderCode,
    ]);

    if (existsRes.rows.length) {
      await ensureReceiptFinancialState(client, existsRes.rows[0]?.id);
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

    const insertColumns = [
      safeIdent(orderCodeColumn),
      safeIdent(PAYMENT_RECEIPT_COLS.paidDate),
      safeIdent(PAYMENT_RECEIPT_COLS.amount),
      safeIdent(PAYMENT_RECEIPT_COLS.receiver),
      safeIdent(PAYMENT_RECEIPT_COLS.sender),
      safeIdent(PAYMENT_RECEIPT_COLS.note),
    ];
    const insertValues = [
      orderCode,
      paidDate,
      amount,
      receiverAccount,
      senderParsed || "",
      noteValue,
    ];

    const pushOptionalColumn = (columnName, value) => {
      if (!hasReceiptColumn(columnName)) return;
      insertColumns.push(safeIdent(columnName));
      insertValues.push(value || null);
    };

    pushOptionalColumn(PAYMENT_RECEIPT_COLS.sepayTransactionId, sepayTransactionId);
    pushOptionalColumn(PAYMENT_RECEIPT_COLS.referenceCode, referenceCode);
    pushOptionalColumn(PAYMENT_RECEIPT_COLS.transferType, transferType);
    pushOptionalColumn(PAYMENT_RECEIPT_COLS.gateway, gateway);

    const sql = `
      INSERT INTO ${PAYMENT_RECEIPT_TABLE_RESOLVED} (
        ${insertColumns.join(", ")}
      )
      VALUES (
        ${insertValues
          .map((_, idx) => (idx === 1 ? `$${idx + 1}::date` : `$${idx + 1}`))
          .join(", ")}
      )
      RETURNING ${safeIdent(PAYMENT_RECEIPT_COLS.id)} AS id
    `;
    logger.debug("[Webhook] payment_receipt SQL", {
      sql: sql.trim(),
      params: insertValues,
    });

    const insertRes = await client.query(sql, insertValues);
    const insertedId = insertRes.rows[0]?.id ?? null;
    await ensureReceiptFinancialState(client, insertedId);

    if (manageTransaction) {
      await client.query("COMMIT");
    }

    return {
      inserted: true,
      id: insertedId,
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
        ${ORDER_COLS.idSupply} AS id_supply,
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
    const idSupplyRaw = orderRes.rows[0].id_supply;
    const supplierId = idSupplyRaw != null && Number.isFinite(Number(idSupplyRaw))
      ? Number(idSupplyRaw) || null
      : null;
    const costValue = normalizeMoney(orderRes.rows[0].cost_value);

    let variantId = null;
    if (productName) {
      const pricingInfo = await fetchProductPricing(client, productName);
      variantId = pricingInfo?.variantId ?? null;
    }

    const resolvedProductId = variantId;
    let supplyPriceValue = costValue || referenceImport || 0;
    let supplyPriceScaled = false;
    let rawSupplyPrice = null;
    if (resolvedProductId && supplierId) {
      const priceRes = await client.query(
        `SELECT ${SUPPLIER_COST_COLS.price} AS price
         FROM ${SUPPLIER_COST_TABLE}
         WHERE ${SUPPLIER_COST_COLS.variantId} = $1
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
            await withSavepoint(client, "sup_cost_norm", async () => {
              await client.query(
                `UPDATE ${SUPPLIER_COST_TABLE}
               SET ${SUPPLIER_COST_COLS.price} = $1
             WHERE ${SUPPLIER_COST_COLS.variantId} = $2
               AND ${SUPPLIER_COST_COLS.supplierId} = $3`,
                [supplyPriceValue, resolvedProductId, supplierId]
              );
            });
          } catch (adjustErr) {
            logger.error("Failed to normalize supplier_cost", {
              productId: resolvedProductId,
              sourceId: supplierId,
              error: adjustErr?.message,
              stack: adjustErr?.stack,
            });
          }
        }
      } else {
        try {
          const insertPrice = supplyPriceValue || referenceImport || costValue;
          await withSavepoint(client, "sup_cost_ins", async () => {
            await client.query(
              `INSERT INTO ${SUPPLIER_COST_TABLE} (${SUPPLIER_COST_COLS.variantId}, ${SUPPLIER_COST_COLS.supplierId}, ${SUPPLIER_COST_COLS.price})
             VALUES ($1, $2, $3)
             ON CONFLICT ON CONSTRAINT supplier_cost_pkey DO NOTHING`,
              [resolvedProductId, supplierId, insertPrice]
            );
          });
        } catch (insertErr) {
          logger.error("Insert supplier_cost failed", {
            productId: resolvedProductId,
            sourceId: supplierId,
            error: insertErr?.message,
            stack: insertErr?.stack,
          });
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

    const formatNote = () => {
      const dt = noteDate instanceof Date ? noteDate : new Date();
      const day = String(dt.getDate()).padStart(2, "0");
      const month = String(dt.getMonth() + 1).padStart(2, "0");
      const year = dt.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const period = formatNote();
    await client.query(
      `INSERT INTO ${PAYMENT_SUPPLY_TABLE} (
          ${safeIdent(PAYMENT_SUPPLY_COLS.sourceId)},
          ${safeIdent(PAYMENT_SUPPLY_COLS.paid)},
          ${safeIdent(PAYMENT_SUPPLY_COLS.round)},
          ${safeIdent(PAYMENT_SUPPLY_COLS.status)}
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (${safeIdent(PAYMENT_SUPPLY_COLS.sourceId)})
        DO UPDATE SET
          ${safeIdent(PAYMENT_SUPPLY_COLS.paid)} =
            COALESCE(${PAYMENT_SUPPLY_TABLE}.${safeIdent(PAYMENT_SUPPLY_COLS.paid)}::numeric, 0)
            + EXCLUDED.${safeIdent(PAYMENT_SUPPLY_COLS.paid)},
          ${safeIdent(PAYMENT_SUPPLY_COLS.round)} = EXCLUDED.${safeIdent(PAYMENT_SUPPLY_COLS.round)},
          ${safeIdent(PAYMENT_SUPPLY_COLS.status)} = COALESCE(
            NULLIF(TRIM(${PAYMENT_SUPPLY_TABLE}.${safeIdent(PAYMENT_SUPPLY_COLS.status)}::text), ''),
            EXCLUDED.${safeIdent(PAYMENT_SUPPLY_COLS.status)}
          )`,
      [sourceId, priceValue, period, STATUS.UNPAID]
    );

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

const calculateSalePrice = ({
  orderCode,
  giaNhap,
  giaBanCu,
  priceMax,
  pctCtv,
  pctKhach,
  pctPromo,
  pctStu = null,
  forceKhachLe = false,
}) =>
  calculateOrderPricingFromResolvedValues({
    orderId: orderCode,
    pricingBase: priceMax,
    importPrice: giaNhap,
    fallbackPrice: giaBanCu,
    fallbackCost: giaNhap,
    pctCtv,
    pctKhach,
    pctPromo,
    pctStu,
    forceKhachLe,
    roundCostToThousands: false,
  }).price;

module.exports = {
  insertPaymentReceipt,
  getReceiptFinancialState,
  updateReceiptFinancialState,
  ensureReceiptFinancialState,
  insertFinancialAuditLog,
  ensureSupplyAndPriceFromOrder,
  updatePaymentSupplyBalance,
  calculateSalePrice,
};
