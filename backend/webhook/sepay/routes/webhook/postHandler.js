const {
  ORDER_COLS,
  ORDER_TABLE,
  pool,
} = require("../../config");

const {
  safeStringify,
  normalizeAmount,
  normalizeMoney,
  resolveOrderByPayment,
} = require("../../utils");
const {
  insertPaymentReceipt,
  getReceiptFinancialState,
  updateReceiptFinancialState,
  insertFinancialAuditLog,
  ensureSupplyAndPriceFromOrder,
  updatePaymentSupplyBalance,
  countPaymentReceiptsForOrderCode,
} = require("../../payments");
const {
  isEligibleForRenewal,
  fetchMonthlySummarySnapshot,
} = require("../../renewal");
const { STATUS: ORDER_STATUS } = require("@/utils/statuses");
const {
  isMavnImportOrder,
  isMavrykShopSupplierName,
} = require("@/utils/orderHelpers");
const { getOrderQrPaymentEligibility } = require("../../orderPaymentEligibility");
const logger = require("@/utils/logger");
const {
  verifyWebhookAuth,
} = require("./authPhase");
const {
  parseWebhookTransaction,
} = require("./parsePhase");
const {
  resolveOrderCodesByBatchCodes,
  resolveBatchOrderAmountsByBatchCodes,
} = require("./matchPhase");
const {
  PAYMENT_RECEIPT_BATCH_TABLE,
  PAYMENT_RECEIPT_BATCH_ITEM_TABLE,
  REFUND_CREDIT_APPLICATIONS_TABLE,
  isMissingBatchTablesError,
} = require("./constants");
const {
  toMonthKey,
  monthKeyFromPaidDateYmd,
  incrementDashboardSummaryByDelta,
  computeWebhookAmountDecision,
  postWebhookPaymentForOrder,
  getAccumulatedReceiptAmount,
  resolveOrderPriceForWebhookMatch,
  fetchSupplierNameBySupplyId,
} = require("./postingPhase");
const { creditShopBankFromPaymentReceipt } = require("@/domains/shop-bank-accounts/services/shopBankLedgerService");
const { dispatchWebhookRenewals } = require("./renewalPhase");
const { notifyCombinedMonthlyDelta } = require("./notifyPhase");
const {
  buildWebhookLoopOrderCodes,
  createWebhookAmountForCodeResolver,
  resolveWebhookPostedRevenue,
} = require("./orderCodeResolution");
const { resolveBatchCodesByTransferTokens } = require("./resolveBatchCodesByTransfer");
const { resolveBatchCodesByExpectedAmount } = require("./resolveBatchCodesByExpectedAmount");
const { STATUS } = require("@/utils/statuses");
const { withSavepoint } = require("../../savepoint");
const { ensureOffFlowRefundCreditNote } = require("@/domains/orders/controller/finance/offFlowRefundCredits");

async function handleWebhookPost(req, res) {
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

  const auth = verifyWebhookAuth(req);
  if (!auth.ok) {
    logger.warn("Webhook auth failed", {
      hasValidSignature: auth.hasValidSignature,
      hasValidApiKey: auth.hasValidApiKey,
      hasAuth: !!req.get("Authorization"),
    });
    return res.status(403).json({ message: "Invalid Signature" });
  }

  const parsed = parseWebhookTransaction(req.body);
  const transaction = parsed?.transaction || null;
  logger.debug("Parsed transaction", { transaction: safeStringify(transaction) });
  if (!transaction || !parsed) {
    return res.status(400).json({ message: "Missing transaction" });
  }

  // Phát sự kiện ra EventBus để tách biệt logic xử lý khỏi HTTP response
  const eventBus = require("@/events/eventBus");
  const EVENTS = require("@/events/eventTypes");
  eventBus.emit(EVENTS.SEPAY_WEBHOOK_RECEIVED, {
    reqBody: req.body,
    parsed,
  });

  // Trả về 200 ngay lập tức cho Sepay
  return res.status(200).json({ message: "Webhook accepted and queued for processing" });
}

async function processWebhookTransactionAsync(reqBody, parsed) {
  const transaction = parsed?.transaction || null;
  const {
    orderCode,
    paymentReferenceCodes,
    orderCodes,
    batchCodes,
    transferAmountNormalized,
    supplierSettlementTransfer,
  } = parsed;
  const potentialSupplierRefundTransfer = Boolean(parsed?.potentialSupplierRefundTransfer);
  const autoSupplierSettlement = parsed?.autoSupplierSettlement || null;
  logger.debug("Order codes from webhook", { orderCodes, count: orderCodes.length });

  try {
    let receiptResult = null;
    const eligibilityByOrderCode = new Map();
    const stateByOrderCode = new Map();
    const amountDecisionByOrderCode = new Map();
    let loopOrderCodes = [];
    /** Legacy: resolve qua cột transaction — luồng suffix/batch không dùng. */
    const orderCodesFromTransaction = [];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const batchCodesFromTransfer = await resolveBatchCodesByTransferTokens(
        client,
        paymentReferenceCodes
      );
      const resolvedBatchCodes = [
        ...new Set([
          ...(batchCodes || []),
          ...batchCodesFromTransfer,
        ]),
      ];
      if (batchCodesFromTransfer.length > 0) {
        logger.info("[Webhook] Resolved batch by transfer code", {
          paymentReferenceCodes,
          batchCodesFromTransfer,
        });
      }

      if (
        resolvedBatchCodes.length === 0 &&
        transferAmountNormalized > 0 &&
        !supplierSettlementTransfer
      ) {
        const batchByAmount = await resolveBatchCodesByExpectedAmount(client, {
          amount: transferAmountNormalized,
        });
        if (batchByAmount.length > 0) {
          resolvedBatchCodes.push(...batchByAmount);
          logger.info("[Webhook] Resolved batch by total amount (no transfer content)", {
            amount: transferAmountNormalized,
            batchCodes: batchByAmount,
          });
        }
      }

      const transitionedOrderCodesToPaid = new Set();
      if (
        !orderCodes.length &&
        resolvedBatchCodes.length === 0 &&
        transferAmountNormalized > 0 &&
        !supplierSettlementTransfer
      ) {
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
          logger.warn("[Webhook] Fallback không tìm thấy đơn hàng phù hợp", {
            amount: transferAmountNormalized,
          });
        }
      } else if (!orderCodes.length && supplierSettlementTransfer) {
        logger.info("[Webhook] Skip amount-based fallback for supplier settlement transfer", {
          amount: transferAmountNormalized,
          content: transaction.transaction_content,
        });
      }

      const batchOrderMap = await resolveOrderCodesByBatchCodes(client, resolvedBatchCodes);
      const batchOrderAmountMap = await resolveBatchOrderAmountsByBatchCodes(
        client,
        resolvedBatchCodes,
        normalizeMoney
      );
      loopOrderCodes = buildWebhookLoopOrderCodes({
        orderCodesFromTransaction,
        orderCodes,
        batchOrderMap,
        orderCode,
        batchCodes: resolvedBatchCodes,
      });

      if (resolvedBatchCodes.length > 0) {
        logger.info("[Webhook] Resolve batch codes", {
          batchCodes: resolvedBatchCodes,
          expandedOrderCodes: loopOrderCodes,
          amountByOrder: Object.fromEntries(batchOrderAmountMap.entries()),
        });
      }

      if (loopOrderCodes.length > 1 && resolvedBatchCodes.length === 0) {
        logger.warn("[Webhook] Multiple orders in one receipt — split transfer amount", {
          receiptAmount: transferAmountNormalized,
          loopOrderCodes,
          resolvedByTransaction: orderCodesFromTransaction.length > 0,
        });
      }

      const getCurrentAmountForCode = createWebhookAmountForCodeResolver({
        batchCodes: resolvedBatchCodes,
        batchOrderAmountMap,
        loopOrderCodes,
        orderCodesFromTransaction,
        transferAmountNormalized,
      });

      for (const code of loopOrderCodes) {
        const stateRes = await client.query(
          `SELECT
            ${ORDER_COLS.id},
            ${ORDER_COLS.idOrder},
            ${ORDER_COLS.idProduct},
            ${ORDER_COLS.status},
            ${ORDER_COLS.expiryDate},
            ${ORDER_COLS.orderDate},
            ${ORDER_COLS.price},
            ${ORDER_COLS.grossSellingPrice},
            ${ORDER_COLS.cost},
            ${ORDER_COLS.idSupply},
            ${ORDER_COLS.customer},
            ${ORDER_COLS.contact},
            (
              SELECT COALESCE(SUM(rca.applied_amount)::numeric, 0)
              FROM ${REFUND_CREDIT_APPLICATIONS_TABLE} rca
              WHERE (
                (
                  rca.target_order_list_id IS NOT NULL
                  AND rca.target_order_list_id = ${ORDER_TABLE}.${ORDER_COLS.id}
                )
                OR (
                  rca.target_order_list_id IS NULL
                  AND LOWER(COALESCE(rca.target_order_code::text, '')) =
                    LOWER(${ORDER_TABLE}.${ORDER_COLS.idOrder}::text)
                  AND (
                    ${ORDER_TABLE}.${ORDER_COLS.createdAt} IS NULL
                    OR rca.applied_at IS NULL
                    OR rca.applied_at >= ${ORDER_TABLE}.${ORDER_COLS.createdAt}
                  )
                )
              )
            ) AS credit_applied_amount
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
      const resolvedOrderCode = resolvedBatchCodes[0] || loopOrderCodes[0] || orderCode;
      receiptResult = await insertPaymentReceipt(transaction, { client, orderCode: resolvedOrderCode });
      const receiptId = receiptResult?.id ?? receiptResult?.existingId ?? null;
      const receiptState = await getReceiptFinancialState(client, receiptId);
      const alreadyFinancialPosted = !!receiptState?.is_financial_posted;
      // Ưu tiên YYYY-MM-DD từ biên lai (khớp INSERT) để cùng tháng với `payment_receipt.paid_date`.
      const paidMonthKey =
        monthKeyFromPaidDateYmd(receiptResult?.paidDate) ||
        toMonthKey(transaction.transaction_date || transaction.transaction_date_raw || new Date());
      let postedRevenueDelta = 0;
      let postedProfitDelta = 0;
      let postedImportDelta = 0;
      let postedOffFlowBankReceiptDelta = 0;
      // Snapshot tài chính tháng TRƯỚC khi xử lý webhook + renewal — để cuối
      // luồng gửi 1 tin nhắn BIẾN ĐỘNG THÁNG tổng hợp.
      const financeSnapshotBefore = paidMonthKey && !alreadyFinancialPosted
        ? await fetchMonthlySummarySnapshot(client, paidMonthKey).catch(() => null)
        : null;

      if (receiptId && alreadyFinancialPosted) {
        await insertFinancialAuditLog(client, {
          payment_receipt_id: receiptId,
          order_code: String(resolvedOrderCode || "").trim(),
          rule_branch: "SKIP_DUPLICATE_OR_ALREADY_POSTED",
          delta: {
            duplicate: !!receiptResult?.duplicate,
            inserted: !!receiptResult?.inserted,
            is_financial_posted: true,
          },
          source: "webhook",
        });
      }

      if (!alreadyFinancialPosted && receiptResult?.inserted && transferAmountNormalized > 0) {
        logger.info("[Webhook][FinancialDebug] Credit shop bank ledger from receipt", {
          receiptId,
          monthKey: paidMonthKey,
          transferAmount: transferAmountNormalized,
        });

        try {
          await creditShopBankFromPaymentReceipt(client, {
            receiptId,
            receiverAccount:
              transaction.account_number || transaction.accountNumber || "",
            amount: transferAmountNormalized,
            note: transaction.note || transaction.description || null,
          });
        } catch (ledgerError) {
          logger.error("[Webhook][ShopBankLedger] credit from receipt failed", {
            receiptId,
            error: ledgerError.message,
            stack: ledgerError.stack,
          });
          throw ledgerError;
        }
      }

      // Chưa Thanh Toán → Đã Thanh Toán khi có biên lai.
      // MAVN: không đổi trạng thái đơn qua Sepay.
      // Cần Gia Hạn: renewal sau COMMIT (+ log khi cập nhật đơn trong renewal.js).
      if (!alreadyFinancialPosted && (receiptResult?.inserted || receiptResult?.duplicate)) {
        const codesToUpdate = loopOrderCodes;
        for (const code of codesToUpdate) {
          const currentAmountForCode = getCurrentAmountForCode(code);
          if (isMavnImportOrder({ id_order: code })) {
            logger.info("[Webhook] Skip status update for MAVN (nhập hàng)", {
              orderCode: code,
            });
            continue;
          }

          const state = stateByOrderCode.get(code);
          if (!state) continue;

          const statusValue = state[ORDER_COLS.status];

          // Đơn đã Đã Thanh Toán + biên lai mới: tiền vào NH không ghi DT/LN.
          if (
            receiptResult?.inserted &&
            currentAmountForCode > 0 &&
            statusValue === ORDER_STATUS.PAID
          ) {
            const extraVnd = normalizeMoney(currentAmountForCode);
            await incrementDashboardSummaryByDelta(client, paidMonthKey, {
              offFlowDelta: extraVnd,
              ordersDelta: 0,
              notify: false,
            });
            postedOffFlowBankReceiptDelta += extraVnd;
            if (receiptId) {
              await insertFinancialAuditLog(client, {
                payment_receipt_id: receiptId,
                order_code: code,
                rule_branch: "POST_PAID_ADDITIONAL_OFF_FLOW_BANK_RECEIPT",
                delta: {
                  posted_off_flow_bank_receipt: extraVnd,
                  month_key: paidMonthKey,
                },
                source: "webhook",
              });
            }
            try {
              await withSavepoint(client, "off_flow_credit_post_paid", async () => {
                await ensureOffFlowRefundCreditNote(client, {
                  paymentReceiptId: receiptId,
                  offFlowAmount: extraVnd,
                  monthKey: paidMonthKey,
                  customerName: state?.[ORDER_COLS.customer],
                  customerContact: state?.[ORDER_COLS.contact],
                  sourceOrderCode: code,
                  ruleBranch: "POST_PAID_ADDITIONAL_OFF_FLOW_BANK_RECEIPT",
                });
              });
            } catch (creditErr) {
              logger.warn("[Webhook] Không tạo credit ngoài luồng (biên thêm sau Đã TT)", {
                orderCode: code,
                receiptId,
                error: creditErr.message,
              });
            }
            logger.debug("[Webhook] Ghi nhận tiền NH ngoài luồng DT/LN (biên thêm sau Đã TT)", {
              orderCode: code,
              status: statusValue,
              amount: extraVnd,
            });
            continue;
          }

          const qrEligibility = getOrderQrPaymentEligibility(statusValue);
          if (!qrEligibility.canPayByQr && statusValue !== ORDER_STATUS.PROCESSING) {
            logger.info("[Webhook] Skip QR payment posting for locked order", {
              orderCode: code,
              status: statusValue,
              reason: qrEligibility.reason,
            });
            if (receiptId) {
              await insertFinancialAuditLog(client, {
                payment_receipt_id: receiptId,
                order_code: code,
                rule_branch: qrEligibility.auditBranch,
                delta: {
                  order_status: statusValue,
                  reason: qrEligibility.reason,
                },
                source: "webhook",
              });
            }
            continue;
          }

          let amountDecision = amountDecisionByOrderCode.get(code) || null;
          if (
            !amountDecision &&
            (
              statusValue === ORDER_STATUS.UNPAID ||
              statusValue === ORDER_STATUS.RENEWAL ||
              statusValue === ORDER_STATUS.PROCESSING
            )
          ) {
            const accumulatedAmount = await getAccumulatedReceiptAmount(
              client,
              code,
              state[ORDER_COLS.orderDate]
            );
            const orderPriceForWebhook = await resolveOrderPriceForWebhookMatch(
              client,
              code,
              state,
              statusValue
            );
            amountDecision = computeWebhookAmountDecision({
              orderPrice: orderPriceForWebhook,
              currentAmount: currentAmountForCode,
              accumulatedAmount,
              creditAppliedAmount: state.credit_applied_amount,
            });
            amountDecisionByOrderCode.set(code, amountDecision);
            logger.info("[Webhook][FinancialDebug] Computed payment decision", {
              receiptId,
              orderCode: code,
              orderStatus: statusValue,
              monthKey: paidMonthKey,
              webhookAmount: currentAmountForCode,
              orderPriceAtWebhook: amountDecision.orderPriceAtWebhook,
              creditedAmount: amountDecision.creditedAmount,
              recognizedRevenueCurrent: amountDecision.recognizedRevenueCurrent,
              offFlowCurrent: amountDecision.offFlowCurrent,
              complete: amountDecision.complete,
              branch: amountDecision.branch,
              webhookAmountFlow: amountDecision.webhookAmountFlow,
            });
          }

          const renewalEligibility = eligibilityByOrderCode.get(code);
          // RENEWAL + đủ tiền + trong cửa sổ gia hạn: renewal.js (sau COMMIT) mới ghi dashboard / đổi trạng thái.
          if (
            statusValue === ORDER_STATUS.RENEWAL &&
            renewalEligibility?.eligible &&
            amountDecision?.complete
          ) {
            continue;
          }

          if (
            statusValue === ORDER_STATUS.UNPAID ||
            statusValue === ORDER_STATUS.PROCESSING ||
            statusValue === ORDER_STATUS.RENEWAL
          ) {
            if (amountDecision && !amountDecision.complete) {
              if (receiptId) {
                await insertFinancialAuditLog(client, {
                  payment_receipt_id: receiptId,
                  order_code: code,
                  rule_branch: amountDecision.branch,
                  delta: {
                    received_current: amountDecision.receivedCurrent,
                    received_accumulated: amountDecision.receivedAccumulated,
                    credit_applied_amount: amountDecision.creditedAmount,
                    effective_received_current: amountDecision.effectiveReceivedCurrent,
                    effective_received_accumulated: amountDecision.effectiveReceivedAccumulated,
                    order_price_at_webhook: amountDecision.orderPriceAtWebhook,
                    required_min: amountDecision.requiredMin,
                    shortfall_amount: amountDecision.shortfallAmount,
                    max_accepted_shortfall: amountDecision.maxAcceptedShortfall,
                    recognized_revenue_current:
                      amountDecision.recognizedRevenueCurrent,
                    off_flow_current: amountDecision.offFlowCurrent,
                    webhook_amount_flow: amountDecision.webhookAmountFlow,
                    posted_revenue: 0,
                    posted_profit: 0,
                    installment_note:
                      "Chưa đủ thu — chờ bù tiền, chưa cộng DT/LN.",
                  },
                  source: "webhook",
                });
              }
              continue;
            }
            const nextStatus = ORDER_STATUS.PAID;
            const statusUpdateResult = await client.query(
              `UPDATE ${ORDER_TABLE}
               SET ${ORDER_COLS.status} = $2
               WHERE LOWER(${ORDER_COLS.idOrder}) = LOWER($1)
                 AND ${ORDER_COLS.status} = $3`,
              [code, nextStatus, statusValue]
            );
            if (statusUpdateResult.rowCount > 0) {
              const wireNow =
                amountDecision != null
                  ? resolveWebhookPostedRevenue(amountDecision)
                  : currentAmountForCode;
              const {
                revenue: rev,
                profit: prof,
                offFlow: flow,
                importDelta: imp,
              } = await postWebhookPaymentForOrder(client, {
                code,
                state,
                receiptId,
                paidMonthKey,
                revenueAmount: wireNow,
                ordersDelta: 1,
                ruleBranch:
                  statusValue === ORDER_STATUS.PROCESSING
                    ? "PROCESSING_TO_PAID_WEBHOOK_POST"
                    : statusValue === ORDER_STATUS.RENEWAL
                      ? amountDecision?.branch || "RENEWAL_TO_PAID_WEBHOOK_POST"
                      : amountDecision?.branch || "EXACT_OR_FULL_COMPLETE",
                amountDecision,
                profitPostingMode: "transition_to_paid",
                notify: false,
              });
              postedRevenueDelta += rev;
              postedProfitDelta += prof;
              postedImportDelta += imp;
              postedOffFlowBankReceiptDelta += flow;
              transitionedOrderCodesToPaid.add(code);
              logger.info("[Webhook][FinancialDebug] Posted order financial delta", {
                receiptId,
                orderCode: code,
                monthKey: paidMonthKey,
                webhookAmount: currentAmountForCode,
                creditedAmount: amountDecision?.creditedAmount ?? 0,
                recognizedRevenueCurrent:
                  amountDecision?.recognizedRevenueCurrent ?? rev,
                postedRevenueDelta: rev,
                postedProfitDelta: prof,
                postedImportDelta: imp,
                postedOffFlowDelta: flow,
                statusTransition: `${statusValue}->${nextStatus}`,
              });
            }
            logger.debug("[Webhook] Order status → Đã Thanh Toán", {
              orderCode: code,
              previousStatus: statusValue,
              nextStatus,
            });
          }
        }
      }

      if (
        !alreadyFinancialPosted &&
        (!loopOrderCodes.length && !orderCode) &&
        transferAmountNormalized > 0 &&
        !supplierSettlementTransfer
      ) {
        await incrementDashboardSummaryByDelta(client, paidMonthKey, {
          offFlowDelta: transferAmountNormalized,
          ordersDelta: 0,
          notify: false,
        });
        postedOffFlowBankReceiptDelta += transferAmountNormalized;
        if (receiptId) {
          await insertFinancialAuditLog(client, {
            payment_receipt_id: receiptId,
            order_code: "",
            rule_branch: "NO_ORDER_CODE_OFF_FLOW_BANK_RECEIPT",
            delta: {
              posted_off_flow_bank_receipt: transferAmountNormalized,
              month_key: paidMonthKey,
            },
            source: "webhook",
          });
        }
        try {
          await withSavepoint(client, "off_flow_credit_no_order", async () => {
            await ensureOffFlowRefundCreditNote(client, {
              paymentReceiptId: receiptId,
              offFlowAmount: transferAmountNormalized,
              monthKey: paidMonthKey,
              ruleBranch: "NO_ORDER_CODE_OFF_FLOW_BANK_RECEIPT",
              note: `Credit ngoài luồng — CK không mã đơn (biên lai #${receiptId || "NA"}).`,
            });
          });
        } catch (creditErr) {
          logger.warn("[Webhook] Không tạo credit ngoài luồng (không mã đơn)", {
            receiptId,
            error: creditErr.message,
          });
        }
      }
      if (
        !alreadyFinancialPosted &&
        (!loopOrderCodes.length && !orderCode) &&
        transferAmountNormalized > 0 &&
        (supplierSettlementTransfer || potentialSupplierRefundTransfer) &&
        receiptId &&
        !autoSupplierSettlement
      ) {
        await insertFinancialAuditLog(client, {
          payment_receipt_id: receiptId,
          order_code: "",
          rule_branch: "NO_ORDER_CODE_SUPPLIER_SETTLEMENT_SKIP",
          delta: {
            posted_revenue: 0,
            posted_profit: 0,
            month_key: paidMonthKey,
            content: String(transaction.transaction_content || ""),
          },
          source: "webhook",
        });
      } else if (autoSupplierSettlement && receiptId) {
        await insertFinancialAuditLog(client, {
          payment_receipt_id: receiptId,
          order_code: "",
          rule_branch: "NO_ORDER_CODE_SUPPLIER_SETTLEMENT_AUTO_MATCHED",
          delta: {
            supplier_id: autoSupplierSettlement.supplyId,
            expected_refund_amount: autoSupplierSettlement.expectedRefund,
            match_gap: autoSupplierSettlement.gap,
            month_key: paidMonthKey,
            content: String(transaction.transaction_content || ""),
          },
          source: "webhook",
        });
      }

      // ===== Tiền ra (transferAmountNormalized < 0) — ghi nhận biến động số dư bank =====
      if (
        !alreadyFinancialPosted &&
        receiptResult?.inserted &&
        transferAmountNormalized < 0 &&
        paidMonthKey
      ) {
        const outboundAmount = Math.abs(transferAmountNormalized);
        const contentRaw = String(transaction.transaction_content || "").trim();
        const senderAccount = transaction.account_number || transaction.accountNumber || "";

        let bankAccountId = null;
        try {
          bankAccountId = await findAccountIdByReceiver(client, senderAccount);
        } catch (e) {
          logger.warn("[Webhook] findAccountIdByReceiver failed", { error: e.message });
        }


        // Phân loại lý do tiền ra dựa trên nội dung chuyển khoản
        const contentLower = contentRaw.toLowerCase();
        const isSupplierPayment =
          /\btt\s+.+\s+k[yỳ]\s+\d/i.test(contentRaw) ||
          /nhap\s*hang|nhap\s*kho|thanh\s*toan\s*ncc|chuyen\s*tien\s*ncc|tt\s*ncc/i.test(contentLower);
        const outboundReason = isSupplierPayment
          ? "supplier_payment"
          : "withdrawal";
        const outboundReasonLabel = isSupplierPayment
          ? "Nhập hàng / Thanh toán NCC"
          : "Rút tiền / Chuyển ra";

        // Ghi nhận giao dịch tiền ra vào audit log (đối soát).
        // KHÔNG gọi debitShopBankExternalOut — các luồng nghiệp vụ (Thanh toán NCC,
        // chi phí shop, v.v.) đã trừ bank rồi. Webhook chỉ ghi nhận biên lai.

        if (receiptId) {
          await insertFinancialAuditLog(client, {
            payment_receipt_id: receiptId,
            order_code: "",
            rule_branch: "OUTBOUND_TRANSFER_BANK_BALANCE_DEBIT",
            delta: {
              bank_balance_delta: transferAmountNormalized,
              outbound_amount: outboundAmount,
              outbound_reason: outboundReason,
              outbound_reason_label: outboundReasonLabel,
              month_key: paidMonthKey,
              content: contentRaw,
            },
            source: "webhook",
          });
        }
        logger.info("[Webhook] Ghi nhận tiền ra — audit log", {
          receiptId,
          amount: transferAmountNormalized,
          outboundAmount,
          outboundReason,
          outboundReasonLabel,
          monthKey: paidMonthKey,
          content: contentRaw.slice(0, 120),
        });
      }

      if (receiptResult?.inserted) {
        const referenceImport =
          loopOrderCodes.length > 1 ? null : transferAmountNormalized;

        for (const code of loopOrderCodes) {
          const state = stateByOrderCode.get(code);
          const eligibility = eligibilityByOrderCode.get(code);
          const qrEligibility = getOrderQrPaymentEligibility(state?.[ORDER_COLS.status]);
          const isManualProcessingAwaitingWebhook =
            state?.[ORDER_COLS.status] === ORDER_STATUS.PROCESSING;

          if (!qrEligibility.canPayByQr && !isManualProcessingAwaitingWebhook) {
            logger.info("[Webhook] Skip supplier import for QR-locked order", {
              orderCode: code,
              status: state?.[ORDER_COLS.status],
              reason: qrEligibility.reason,
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

          // Avoid double supplier import updates for renewal flows.
          if (eligibility?.eligible) continue;

          const priorStatus = state?.[ORDER_COLS.status];
          if (
            priorStatus === ORDER_STATUS.PAID &&
            !transitionedOrderCodesToPaid.has(code)
          ) {
            const receiptN = await countPaymentReceiptsForOrderCode(client, code);
            if (receiptN > 1) {
              logger.info(
                "[Webhook] Skip payment_supply bump: order already PAID before this webhook; extra receipt (avoid double import)",
                { orderCode: code, receiptCount: receiptN }
              );
              continue;
            }
          }

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

      // Không gửi notify posting tại đây — defer xuống cuối để gom với renewal.
      if (receiptId) {
        if (
          !alreadyFinancialPosted &&
          (postedRevenueDelta !== 0 ||
            postedProfitDelta !== 0 ||
            postedOffFlowBankReceiptDelta !== 0)
        ) {
          await updateReceiptFinancialState(client, receiptId, {
            is_financial_posted: true,
            posted_revenue: postedRevenueDelta,
            posted_profit: postedProfitDelta,
            posted_off_flow_bank_receipt: postedOffFlowBankReceiptDelta,
          });
        } else if (!alreadyFinancialPosted) {
          await updateReceiptFinancialState(client, receiptId, {
            is_financial_posted: false,
            posted_revenue: 0,
            posted_profit: 0,
            posted_off_flow_bank_receipt: 0,
          });
          await insertFinancialAuditLog(client, {
            payment_receipt_id: receiptId,
            order_code: String(resolvedOrderCode || "").trim(),
            rule_branch: "WEBHOOK_STATE_NOT_POSTED",
            delta: {
              posted_revenue: 0,
              posted_profit: 0,
              posted_off_flow_bank_receipt: 0,
              is_financial_posted: false,
            },
            source: "webhook",
          });
        }
      }

      if (receiptId && resolvedBatchCodes.length > 0) {
        try {
          await client.query(
            `
              UPDATE ${PAYMENT_RECEIPT_BATCH_TABLE}
              SET status = 'paid',
                  paid_receipt_id = $1,
                  paid_at = COALESCE(paid_at, NOW()),
                  updated_at = NOW()
              WHERE UPPER(COALESCE(batch_code::text, '')) = ANY($2::text[])
                AND LOWER(COALESCE(status::text, 'pending')) <> 'cancelled'
            `,
            [receiptId, resolvedBatchCodes]
          );

          // Đồng bộ trạng thái item theo batch: khi batch đã paid thì item không nên giữ pending.
          await client.query(
            `
              UPDATE ${PAYMENT_RECEIPT_BATCH_ITEM_TABLE}
              SET status = 'paid'
              WHERE UPPER(COALESCE(batch_code::text, '')) = ANY($1::text[])
                AND LOWER(COALESCE(status::text, 'pending')) NOT IN ('paid', 'cancelled')
            `,
            [resolvedBatchCodes]
          );
        } catch (error) {
          if (isMissingBatchTablesError(error)) {
            logger.warn("[Webhook] Skip updating batch status: batch tables missing");
          } else {
            throw error;
          }
        }
      }

      await client.query("COMMIT");

      // Bắn event tiền vào / ra cho FinancialMetricsSubscriber (và các module khác)
      if (receiptResult?.inserted) {
        const eventBus = require("@/events/eventBus");
        const EVENTS = require("@/events/eventTypes");

        if (transferAmountNormalized > 0) {
          const hasEligibleRenewal = loopOrderCodes.some(code => eligibilityByOrderCode.get(code)?.eligible);
          eventBus.emit(EVENTS.SEPAY_MONEY_IN, {
            transactionId: transaction.transaction_id || transaction.id || null,
            amount: transferAmountNormalized,
            cost: postedImportDelta, // Cost từ vòng lặp được cộng dồn (importDelta)
            profit: postedProfitDelta,
            monthKey: paidMonthKey,
            orderCode: loopOrderCodes[0] || null, // Lấy mã đơn đầu tiên
            bankAccountId: transaction.account_number || transaction.accountNumber || null,
            isOrderPayment: loopOrderCodes.length > 0 && !hasEligibleRenewal,
            isRenewal: hasEligibleRenewal,
          });
        } else if (transferAmountNormalized < 0) {
          eventBus.emit(EVENTS.SEPAY_MONEY_OUT, {
            transactionId: transaction.transaction_id || transaction.id || null,
            amount: transferAmountNormalized,
            bankAccountId: transaction.account_number || transaction.accountNumber || null,
            reason: String(transaction.transaction_content || "").trim(),
          });
        }
      }

      // Gia hạn: sau COMMIT, vẫn dùng cùng client (trước release).
      try {
        await dispatchWebhookRenewals({
          client,
          loopOrderCodes,
          stateByOrderCode,
          amountDecisionByOrderCode,
          eligibilityByOrderCode,
          getCurrentAmountForCode,
          paidMonthKey,
          receiptId,
          ORDER_COLS,
        });
      } catch (renewErr) {
        logger.error("Renewal flow failed", { error: renewErr.message, stack: renewErr.stack });
      }

      // ===== Combined finance delta notify =====
      // Removed because financialMetricsSubscriber now handles notifications via EventBus (SEPAY_MONEY_IN)
      // and calling it here causes race conditions and missed notifications.
    } catch (dbErr) {
      await client.query("ROLLBACK");
      throw dbErr;
    } finally {
      client.release();
    }

    return { message: "OK" };
  } catch (err) {
    logger.error("Error saving payment", { error: err.message, stack: err.stack });
    throw err;
  }
}

module.exports = {
  handleWebhookPost,
  processWebhookTransactionAsync,
};
