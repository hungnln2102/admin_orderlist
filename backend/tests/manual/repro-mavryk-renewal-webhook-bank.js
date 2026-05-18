/**
 * Repro + verify fix:
 * - Don dang CAN GIA HAN, NCC Mavryk/Shop.
 * - Don tung co gia nhap tren order, nhung supplier_cost da bo.
 * - Gia lap webhook gia han: bank phai cong du transfer_amount (khong bi tru theo gia nhap cu).
 *
 * Run:
 *   node tests/manual/repro-mavryk-renewal-webhook-bank.js
 */

require("dotenv").config();
process.env.SEND_RENEWAL_TO_TOPIC = "false";
process.env.TELEGRAM_BOT_TOKEN = "";

const crypto = require("crypto");
const request = require("supertest");
const { Pool } = require("pg");
const webhookApp = require("../../webhook/sepay/app");
const { STATUS } = require("../../src/utils/statuses");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const FUTURE_MONTH_KEY = "2099-12";
const FUTURE_PAYMENT_DATE = "2099-12-15";
const MARKER = `MAVRYK-RENEW-BANK-${Date.now()}`;

const ymd = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const buildAuth = (payloadString) => {
  if (process.env.SEPAY_API_KEY) {
    return { Authorization: `Apikey ${process.env.SEPAY_API_KEY}` };
  }
  if (process.env.SEPAY_WEBHOOK_SECRET) {
    const sig = crypto
      .createHmac("sha256", process.env.SEPAY_WEBHOOK_SECRET)
      .update(Buffer.from(payloadString))
      .digest("hex");
    return { "X-SEPAY-SIGNATURE": sig };
  }
  throw new Error("Thiếu SEPAY_API_KEY hoặc SEPAY_WEBHOOK_SECRET.");
};

const getSummary = async (monthKey) => {
  const res = await pool.query(
    `
      SELECT
        COALESCE(total_revenue::numeric, 0) AS total_revenue,
        COALESCE(total_profit::numeric, 0) AS total_profit,
        COALESCE(estimated_bank_balance::numeric, 0) AS estimated_bank_balance
      FROM dashboard.dashboard_monthly_summary
      WHERE month_key = $1
      LIMIT 1
    `,
    [monthKey]
  );
  if (!res.rows.length) {
    return { revenue: 0, profit: 0, bank: 0 };
  }
  return {
    revenue: Number(res.rows[0].total_revenue) || 0,
    profit: Number(res.rows[0].total_profit) || 0,
    bank: Number(res.rows[0].estimated_bank_balance) || 0,
  };
};

const callWebhook = async (payload) => {
  const body = JSON.stringify(payload);
  const headers = buildAuth(body);
  let req = request(webhookApp)
    .post("/api/payment/notify")
    .set("Content-Type", "application/json");
  for (const [k, v] of Object.entries(headers)) {
    req = req.set(k, v);
  }
  return req.send(body);
};

const pickInternalSupplier = async () => {
  const res = await pool.query(
    `
      SELECT id, supplier_name
      FROM partner.supplier
      WHERE LOWER(TRIM(COALESCE(supplier_name::text, ''))) IN ('mavryk', 'shop')
      ORDER BY id ASC
      LIMIT 1
    `
  );
  return res.rows[0] || null;
};

const pickRenewalVariant = async () => {
  const preferred = await pool.query(
    `
      SELECT id
      FROM product.variant
      WHERE display_name::text ~ '--[0-9]+[mMyY]'
      ORDER BY id ASC
      LIMIT 1
    `
  );
  if (preferred.rows.length) return Number(preferred.rows[0].id);
  const fallback = await pool.query("SELECT id FROM product.variant ORDER BY id ASC LIMIT 1");
  return Number(fallback.rows[0]?.id || 0);
};

const cleanup = async (orderCode) => {
  await pool.query(
    `
      DELETE FROM receipt.payment_receipt_financial_audit_log
      WHERE payment_receipt_id IN (
        SELECT id
        FROM receipt.payment_receipt
        WHERE LOWER(COALESCE(note::text, '')) = LOWER($1)
      )
    `,
    [orderCode]
  );
  await pool.query(
    `
      DELETE FROM receipt.payment_receipt_financial_state
      WHERE payment_receipt_id IN (
        SELECT id
        FROM receipt.payment_receipt
        WHERE LOWER(COALESCE(note::text, '')) = LOWER($1)
      )
    `,
    [orderCode]
  );
  await pool.query(
    `
      DELETE FROM receipt.payment_receipt
      WHERE LOWER(COALESCE(note::text, '')) = LOWER($1)
    `,
    [orderCode]
  );
  await pool.query("DELETE FROM orders.order_list WHERE LOWER(id_order) = LOWER($1)", [orderCode]);
  await pool.query("DELETE FROM dashboard.dashboard_monthly_summary WHERE month_key = $1", [
    FUTURE_MONTH_KEY,
  ]);
};

(async () => {
  const transferAmount = 80000;
  const staleOrderCost = 55000;
  let orderCode = "";
  try {
    const supplier = await pickInternalSupplier();
    if (!supplier?.id) {
      throw new Error("Khong tim thay NCC noi bo (mavryk/shop).");
    }
    const variantId = await pickRenewalVariant();
    if (!variantId) {
      throw new Error("Khong tim thay variant de test.");
    }

    orderCode = `MAVL${Date.now().toString().slice(-8)}`;

    const maxIdRes = await pool.query("SELECT COALESCE(MAX(id), 0)::int AS max_id FROM orders.order_list");
    const nextId = Number(maxIdRes.rows[0]?.max_id || 0) + 3333;

    const today = new Date();
    const orderDate = new Date(today.getTime() - 25 * 86400000);
    const expiredAt = new Date(today.getTime() + 2 * 86400000);

    await pool.query(
      `
        INSERT INTO orders.order_list (
          id, id_order, id_product, information_order, customer, contact, slot,
          order_date, days, expired_at, supply_id, cost, price, note, status, refund
        )
        VALUES (
          $1, $2, $3, $4, $5, '0900000000', '1',
          $6, 30, $7, $8, $9, $10, $11, $12, 0
        )
      `,
      [
        nextId,
        orderCode,
        variantId,
        `${MARKER}-info`,
        MARKER,
        ymd(orderDate),
        ymd(expiredAt),
        Number(supplier.id),
        staleOrderCost,
        transferAmount,
        MARKER,
        STATUS.RENEWAL,
      ]
    );

    // Simulate "truoc do co gia nhap, sau do da bo gia nhap di".
    await pool.query(
      "DELETE FROM partner.supplier_cost WHERE variant_id = $1 AND supplier_id = $2",
      [variantId, Number(supplier.id)]
    );

    const before = await getSummary(FUTURE_MONTH_KEY);
    const payload = {
      transactionDate: `${FUTURE_PAYMENT_DATE} 10:00:00`,
      accountNumber: "918340998",
      transferType: "in",
      transferAmount,
      id: `SE-${MARKER}`,
      content: `${MARKER} GIA HAN ${orderCode}`,
      description: `${MARKER}-desc`,
    };
    const http = await callWebhook(payload);
    const after = await getSummary(FUTURE_MONTH_KEY);
    const orderRes = await pool.query(
      "SELECT status FROM orders.order_list WHERE LOWER(id_order) = LOWER($1) LIMIT 1",
      [orderCode]
    );

    const revenueDelta = after.revenue - before.revenue;
    const profitDelta = after.profit - before.profit;
    const bankDelta = after.bank - before.bank;
    const orderStatus = String(orderRes.rows[0]?.status || "");
    const ok =
      http.status === 200 &&
      orderStatus === STATUS.PAID &&
      revenueDelta === transferAmount &&
      profitDelta === transferAmount &&
      bankDelta === transferAmount;

    console.log(
      JSON.stringify(
        {
          marker: MARKER,
          success: ok,
          orderCode,
          supplier: {
            id: Number(supplier.id),
            supplier_name: supplier.supplier_name,
          },
          httpStatus: http.status,
          orderStatus,
          expectedDelta: transferAmount,
          deltas: { revenueDelta, profitDelta, bankDelta },
        },
        null,
        2
      )
    );

    if (!ok) process.exitCode = 1;
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          marker: MARKER,
          success: false,
          error: error?.message || String(error),
          stack: error?.stack || null,
          orderCode,
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  } finally {
    try {
      if (orderCode) await cleanup(orderCode);
    } catch (_) {}
    await pool.end();
  }
})();
