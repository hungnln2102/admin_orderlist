const express = require("express");
const {
  ORDER_COLS,
  ORDER_TABLE,
  pool,
  SUPPLIER_TABLE,
  SUPPLIER_COLS,
} = require("../config");
const { safeStringify, normalizeAmount, extractOrderCodes, resolveOrderByPayment, parseFlexibleDate, normalizeMoney } = require("../utils");
const {
  normalizeTransactionPayload,
  deriveOrderCode,
} = require("../transactions");
const {
  resolveSepaySignature,
  verifySepaySignature,
  isValidApiKey,
} = require("../auth");
const {
  insertPaymentReceipt,
  getReceiptFinancialState,
  updateReceiptFinancialState,
  ensureSupplyAndPriceFromOrder,
  updatePaymentSupplyBalance,
} = require("../payments");
const {
  queueRenewalTask,
  processRenewalTask,
  fetchOrderState,
  isEligibleForRenewal,
} = require("../renewal");
const { STATUS: ORDER_STATUS } = require("../../../src/utils/statuses");
const {
  isMavnImportOrder,
  isMavrykShopSupplierName,
  isDashboardSalesOrder,
} = require("../../../src/utils/orderHelpers");
const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("../../../src/config/dbSchema");
const { qualifiedSummaryCol } = require("../../../src/controllers/Order/finance/dashboardSummary");
const logger = require("../../../src/utils/logger");
const { withSavepoint } = require("../savepoint");

/** Tên NCC theo supply_id (chuẩn hóa lowercase trong isMavrykShopSupplierName). */
const fetchSupplierNameBySupplyId = async (client, supplyIdRaw) => {
  if (supplyIdRaw == null || !Number.isFinite(Number(supplyIdRaw))) return "";
  try {
    return await withSavepoint(client, "fetch_supplier_nm", async () => {
      const { rows } = await client.query(
        `SELECT ${SUPPLIER_COLS.supplierName} FROM ${SUPPLIER_TABLE}
       WHERE ${SUPPLIER_COLS.id} = $1 LIMIT 1`,
        [Number(supplyIdRaw)]
      );
      return String(rows[0]?.[SUPPLIER_COLS.supplierName] ?? "").trim();
    });
  } catch (e) {
    logger.warn("[Webhook] Không đọc được tên NCC", {
      supplyIdRaw,
      error: e.message,
    });
    return "";
  }
};

const router = express.Router();
const summaryTable = tableName(FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.TABLE, SCHEMA_FINANCE);
const summaryCols = FINANCE_SCHEMA.DASHBOARD_MONTHLY_SUMMARY.COLS;

const toMonthKey = (value) => {
  const parsedDate = parseFlexibleDate(value);
  if (!parsedDate) return null;
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const incrementDashboardSummaryOnProcessing = async (client, orderState, orderCode = "") => {
  if (!isDashboardSalesOrder({ id_order: orderCode })) return;
  const monthKey = toMonthKey(orderState?.[ORDER_COLS.orderDate]);
  if (!monthKey) return;

  const price = normalizeMoney(orderState?.[ORDER_COLS.price]);
  const cost = normalizeMoney(orderState?.[ORDER_COLS.cost]);
  const profit = price - cost;

  await client.query(
    `
      INSERT INTO ${summaryTable} (
        ${summaryCols.MONTH_KEY},
        ${summaryCols.TOTAL_ORDERS},
        ${summaryCols.TOTAL_REVENUE},
        ${summaryCols.TOTAL_PROFIT},
        ${summaryCols.UPDATED_AT}
      )
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (${summaryCols.MONTH_KEY})
      DO UPDATE SET
        ${summaryCols.TOTAL_ORDERS} = GREATEST(0, ${qualifiedSummaryCol(summaryCols.TOTAL_ORDERS)} + EXCLUDED.${summaryCols.TOTAL_ORDERS}),
        ${summaryCols.TOTAL_REVENUE} = ${qualifiedSummaryCol(summaryCols.TOTAL_REVENUE)} + EXCLUDED.${summaryCols.TOTAL_REVENUE},
        ${summaryCols.TOTAL_PROFIT} = ${qualifiedSummaryCol(summaryCols.TOTAL_PROFIT)} + EXCLUDED.${summaryCols.TOTAL_PROFIT},
        ${summaryCols.UPDATED_AT} = NOW()
    `,
    [monthKey, 1, price, profit]
  );
};

const incrementDashboardSummaryByDelta = async (
  client,
  monthKey,
  { revenueDelta = 0, profitDelta = 0, ordersDelta = 0 } = {}
) => {
  const revenue = normalizeMoney(revenueDelta);
  const profit = normalizeMoney(profitDelta);
  const orders = Number.isFinite(Number(ordersDelta)) ? Number(ordersDelta) : 0;
  if (!monthKey) return;
  if (!revenue && !profit && !orders) return;

  await client.query(
    `
      INSERT INTO ${summaryTable} (
        ${summaryCols.MONTH_KEY},
        ${summaryCols.TOTAL_ORDERS},
        ${summaryCols.TOTAL_REVENUE},
        ${summaryCols.TOTAL_PROFIT},
        ${summaryCols.UPDATED_AT}
      )
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (${summaryCols.MONTH_KEY})
      DO UPDATE SET
        ${summaryCols.TOTAL_ORDERS} = GREATEST(0, ${qualifiedSummaryCol(summaryCols.TOTAL_ORDERS)} + EXCLUDED.${summaryCols.TOTAL_ORDERS}),
        ${summaryCols.TOTAL_REVENUE} = ${qualifiedSummaryCol(summaryCols.TOTAL_REVENUE)} + EXCLUDED.${summaryCols.TOTAL_REVENUE},
        ${summaryCols.TOTAL_PROFIT} = ${qualifiedSummaryCol(summaryCols.TOTAL_PROFIT)} + EXCLUDED.${summaryCols.TOTAL_PROFIT},
        ${summaryCols.UPDATED_AT} = NOW()
    `,
    [monthKey, orders, revenue, profit]
  );
};

const hasPriorReceiptForOrder = async (client, orderCode, currentReceiptId, orderDateRaw) => {
  if (!orderCode) return false;
  const currentId = Number(currentReceiptId);
  const parsedOrderDate = parseFlexibleDate(orderDateRaw);
  const fromDate = parsedOrderDate
    ? parsedOrderDate.toISOString().slice(0, 10)
    : "1900-01-01";

  const res = await client.query(
    `
      SELECT 1
      FROM orders.payment_receipt pr
      WHERE LOWER(COALESCE(pr.id_order::text, '')) = LOWER($1)
        AND pr.payment_date >= $2::date
        AND ($3::bigint IS NULL OR pr.id <> $3::bigint)
      ORDER BY pr.id DESC
      LIMIT 1
    `,
    [orderCode, fromDate, Number.isFinite(currentId) ? currentId : null]
  );
  return res.rows.length > 0;
};

// Health check for webhook endpoint
router.get("/", (_req, res) => {
  res.json({ message: "Sepay webhook endpoint. Use POST with signature." });
});

router.post("/", async (req, res) => {
  logger.debug("Incoming Sepay webhook", {
    headers: {
      authorization: req.get("Authorization") ? "***" : null,
      xApiKey: req.get("X-API-KEY") ? "***" : null,
      xSepaySignature: req.get("X-SEPAY-SIGNATURE") ? "***" : null,
      signature: req.get("Signature") ? "***" : null,
      querySignature: req.query?.signature ? "***" : null,
    },
    bodySize: JSON.stringify(req.body).length,
  });

  const signature = resolveSepaySignature(req);
  const hasValidSignature = verifySepaySignature(req.rawBody, signature);
  const hasValidApiKey = isValidApiKey(req);
  if (!(hasValidSignature || hasValidApiKey)) {
    logger.warn("Webhook auth failed", {
      hasValidSignature,
      hasValidApiKey,
      hasAuth: !!req.get("Authorization"),
    });
    return res.status(403).json({ message: "Invalid Signature" });
  }

  const transaction = normalizeTransactionPayload(req.body);
  logger.debug("Parsed transaction", { transaction: safeStringify(transaction) });
  if (!transaction) {
    return res.status(400).json({ message: "Missing transaction" });
  }

  const orderCode = deriveOrderCode(transaction);
  const extractedOrderCodes = extractOrderCodes(transaction);
  const normalizedPrimary = String(orderCode || "").trim().toUpperCase();
  const normalizedExtracted = extractedOrderCodes
    .map((code) => String(code || "").trim().toUpperCase())
    .filter(Boolean);
  // Nhiều mã đơn phân cách bằng "-": dùng đủ danh sách đã tách, không chỉ primary
  const orderCodes = [
    ...new Set(
      normalizedExtracted.length > 0
        ? normalizedExtracted
        : normalizedPrimary
          ? [normalizedPrimary]
          : []
    ),
  ];
  logger.debug("Order codes from webhook", { orderCodes, count: orderCodes.length });
  const transferAmountNormalized = normalizeAmount(
    transaction.transfer_amount || transaction.amount_in
  );

  try {
    let receiptResult = null;
    const eligibilityByOrderCode = new Map();
    const stateByOrderCode = new Map();

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Fallback: nếu không extract được mã MAV, thử match theo số tiền + trạng thái
      if (!orderCodes.length && transferAmountNormalized > 0) {
        logger.info("[Webhook] No MAV order code found, trying amount-based fallback", {
          amount: transferAmountNormalized,
          content: transaction.transaction_content,
        });
        const fallbackCodes = await resolveOrderByPayment(client, {
          amount: transferAmountNormalized,
          transactionContent: transaction.transaction_content,
        });
        if (fallbackCodes.length) {
          orderCodes.push(...fallbackCodes);
          logger.info("[Webhook] Fallback matched orders", { orderCodes: fallbackCodes });
        } else {
          logger.warn("[Webhook] Fallback could not match any order", {
            amount: transferAmountNormalized,
          });
        }
      }

      for (const code of orderCodes.length ? orderCodes : orderCode ? [orderCode] : []) {
        const stateRes = await client.query(
          `SELECT
            ${ORDER_COLS.status},
            ${ORDER_COLS.expiryDate},
            ${ORDER_COLS.orderDate},
            ${ORDER_COLS.price},
            ${ORDER_COLS.cost},
            ${ORDER_COLS.idSupply}
          FROM ${ORDER_TABLE}
          WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
          LIMIT 1`,
          [code]
        );
        const state = stateRes.rows[0] || null;
        stateByOrderCode.set(code, state);
        eligibilityByOrderCode.set(
          code,
          state
            ? isEligibleForRenewal(
                state[ORDER_COLS.status],
                state[ORDER_COLS.expiryDate]
              )
            : null
        );
      }

      // Dùng mã đơn đã resolve (fallback hoặc extract) thay vì orderCode gốc
      const resolvedOrderCode = orderCodes[0] || orderCode;
      receiptResult = await insertPaymentReceipt(transaction, { client, orderCode: resolvedOrderCode });
      const receiptId = receiptResult?.id ?? receiptResult?.existingId ?? null;
      const receiptState = await getReceiptFinancialState(client, receiptId);
      const alreadyFinancialPosted = !!receiptState?.is_financial_posted;
      const paidMonthKey = toMonthKey(transaction.transaction_date || transaction.transaction_date_raw || new Date());
      let postedRevenueDelta = 0;
      let postedProfitDelta = 0;

      if (receiptResult?.inserted) {
        const referenceImport =
          orderCodes.length > 1 ? null : transferAmountNormalized;

        for (const code of orderCodes.length ? orderCodes : orderCode ? [orderCode] : []) {
          const state = stateByOrderCode.get(code);
          const eligibility = eligibilityByOrderCode.get(code);

          // Trường hợp đặc biệt:
          // - Đơn đã ở trạng thái PAID thì không cộng thêm tiền NCC,
          //   kể cả khi khách hàng chuyển khoản thêm lần nữa.
          if (state && state[ORDER_COLS.status] === ORDER_STATUS.PAID) {
            logger.info("[Webhook] Skip supplier import for already PAID order", {
              orderCode: code,
            });
            continue;
          }

          if (isMavnImportOrder({ id_order: code })) {
            logger.info("[Webhook] Skip supplier import for MAVN (nhập hàng)", {
              orderCode: code,
            });
            continue;
          }

          const loopSupplyName = await fetchSupplierNameBySupplyId(
            client,
            state?.[ORDER_COLS.idSupply]
          );
          if (isMavrykShopSupplierName(loopSupplyName)) {
            logger.info("[Webhook] Skip supplier import (NCC Mavryk/Shop)", {
              orderCode: code,
            });
            continue;
          }

          // Avoid double supplier import updates for renewal flows:
          // - Renewal path already calls updatePaymentSupplyBalance() inside runRenewal().
          // - Non-renewal path should add import once per unique receipt.
          if (eligibility?.eligible) continue;

          const ensured = await ensureSupplyAndPriceFromOrder(code, {
            referenceImport,
            client,
          });
          logger.debug("Ensure supply/price result", { orderCode: code, ensured });
          if (ensured?.supplierId && Number.isFinite(ensured.price)) {
            await updatePaymentSupplyBalance(
              ensured.supplierId,
              ensured.price,
              new Date(),
              { client }
            );
          }
        }
      }

      // Chưa Thanh Toán → Đã Thanh Toán khi có biên lai (trigger ghi supplier_order_cost_log).
      // MAVN: không đổi trạng thái đơn qua Sepay — Đã Thanh Toán khi xác nhận thanh toán NCC (POST .../payment-supply/.../confirm).
      // Cần Gia Hạn: renewal sau COMMIT (+ log khi cập nhật đơn trong renewal.js).
      if (receiptResult?.inserted || receiptResult?.duplicate) {
        const codesToUpdate = orderCodes.length ? orderCodes : orderCode ? [orderCode] : [];
        for (const code of codesToUpdate) {
          if (isMavnImportOrder({ id_order: code })) {
            logger.info("[Webhook] Skip status update for MAVN (nhập hàng)", {
              orderCode: code,
            });
            continue;
          }

          const state = stateByOrderCode.get(code);
          if (!state) continue;

          const statusValue = state[ORDER_COLS.status];
          if (statusValue === ORDER_STATUS.UNPAID) {
            const nextStatus = ORDER_STATUS.PAID;
            const statusUpdateResult = await client.query(
              `UPDATE ${ORDER_TABLE}
               SET ${ORDER_COLS.status} = $2
               WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
                 AND ${ORDER_COLS.status} = $3`,
              [code, nextStatus, ORDER_STATUS.UNPAID]
            );
            if (statusUpdateResult.rowCount > 0) {
              await incrementDashboardSummaryOnProcessing(client, state, code);
              if (!alreadyFinancialPosted) {
                postedRevenueDelta += normalizeMoney(state[ORDER_COLS.price]);
                postedProfitDelta += normalizeMoney(state[ORDER_COLS.price]) - normalizeMoney(state[ORDER_COLS.cost]);
              }
            }
            logger.debug("[Webhook] Order status → Đã Thanh Toán", {
              orderCode: code,
              previousStatus: statusValue,
              nextStatus,
            });
          } else if (
            !alreadyFinancialPosted &&
            (statusValue === ORDER_STATUS.PAID || statusValue === ORDER_STATUS.PROCESSING)
          ) {
            const hasPrior = await hasPriorReceiptForOrder(
              client,
              code,
              receiptId,
              state[ORDER_COLS.orderDate]
            );
            if (hasPrior) {
              await incrementDashboardSummaryByDelta(client, paidMonthKey, {
                revenueDelta: transferAmountNormalized,
                profitDelta: transferAmountNormalized,
                ordersDelta: 0,
              });
              postedRevenueDelta += transferAmountNormalized;
              postedProfitDelta += transferAmountNormalized;
            } else {
              logger.info("[Webhook] Skip financial posting for first late payment after shop pre-renewed", {
                orderCode: code,
                status: statusValue,
              });
            }
          } else if (
            !alreadyFinancialPosted &&
            statusValue === ORDER_STATUS.EXPIRED
          ) {
            await incrementDashboardSummaryByDelta(client, paidMonthKey, {
              revenueDelta: transferAmountNormalized,
              profitDelta: transferAmountNormalized,
              ordersDelta: 0,
            });
            postedRevenueDelta += transferAmountNormalized;
            postedProfitDelta += transferAmountNormalized;
          }
        }
      }

      if (
        !alreadyFinancialPosted &&
        (!orderCodes.length && !orderCode) &&
        transferAmountNormalized > 0
      ) {
        await incrementDashboardSummaryByDelta(client, paidMonthKey, {
          revenueDelta: transferAmountNormalized,
          profitDelta: transferAmountNormalized,
          ordersDelta: 0,
        });
        postedRevenueDelta += transferAmountNormalized;
        postedProfitDelta += transferAmountNormalized;
      }

      if (receiptId) {
        if (!alreadyFinancialPosted && (postedRevenueDelta !== 0 || postedProfitDelta !== 0)) {
          await updateReceiptFinancialState(client, receiptId, {
            is_financial_posted: true,
            posted_revenue: postedRevenueDelta,
            posted_profit: postedProfitDelta,
          });
        } else if (!alreadyFinancialPosted) {
          await updateReceiptFinancialState(client, receiptId, {
            is_financial_posted: false,
            posted_revenue: 0,
            posted_profit: 0,
          });
        }
      }

      await client.query("COMMIT");
    } catch (dbErr) {
      await client.query("ROLLBACK");
      throw dbErr;
    } finally {
      client.release();
    }

    // Chạy gia hạn cho đơn Cần Gia Hạn (RENEWAL, daysLeft <= 4). MAVN không xử lý gia hạn qua Sepay — dùng API gia hạn tay.
    try {
      for (const code of orderCodes.length ? orderCodes : orderCode ? [orderCode] : []) {
        if (isMavnImportOrder({ id_order: code })) {
          logger.info("[Webhook] Bỏ qua renewal Sepay cho đơn MAVN", { orderCode: code });
          continue;
        }
        const precomputedEligibility = eligibilityByOrderCode.get(code);
        if (precomputedEligibility?.eligible) {
          queueRenewalTask(code, {
            forceRenewal: precomputedEligibility.forceRenewal,
          });
          await processRenewalTask(code);
        }
      }
    } catch (renewErr) {
      logger.error("Renewal flow failed", { error: renewErr.message, stack: renewErr.stack });
    }

    return res.json({ message: "OK" });
  } catch (err) {
    logger.error("Error saving payment", { error: err.message, stack: err.stack });
    return res.status(500).json({ message: "Internal Error" });
  }
});

module.exports = router;
