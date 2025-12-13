const express = require("express");
const { DB_SCHEMA, getDefinition, tableName, SCHEMA } = require("../config/dbSchema");
const { QUOTED_COLS } = require("../utils/columns");
const {
  normalizeSupplyStatus,
  normalizeTextInput,
  toNullableNumber,
  formatDateOutput,
} = require("../utils/normalizers");
const {
  createDateNormalization,
  createSourceKey,
  createNumericExtraction,
  createVietnameseStatusKey,
  quoteIdent,
} = require("../utils/sql");
const { db } = require("../db");

const ORDER_DEF = getDefinition("ORDER_LIST");
const ORDER_EXPIRED_DEF = getDefinition("ORDER_EXPIRED");
const ORDER_CANCELED_DEF = getDefinition("ORDER_CANCELED");
const SUPPLY_DEF = getDefinition("SUPPLY");
const PAYMENT_SUPPLY_DEF = getDefinition("PAYMENT_SUPPLY");
const BANK_LIST_DEF = getDefinition("BANK_LIST");
const PRODUCT_PRICE_DEF = getDefinition("PRODUCT_PRICE");
const SUPPLY_PRICE_DEF = getDefinition("SUPPLY_PRICE");
const orderCols = ORDER_DEF.columns;
const orderExpiredCols = ORDER_EXPIRED_DEF.columns;
const orderCanceledCols = ORDER_CANCELED_DEF.columns;
const supplyCols = SUPPLY_DEF.columns;
const paymentSupplyCols = PAYMENT_SUPPLY_DEF.columns;
const bankListCols = BANK_LIST_DEF.columns;
const productPriceCols = PRODUCT_PRICE_DEF.columns;
const supplyPriceCols = SUPPLY_PRICE_DEF.columns;

const TABLES = {
  orderList: tableName(DB_SCHEMA.ORDER_LIST.TABLE),
  orderExpired: tableName(DB_SCHEMA.ORDER_EXPIRED.TABLE),
  orderCanceled: tableName(DB_SCHEMA.ORDER_CANCELED.TABLE),
  supply: tableName(DB_SCHEMA.SUPPLY.TABLE),
  supplyPrice: tableName(DB_SCHEMA.SUPPLY_PRICE.TABLE),
  productPrice: tableName(DB_SCHEMA.PRODUCT_PRICE.TABLE),
  paymentSupply: tableName(DB_SCHEMA.PAYMENT_SUPPLY.TABLE),
  bankList: tableName(DB_SCHEMA.BANK_LIST.TABLE),
};

const router = express.Router();

// ---------- Helpers ----------
let supplyStatusColumnNameCache = null;
let supplyStatusColumnResolved = false;
const SUPPLY_STATUS_CANDIDATES = ["status", "trang_thai", "is_active"];

const resolveSupplyStatusColumn = async () => {
  if (supplyStatusColumnResolved) {
    return supplyStatusColumnNameCache;
  }
  try {
    const schemaName = process.env.DB_SCHEMA || SCHEMA || "mavryk";
    const result = await db("information_schema.columns")
      .select("column_name")
      .where({
        table_schema: schemaName,
        table_name: "supply",
      })
      .whereIn("column_name", SUPPLY_STATUS_CANDIDATES)
      .orderByRaw(`
        CASE column_name
          WHEN 'status' THEN 1
          WHEN 'trang_thai' THEN 2
          WHEN 'is_active' THEN 3
          ELSE 4 END
      `)
      .limit(1);
    supplyStatusColumnNameCache =
      result?.[0]?.column_name ? result[0].column_name : null;
  } catch (error) {
    console.warn("Khong tim duoc cot trang thai nha cung cap:", error.message || error);
    supplyStatusColumnNameCache = null;
  } finally {
    supplyStatusColumnResolved = true;
  }
  return supplyStatusColumnNameCache;
};

const getSupplyInsights = async (_req, res) => {
  console.log("[GET] /api/supply-insights");
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    .toISOString()
    .slice(0, 10);

  try {
    const orderListCols = {
      orderDateCol: orderCols.orderDate,
      sourceCol: orderCols.supply,
      costCol: orderCols.cost,
    };
    const orderExpiredCols = orderListCols;
    const orderCanceledCols = {
      orderDateCol: "createdate",
      sourceCol: orderCols.supply,
      costCol: orderCols.cost,
    };
    const statusColumnName = await resolveSupplyStatusColumn();
    const paymentStatusKey = createVietnameseStatusKey("ps.status");
    const statusSelect = statusColumnName
      ? `s."${statusColumnName}"::text AS raw_status`
      : "NULL AS raw_status";

    const makeOrderSelect = (table, cols) => {
      const orderDateExpr = createDateNormalization(quoteIdent(cols.orderDateCol));
      const sourceKeyExpr = createSourceKey(quoteIdent(cols.sourceCol));
      const importExpr = createNumericExtraction(quoteIdent(cols.costCol));
      const sourceIdent = quoteIdent(cols.sourceCol);
      return `
      SELECT
        ${orderDateExpr} AS order_date,
        COALESCE(${sourceKeyExpr}, '') AS source_key,
        TRIM(${sourceIdent}::text) AS source_name,
        ${importExpr} AS import_value
      FROM ${table}
      WHERE TRIM(${sourceIdent}::text) <> ''
    `;
    };

    const ordersUnion = `
    WITH orders_union AS (
${makeOrderSelect(TABLES.orderList, orderListCols)}
      UNION ALL
${makeOrderSelect(TABLES.orderExpired, orderExpiredCols)}
      UNION ALL
${makeOrderSelect(TABLES.orderCanceled, orderCanceledCols)}
    ),
    orders_filtered AS (
      SELECT *
      FROM orders_union
      WHERE order_date IS NOT NULL
        AND source_key <> ''
    ),
    month_data AS (
      SELECT
        source_key,
        COUNT(*) AS monthly_orders,
        COALESCE(SUM(import_value), 0) AS monthly_import_value
      FROM orders_filtered
      WHERE order_date >= ?::date
        AND order_date < ?::date
      GROUP BY source_key
    ),
    last_order AS (
      SELECT
        source_key,
        MAX(order_date) AS last_order_date
      FROM orders_filtered
      GROUP BY source_key
    ),
    total_data AS (
      SELECT
        source_key,
        COUNT(*) AS total_orders
      FROM orders_filtered
      GROUP BY source_key
    ),
    product_data AS (
      SELECT
        sp.${quoteIdent(supplyPriceCols.sourceId)} AS source_id,
        ARRAY_REMOVE(
          ARRAY_AGG(
            DISTINCT NULLIF(
              TRIM(pp.${quoteIdent(productPriceCols.product)}::text),
              ''
            )
          ),
          NULL
        ) AS product_list
      FROM ${TABLES.supplyPrice} sp
      JOIN ${TABLES.productPrice} pp
        ON sp.${quoteIdent(supplyPriceCols.productId)} = pp.${quoteIdent(productPriceCols.id)}
      GROUP BY sp.${quoteIdent(supplyPriceCols.sourceId)}
    ),
    payment_summary AS (
      SELECT
        ps.${QUOTED_COLS.paymentSupply.sourceId},
        SUM(COALESCE(ps.${QUOTED_COLS.paymentSupply.paid}, 0)) AS total_paid_import,
        SUM(
          CASE
            WHEN ${paymentStatusKey} = 'chua thanh toan'
              THEN GREATEST(
                COALESCE(ps.${QUOTED_COLS.paymentSupply.importValue}, 0) - COALESCE(ps.${QUOTED_COLS.paymentSupply.paid}, 0),
                0
              )
            ELSE 0
          END
        ) AS total_unpaid_import
      FROM ${TABLES.paymentSupply} ps
      GROUP BY ps.${QUOTED_COLS.paymentSupply.sourceId}
    )
    SELECT
      s.${QUOTED_COLS.supply.id} AS id,
      s.${QUOTED_COLS.supply.sourceName} AS source_name,
      s.${QUOTED_COLS.supply.numberBank} AS number_bank,
      s.${QUOTED_COLS.supply.binBank} AS bin_bank,
      ${statusSelect},
      COALESCE(bl.${QUOTED_COLS.bankList.bankName}, '') AS bank_name,
      COALESCE(product_data.product_list, ARRAY[]::text[]) AS product_names,
      COALESCE(month_data.monthly_orders, 0) AS monthly_orders,
      COALESCE(month_data.monthly_import_value, 0) AS monthly_import_value,
      COALESCE(last_order.last_order_date, NULL) AS last_order_date,
      COALESCE(total_data.total_orders, 0) AS total_orders,
      COALESCE(payment_summary.total_paid_import, 0) AS total_paid_import,
      COALESCE(payment_summary.total_unpaid_import, 0) AS total_unpaid_import
    FROM ${TABLES.supply} s
    LEFT JOIN product_data ON product_data.source_id = s.${QUOTED_COLS.supply.id}
    LEFT JOIN month_data
      ON month_data.source_key = ${createSourceKey(`s.${QUOTED_COLS.supply.sourceName}`)}
    LEFT JOIN last_order
      ON last_order.source_key = ${createSourceKey(`s.${QUOTED_COLS.supply.sourceName}`)}
    LEFT JOIN total_data
      ON total_data.source_key = ${createSourceKey(`s.${QUOTED_COLS.supply.sourceName}`)}
    LEFT JOIN payment_summary
      ON payment_summary.source_id = s.${QUOTED_COLS.supply.id}
    LEFT JOIN ${TABLES.bankList} bl
      ON TRIM(bl.${QUOTED_COLS.bankList.bin}::text) = TRIM(s.${QUOTED_COLS.supply.binBank}::text)
    ORDER BY s.${QUOTED_COLS.supply.sourceName};
  `;

    const result = await db.raw(ordersUnion, [monthStart, nextMonthStart]);
    const rows = result.rows || [];
    const supplies = rows.map((row) => {
      const normalizedStatus = normalizeSupplyStatus(row.raw_status);
      const isActive = normalizedStatus !== "inactive";
      const totalUnpaidRaw = Number(row.total_unpaid_import) || 0;
      const totalUnpaidImport = totalUnpaidRaw < 0 ? 0 : totalUnpaidRaw;
      return {
        id: row.id,
        sourceName: row.source_name || "",
        numberBank: row.number_bank || null,
        binBank: row.bin_bank || null,
        bankName: row.bank_name || null,
        status: normalizedStatus || "inactive",
        rawStatus: row.raw_status || null,
        isActive,
        products: Array.isArray(row.product_names) ? row.product_names : [],
        monthlyOrders: Number(row.monthly_orders) || 0,
        monthlyImportValue: Number(row.monthly_import_value) || 0,
        lastOrderDate: formatDateOutput(row.last_order_date),
        totalOrders: Number(row.total_orders) || 0,
        totalPaidImport: Number(row.total_paid_import) || 0,
        totalUnpaidImport,
      };
    });
    const stats = supplies.reduce(
      (acc, supply) => {
        acc.totalSuppliers += 1;
        if (supply.isActive) {
          acc.activeSuppliers += 1;
        }
        acc.monthlyOrders += supply.monthlyOrders;
        acc.totalImportValue += supply.monthlyImportValue;
        return acc;
      },
      {
        totalSuppliers: 0,
        activeSuppliers: 0,
        monthlyOrders: 0,
        totalImportValue: 0,
      }
    );
    res.json({ stats, supplies });
  } catch (error) {
    console.error("Query failed (GET /api/supply-insights):", error);
    res.status(500).json({
      error: "Unable to load supply insights.",
    });
  }
};

router.get("/insights", getSupplyInsights);

// ---------- Routes ----------

router.get("/", async (_req, res) => {
  try {
    const result = await db.raw(
      `
      SELECT
        ${QUOTED_COLS.supply.id} AS id,
        ${QUOTED_COLS.supply.sourceName} AS source_name,
        ${QUOTED_COLS.supply.numberBank} AS number_bank,
        ${QUOTED_COLS.supply.binBank} AS bin_bank
      FROM ${TABLES.supply}
      ORDER BY ${QUOTED_COLS.supply.sourceName};
      `
    );
    res.json(result.rows || []);
  } catch (error) {
    console.error("Query failed (GET /api/supplies):", error);
    res.status(500).json({ error: "Unable to load suppliers." });
  }
});

router.get("/:supplyId/products", async (req, res) => {
  const { supplyId } = req.params;
  console.log(`[GET] /api/supplies/${supplyId}/products`);

  const q = `
    SELECT DISTINCT
      pp.${quoteIdent(productPriceCols.id)} AS id,
      pp.${quoteIdent(productPriceCols.product)} AS san_pham
    FROM ${TABLES.supplyPrice} sp
    JOIN ${TABLES.productPrice} pp
      ON sp.${quoteIdent(supplyPriceCols.productId)} = pp.${quoteIdent(productPriceCols.id)}
    WHERE sp.${quoteIdent(supplyPriceCols.sourceId)} = ?
    ORDER BY pp.${quoteIdent(productPriceCols.product)};
  `;

  try {
    const result = await db.raw(q, [supplyId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Query failed (GET /api/supplies/:id/products):", error);
    res.status(500).json({
      error: "Unable to load products for this supplier.",
    });
  }
});

router.get("/:supplyId/payments", async (req, res) => {
  const { supplyId } = req.params;
  console.log(`[GET] /api/supplies/${supplyId}/payments`, req.query);

  const parsedSupplyId = Number.parseInt(supplyId, 10);
  if (!Number.isInteger(parsedSupplyId) || parsedSupplyId <= 0) {
    return res.status(400).json({
      error: "Invalid supply id.",
    });
  }

  const limitParam = Number.parseInt(req.query.limit, 10);
  const offsetParam = Number.parseInt(req.query.offset, 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 50)
    : 5;
  const offset = Number.isFinite(offsetParam) && offsetParam > 0 ? offsetParam : 0;
  const limitPlusOne = limit + 1;
  const q = `
    SELECT
      ps.${QUOTED_COLS.paymentSupply.id} AS id,
      ps.${QUOTED_COLS.paymentSupply.sourceId} AS source_id,
      COALESCE(s.${QUOTED_COLS.supply.sourceName}, '') AS source_name,
      COALESCE(ps.${QUOTED_COLS.paymentSupply.importValue}, 0) AS import_value,
      COALESCE(ps.${QUOTED_COLS.paymentSupply.paid}, 0) AS paid_value,
      COALESCE(ps.${QUOTED_COLS.paymentSupply.round}, '') AS round_label,
      COALESCE(ps.${QUOTED_COLS.paymentSupply.status}, '') AS status_label
    FROM ${TABLES.paymentSupply} ps
    LEFT JOIN ${TABLES.supply} s ON s.${QUOTED_COLS.supply.id} = ps.${QUOTED_COLS.paymentSupply.sourceId}
    WHERE ps.${QUOTED_COLS.paymentSupply.sourceId} = ?
    ORDER BY ps.${QUOTED_COLS.paymentSupply.id} DESC
    OFFSET ?
    LIMIT ?;
  `;

  try {
    const result = await db.raw(q, [parsedSupplyId, offset, limitPlusOne]);
    const rows = result.rows || [];
    const hasMore = rows.length > limit;
    const payments = rows.slice(0, limit).map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      sourceName: row.source_name,
      totalImport: Number(row.import_value) || 0,
      paid: Number(row.paid_value) || 0,
      round: row.round_label || "",
      status: row.status_label || "",
    }));

    res.json({
      payments,
      hasMore,
      nextOffset: offset + payments.length,
    });
  } catch (error) {
    console.error("Query failed (GET /api/supplies/:id/payments):", error);
    res.status(500).json({
      error: "Unable to load payment history for this supplier.",
    });
  }
});

router.post("/:supplyId/payments", async (req, res) => {
  const { supplyId } = req.params;
  console.log(`[POST] /api/supplies/${supplyId}/payments`, req.body);

  const parsedSupplyId = Number.parseInt(supplyId, 10);
  if (!Number.isInteger(parsedSupplyId) || parsedSupplyId <= 0) {
    return res.status(400).json({
      error: "Invalid supply id.",
    });
  }

  const parseMoney = (value, fallback = 0) => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return value;
    }
    const cleaned = String(value).replace(/[^0-9]/g, "");
    if (!cleaned) return fallback;
    const num = Number(cleaned);
    return Number.isFinite(num) && num >= 0 ? num : fallback;
  };

  const roundLabel =
    (typeof req.body?.round === "string" && req.body.round.trim()) || "Chu ky moi";
  const totalImport = parseMoney(req.body?.totalImport, 0);
  const paid = parseMoney(req.body?.paid, 0);
  const statusLabel =
    (typeof req.body?.status === "string" && req.body.status.trim()) ||
    "Chua Thanh Toan";

  try {
    const insertQuery = `
      INSERT INTO ${TABLES.paymentSupply} (${QUOTED_COLS.paymentSupply.sourceId}, ${QUOTED_COLS.paymentSupply.importValue}, ${QUOTED_COLS.paymentSupply.paid}, ${QUOTED_COLS.paymentSupply.round}, ${QUOTED_COLS.paymentSupply.status})
      VALUES (?, ?, ?, ?, ?)
      RETURNING ${QUOTED_COLS.paymentSupply.id} AS id, ${QUOTED_COLS.paymentSupply.sourceId} AS source_id, ${QUOTED_COLS.paymentSupply.importValue} AS import, ${QUOTED_COLS.paymentSupply.paid} AS paid, ${QUOTED_COLS.paymentSupply.round} AS round, ${QUOTED_COLS.paymentSupply.status} AS status;
    `;
    const result = await db.raw(insertQuery, [
      parsedSupplyId,
      totalImport,
      paid,
      roundLabel,
      statusLabel,
    ]);
    if (!result.rows?.length) {
      return res.status(500).json({
        error: "Failed to insert payment cycle.",
      });
    }
    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      sourceId: row.source_id,
      totalImport: Number(row.import) || 0,
      paid: Number(row.paid) || 0,
      round: row.round || "",
      status: row.status || "",
    });
  } catch (error) {
    console.error(
      `Mutation failed (POST /api/supplies/${supplyId}/payments):`,
      error
    );
    res.status(500).json({
      error: "Unable to create payment cycle.",
    });
  }
});

router.patch("/:supplyId/payments/:paymentId", async (req, res) => {
  const { supplyId, paymentId } = req.params;
  console.log(
    `[PATCH] /api/supplies/${supplyId}/payments/${paymentId}`,
    req.body
  );

  const parsedSupplyId = Number.parseInt(supplyId, 10);
  const parsedPaymentId = Number.parseInt(paymentId, 10);
  if (
    !Number.isInteger(parsedSupplyId) ||
    parsedSupplyId <= 0 ||
    !Number.isInteger(parsedPaymentId) ||
    parsedPaymentId <= 0
  ) {
    return res.status(400).json({
      error: "Invalid supply or payment id.",
    });
  }

  const parseMoney = (value, fallback = null) => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return value;
    }
    const cleaned = String(value).replace(/[^0-9]/g, "");
    if (!cleaned) return fallback;
    const num = Number(cleaned);
    return Number.isFinite(num) && num >= 0 ? num : fallback;
  };

  const nextTotalImport = parseMoney(req.body?.totalImport, null);
  if (nextTotalImport === null) {
    return res.status(400).json({
      error: "Invalid total import value.",
    });
  }

  try {
    const updateQuery = `
      UPDATE ${TABLES.paymentSupply}
      SET ${QUOTED_COLS.paymentSupply.importValue} = ?
      WHERE ${QUOTED_COLS.paymentSupply.id} = ?
        AND ${QUOTED_COLS.paymentSupply.sourceId} = ?
      RETURNING
        ${QUOTED_COLS.paymentSupply.id} AS id,
        ${QUOTED_COLS.paymentSupply.sourceId} AS source_id,
        COALESCE(${QUOTED_COLS.paymentSupply.importValue}, 0) AS import_value,
        COALESCE(${QUOTED_COLS.paymentSupply.paid}, 0) AS paid_value,
        COALESCE(${QUOTED_COLS.paymentSupply.round}, '') AS round_label,
        COALESCE(${QUOTED_COLS.paymentSupply.status}, '') AS status_label;
    `;

    const result = await db.raw(updateQuery, [
      nextTotalImport,
      parsedPaymentId,
      parsedSupplyId,
    ]);

    if (!result.rows?.length) {
      return res.status(404).json({
        error: "Payment cycle not found for this supplier.",
      });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      sourceId: row.source_id,
      totalImport: Number(row.import_value) || 0,
      paid: Number(row.paid_value) || 0,
      round: row.round_label || "",
      status: row.status_label || "",
    });
  } catch (error) {
    console.error(
      `Mutation failed (PATCH /api/supplies/${supplyId}/payments/${paymentId}):`,
      error
    );
    res.status(500).json({
      error: "Unable to update payment cycle.",
    });
  }
});

router.post("/", async (req, res) => {
  console.log("[POST] /api/supplies", req.body);
  const { source_name, number_bank, bin_bank, status, active_supply } =
    req.body || {};
  if (!source_name) {
    return res.status(400).json({ error: "source_name is required" });
  }

  const statusColumn = await resolveSupplyStatusColumn();
  const fields = [
    QUOTED_COLS.supply.sourceName,
    QUOTED_COLS.supply.numberBank,
    QUOTED_COLS.supply.binBank,
  ];
  const values = [source_name, number_bank ?? null, bin_bank ?? null];

  if (statusColumn) {
    fields.push(`"${statusColumn}"`);
    values.push(status ?? active_supply ?? "active");
  } else {
    fields.push(QUOTED_COLS.supply.activeSupply);
    values.push(active_supply !== undefined ? !!active_supply : true);
  }

  const placeholders = values.map(() => "?");

  try {
    const result = await db.raw(
      `
      INSERT INTO ${TABLES.supply} (${fields.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING ${QUOTED_COLS.supply.id} AS id;
    `,
      values
    );
    const newId = result.rows?.[0]?.id;
    res.status(201).json({
      id: newId,
      source_name,
      number_bank: number_bank ?? null,
      bin_bank: bin_bank ?? null,
      status: status ?? active_supply ?? "active",
    });
  } catch (error) {
    console.error("Mutation failed (POST /api/supplies):", error);
    res.status(500).json({ error: "Unable to create supplier." });
  }
});

router.patch("/:supplyId", async (req, res) => {
  console.log("[PATCH] /api/supplies/:supplyId", req.params, req.body);
  const { supplyId } = req.params;
  const parsedSupplyId = Number.parseInt(supplyId, 10);
  if (!Number.isInteger(parsedSupplyId) || parsedSupplyId <= 0) {
    return res.status(400).json({ error: "Invalid supply id" });
  }

  const {
    source_name,
    number_bank,
    bin_bank,
    status,
    active_supply,
    bank_name,
  } = req.body || {};
  if (
    source_name === undefined &&
    number_bank === undefined &&
    bin_bank === undefined &&
    status === undefined &&
    active_supply === undefined
  ) {
    return res.status(400).json({ error: "No fields to update" });
  }

  const statusColumn = await resolveSupplyStatusColumn();
  const fields = [];
  const values = [];

  const addField = (column, value) => {
    fields.push(`${column} = ?`);
    values.push(value);
  };

  if (source_name !== undefined) {
    addField(QUOTED_COLS.supply.sourceName, source_name);
  }
  if (number_bank !== undefined) {
    addField(QUOTED_COLS.supply.numberBank, number_bank);
  }
  if (bin_bank !== undefined) {
    addField(QUOTED_COLS.supply.binBank, bin_bank);
  }
  if (status !== undefined || active_supply !== undefined) {
    if (statusColumn) {
      addField(`"${statusColumn}"`, status ?? active_supply ?? null);
    } else {
      addField(
        QUOTED_COLS.supply.activeSupply,
        active_supply !== undefined ? !!active_supply : status === "active"
      );
    }
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  try {
    const result = await db.raw(
      `
      UPDATE ${TABLES.supply}
      SET ${fields.join(", ")}
      WHERE ${QUOTED_COLS.supply.id} = ?
      RETURNING
        ${QUOTED_COLS.supply.id} AS id,
        ${QUOTED_COLS.supply.sourceName} AS source_name,
        ${QUOTED_COLS.supply.numberBank} AS number_bank,
        ${QUOTED_COLS.supply.binBank} AS bin_bank,
        ${statusColumn ? `"${statusColumn}" AS raw_status` : `${QUOTED_COLS.supply.activeSupply} AS raw_status`}
    `,
      [...values, parsedSupplyId]
    );

    if (!result.rows?.length) {
      return res.status(404).json({ error: "Supply not found" });
    }
    const row = result.rows[0];
    const normalizedStatus = normalizeSupplyStatus(row.raw_status);
    res.json({
      id: row.id,
      source_name: row.source_name,
      number_bank: row.number_bank,
      bin_bank: row.bin_bank,
      status: normalizedStatus,
      bank_name: bank_name ?? null,
    });
  } catch (error) {
    console.error("Mutation failed (PATCH /api/supplies/:id):", error);
    res.status(500).json({ error: "Unable to update supplier." });
  }
});

router.patch("/:supplyId/active", async (req, res) => {
  const { supplyId } = req.params;
  console.log("[PATCH] /api/supplies/:supplyId/active", req.body);

  const parsedSupplyId = Number.parseInt(supplyId, 10);
  if (!Number.isInteger(parsedSupplyId) || parsedSupplyId <= 0) {
    return res.status(400).json({
      error: "Invalid supply id.",
    });
  }

  const statusColumn = await resolveSupplyStatusColumn();
  const statusColumnName = statusColumn || QUOTED_COLS.supply.activeSupply;
  const statusValue =
    statusColumn === "status" ? req.body?.status : req.body?.active ?? req.body?.is_active;

  try {
    const result = await db.raw(
      `
      UPDATE ${TABLES.supply}
      SET "${statusColumnName}" = ?
      WHERE ${QUOTED_COLS.supply.id} = ?
      RETURNING ${QUOTED_COLS.supply.id} AS id, "${statusColumnName}" AS raw_status;
    `,
      [statusValue, parsedSupplyId]
    );

    if (!result.rows?.length) {
      return res.status(404).json({
        error: "Supply not found.",
      });
    }

    const normalizedStatus = normalizeSupplyStatus(result.rows[0].raw_status);
    res.json({
      id: parsedSupplyId,
      status: normalizedStatus,
      rawStatus: result.rows[0].raw_status,
      isActive: normalizedStatus !== "inactive",
    });
  } catch (error) {
    console.error("Mutation failed (PATCH /api/supplies/:id/active):", error);
    res.status(500).json({
      error: "Unable to update supply status.",
    });
  }
});

router.delete("/:supplyId", async (req, res) => {
  const { supplyId } = req.params;
  const parsedSupplyId = Number.parseInt(supplyId, 10);
  if (!Number.isInteger(parsedSupplyId) || parsedSupplyId <= 0) {
    return res.status(400).json({
      error: "Invalid supply id.",
    });
  }
  try {
    const result = await db.raw(
      `DELETE FROM ${TABLES.supply} WHERE ${QUOTED_COLS.supply.id} = ?`,
      [parsedSupplyId]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: "Supply not found." });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(
      `Mutation failed (DELETE /api/supplies/${parsedSupplyId}):`,
      error
    );
    res.status(500).json({
      error: "Unable to delete supply.",
    });
  }
});

router.get("/:supplyId/overview", async (req, res) => {
  const { supplyId } = req.params;
  console.log(`[GET] /api/supplies/${supplyId}/overview`);

  const parsedSupplyId = Number.parseInt(supplyId, 10);
  if (!Number.isInteger(parsedSupplyId) || parsedSupplyId <= 0) {
    return res.status(400).json({
      error: "Invalid supply id.",
    });
  }

  try {
    const client = db;
    const statusColumnName = await resolveSupplyStatusColumn();
    const statusColumn = statusColumnName || "status";
    const paymentStatusKey = createVietnameseStatusKey("ps.status");

    const supplyRowResult = await client.raw(
      `
        SELECT
          s.${QUOTED_COLS.supply.id} AS id,
          s.${QUOTED_COLS.supply.sourceName} AS source_name,
          s.${QUOTED_COLS.supply.numberBank} AS number_bank,
          s.${QUOTED_COLS.supply.binBank} AS bin_bank,
          ${statusColumn ? `s."${statusColumn}"` : QUOTED_COLS.supply.activeSupply} AS raw_status,
          bl.${QUOTED_COLS.bankList.bankName} AS bank_name,
          COALESCE(s.${QUOTED_COLS.supply.activeSupply}, TRUE) AS active_supply
        FROM ${TABLES.supply} s
        LEFT JOIN ${TABLES.bankList} bl ON TRIM(bl.${QUOTED_COLS.bankList.bin}::text) = TRIM(s.${QUOTED_COLS.supply.binBank}::text)
        WHERE s.${QUOTED_COLS.supply.id} = ?
        LIMIT 1;
      `,
      [parsedSupplyId]
    );
    if (!supplyRowResult.rows?.length) {
      return res.status(404).json({
        error: "Supply not found.",
      });
    }
    const supplyRow = supplyRowResult.rows[0];
    const normalizedStatus = normalizeSupplyStatus(supplyRow.raw_status);

    const statsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status IS DISTINCT FROM 'Da Hoan' AND status IS DISTINCT FROM 'Hoan' AND status IS DISTINCT FROM 'Da Hoàn' AND status IS DISTINCT FROM 'Hoàn') AS total_orders,
        COUNT(*) FILTER (WHERE ${createVietnameseStatusKey("status")} = 'huy') AS canceled_orders,
        COUNT(*) FILTER (WHERE ${createVietnameseStatusKey("status")} = 'chua thanh toan') AS unpaid_orders,
        COUNT(*) FILTER (WHERE ${createVietnameseStatusKey("status")} IN ('da thanh toan', 'da thu', 'dathu', 'thanh toan')) AS paid_orders,
        SUM(CASE WHEN ${createVietnameseStatusKey("status")} IN ('da thanh toan', 'da thu', 'dathu', 'thanh toan') THEN COALESCE(${QUOTED_COLS.orderList.price}, 0) ELSE 0 END) AS total_paid_amount
      FROM ${TABLES.orderList}
      WHERE TRIM(supply::text) = TRIM(?)
    `;
    const statsResult = await client.raw(statsQuery, [supplyRow.source_name]);
    const stats = statsResult.rows?.[0] || {};
    const totalOrders = Number(stats.total_orders) || 0;
    const canceledOrders = Number(stats.canceled_orders) || 0;
    const unpaidOrders = Number(stats.unpaid_orders) || 0;
    const paidOrders = Number(stats.paid_orders) || 0;
    const totalPaidAmount = Number(stats.total_paid_amount) || 0;

    const monthlyQuery = `
      SELECT
        EXTRACT(MONTH FROM ${createDateNormalization("order_date")}) AS month_num,
        COUNT(*) AS monthly_orders
      FROM ${TABLES.orderList}
      WHERE TRIM(supply::text) = TRIM(?)
      GROUP BY month_num
      ORDER BY month_num;
    `;
    const monthlyResult = await client.raw(monthlyQuery, [supplyRow.source_name]);
    const monthlyOrders =
      monthlyResult.rows?.map((row) => ({
        month: Number(row.month_num),
        orders: Number(row.monthly_orders) || 0,
      })) || [];

    let totalUnpaidAmount = 0;
    try {
      const unpaidSummary = await client.raw(
        `
        SELECT SUM(COALESCE(ps.${QUOTED_COLS.paymentSupply.importValue}, 0) - COALESCE(ps.${QUOTED_COLS.paymentSupply.paid}, 0)) AS total_unpaid
        FROM ${TABLES.paymentSupply} ps
        WHERE ps.${QUOTED_COLS.paymentSupply.sourceId} = ?
          AND ${paymentStatusKey} = 'chua thanh toan';
      `,
        [parsedSupplyId]
      );
      totalUnpaidAmount = Number(unpaidSummary.rows?.[0]?.total_unpaid) || 0;
    } catch (err) {
      console.error("Failed to compute total unpaid amount:", err);
      totalUnpaidAmount = 0;
    }

    const unpaidQuery = `
      SELECT
        ps.${QUOTED_COLS.paymentSupply.id} AS id,
        ps.${QUOTED_COLS.paymentSupply.round} AS round,
        COALESCE(ps.${QUOTED_COLS.paymentSupply.importValue}, 0) AS import_value,
        COALESCE(ps.${QUOTED_COLS.paymentSupply.paid}, 0) AS paid_value,
        COALESCE(ps.${QUOTED_COLS.paymentSupply.status}, '') AS status_label
      FROM ${TABLES.paymentSupply} ps
      WHERE ps.${QUOTED_COLS.paymentSupply.sourceId} = ?
        AND ${paymentStatusKey} = 'chua thanh toan'
      ORDER BY ps.${QUOTED_COLS.paymentSupply.id} DESC;
    `;
    const unpaidResult = await client.raw(unpaidQuery, [parsedSupplyId]);
    const unpaidPayments = (unpaidResult.rows || []).map((row) => ({
      id: row.id,
      round: row.round || "",
      totalImport: Number(row.import_value) || 0,
      paid: Number(row.paid_value) || 0,
      status: row.status_label || "",
    }));

    if ((!unpaidPayments || unpaidPayments.length === 0) && totalUnpaidAmount > 0) {
      unpaidPayments.push({
        id: 0,
        round: "Tien no",
        totalImport: totalUnpaidAmount,
        paid: 0,
        status: "Chua Thanh Toan",
      });
    }

    res.json({
      supply: {
        id: supplyRow.id,
        sourceName: supplyRow.source_name || "",
        numberBank: supplyRow.number_bank || null,
        binBank: supplyRow.bin_bank || null,
        bankName: supplyRow.bank_name || null,
        status: supplyRow.active_supply === false ? "inactive" : normalizedStatus,
        rawStatus: supplyRow.raw_status || null,
        isActive: supplyRow.active_supply === true,
      },
      stats: {
        totalOrders,
        canceledOrders,
        unpaidOrders,
        paidOrders,
        totalPaidAmount,
        monthlyOrders,
      },
      unpaidPayments,
    });
  } catch (error) {
    console.error("Query failed (GET /api/supplies/:id/overview):", error);
    res.status(500).json({
      error: "Unable to load supplier overview.",
    });
  }
});

module.exports = router;
module.exports.getSupplyInsights = getSupplyInsights;
