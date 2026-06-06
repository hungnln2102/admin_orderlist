#!/usr/bin/env node
/**
 * Smoke test webhook Sepay với STK MB Bank.
 *
 *   node scripts/ops/test-mb-bank-webhook.js
 *   node scripts/ops/test-mb-bank-webhook.js --url https://admin.mavrykpremium.com/webhook
 *
 * Env: DATABASE_URL, SEPAY_API_KEY hoặc SEPAY_WEBHOOK_SECRET (từ .env backend).
 */

const crypto = require("crypto");
const http = require("http");
const https = require("https");
const path = require("path");
const { URL } = require("url");
const { Pool } = require("pg");

require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
require("dotenv").config();

const MB_ACCOUNT = "0378304963";
const MB_BIN = "970422";
const MB_SHORT = "MB";
const MB_NAME = "MB Bank";
const ACCOUNT_HOLDER = "MAVRYK PREMIUM";

const DEFAULT_WEBHOOK_URL =
  process.env.WEBHOOK_URL ||
  "https://admin.mavrykpremium.com/webhook";

function parseArgs(argv) {
  const out = { url: DEFAULT_WEBHOOK_URL };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url" && argv[i + 1]) {
      out.url = argv[++i];
    }
  }
  return out;
}

function buildAuthHeaders(bodyString) {
  if (process.env.SEPAY_API_KEY) {
    return { Authorization: `Apikey ${process.env.SEPAY_API_KEY.trim()}` };
  }
  if (process.env.SEPAY_WEBHOOK_SECRET) {
    const sig = crypto
      .createHmac("sha256", process.env.SEPAY_WEBHOOK_SECRET)
      .update(Buffer.from(bodyString, "utf8"))
      .digest("hex");
    return { "X-SEPAY-SIGNATURE": sig };
  }
  throw new Error("Thiếu SEPAY_API_KEY hoặc SEPAY_WEBHOOK_SECRET trong .env");
}

function postJson(urlStr, bodyObj) {
  const bodyString = JSON.stringify(bodyObj);
  const headers = {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(bodyString, "utf8"),
    ...buildAuthHeaders(bodyString),
  };
  const u = new URL(urlStr);
  const lib = u.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: `${u.pathname}${u.search}`,
        method: "POST",
        headers,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let body = null;
          try {
            body = raw ? JSON.parse(raw) : null;
          } catch {
            body = { _raw: raw };
          }
          resolve({ statusCode: res.statusCode, body, raw });
        });
      }
    );
    req.on("error", reject);
    req.write(bodyString);
    req.end();
  });
}

async function upsertShopBankAccount(pool) {
  await pool.query(
    `
      UPDATE admin.shop_bank_accounts
      SET is_default = false, updated_at = NOW()
      WHERE is_default = true
    `
  );

  const existing = await pool.query(
    `
      SELECT id FROM admin.shop_bank_accounts
      WHERE TRIM(account_number) = $1
      LIMIT 1
    `,
    [MB_ACCOUNT]
  );

  if (existing.rows[0]?.id) {
    const id = existing.rows[0].id;
    await pool.query(
      `
        UPDATE admin.shop_bank_accounts
        SET
          label = $2,
          account_holder = $3,
          bank_bin = $4,
          bank_short_code = $5,
          bank_display_name = $6,
          is_default = true,
          is_active = true,
          updated_at = NOW()
        WHERE id = $1
      `,
      [id, "MB Bank (webhook test)", ACCOUNT_HOLDER, MB_BIN, MB_SHORT, MB_NAME]
    );
    return id;
  }

  const inserted = await pool.query(
    `
      INSERT INTO admin.shop_bank_accounts (
        label, account_number, account_holder, bank_bin,
        bank_short_code, bank_display_name, is_default, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, true, true)
      RETURNING id
    `,
    ["MB Bank (webhook test)", MB_ACCOUNT, ACCOUNT_HOLDER, MB_BIN, MB_SHORT, MB_NAME]
  );
  return inserted.rows[0].id;
}

async function ensureTestOrder(pool, marker) {
  const orderCode = `MAVT${Date.now().toString().slice(-8)}`;
  const transferCode = `TX${Date.now().toString().slice(-10)}`;
  const price = 50000;

  const maxId = await pool.query(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM orders.order_list`);
  const nextId = Number(maxId.rows[0]?.next_id) || Date.now();

  const productRow = await pool.query(
    `SELECT id_product FROM orders.order_list WHERE id_product IS NOT NULL LIMIT 1`
  );
  const idProduct = productRow.rows[0]?.id_product || "TEST-PRODUCT";

  await pool.query(
    `
      INSERT INTO orders.order_list (
        id, id_order, id_product, customer, price, cost, status,
        order_date, expiry_date, days, transaction
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 30, $8
      )
    `,
    [
      nextId,
      orderCode,
      idProduct,
      `Webhook Test ${marker}`,
      price,
      10000,
      "Chưa Thanh Toán",
      transferCode,
    ]
  );

  return { orderCode, transferCode, price };
}

async function main() {
  const { url } = parseArgs(process.argv);
  if (!process.env.DATABASE_URL) {
    throw new Error("Thiếu DATABASE_URL");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const marker = `MB-WH-${Date.now()}`;
  let orderCode = "";
  let transferCode = "";
  let price = 0;

  try {
    const bankId = await upsertShopBankAccount(pool);
    console.log(`[setup] shop_bank_accounts id=${bankId} STK=${MB_ACCOUNT} ${MB_NAME}`);

    ({ orderCode, transferCode, price } = await ensureTestOrder(pool, marker));
    console.log(`[setup] order ${orderCode} transaction=${transferCode} price=${price}`);

    const transactionDate = new Date().toISOString().slice(0, 19).replace("T", " ");
    const content = `Thanh toan ${transferCode} ${orderCode} ${marker}`;
    const payload = {
      id: String(Date.now()),
      transactionDate,
      accountNumber: MB_ACCOUNT,
      transferType: "in",
      transferAmount: price,
      content,
      description: marker,
    };

    console.log(`[webhook] POST ${url}`);
    const res = await postJson(url, payload);
    console.log(`[webhook] HTTP ${res.statusCode}`);
    console.log(JSON.stringify(res.body, null, 2));

    const receipt = await pool.query(
      `
        SELECT id, id_order, amount, receiver, note, sender
        FROM receipt.payment_receipt
        WHERE note ILIKE $1 OR note ILIKE $2
        ORDER BY id DESC
        LIMIT 1
      `,
      [`%${marker}%`, `%${transferCode}%`]
    );

    const orderAfter = await pool.query(
      `SELECT status FROM orders.order_list WHERE LOWER(id_order) = LOWER($1) LIMIT 1`,
      [orderCode]
    );

    console.log("\n[verify]");
    console.log(
      JSON.stringify(
        {
          receipt: receipt.rows[0] || null,
          orderStatus: orderAfter.rows[0]?.status || null,
          expectedReceiver: MB_ACCOUNT,
        },
        null,
        2
      )
    );

    const ok =
      res.statusCode >= 200 &&
      res.statusCode < 300 &&
      receipt.rows[0] &&
      String(receipt.rows[0].receiver || "").trim() === MB_ACCOUNT;

    if (!ok) process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
