const { db } = require("@/db");
const { TABLES, STATUS, COLS } = require("@/domains/orders/controller/constants");
const { orderIdParam } = require("@/domains/orders/validators/orderValidator");
const logger = require("@/utils/logger");
const {
    parseRefundCreditLogsQuery,
    listRefundCreditLogs,
} = require("@/domains/orders/controller/queries/listRefundCreditLogs");
const {
    applyOffFlowCreditCashout,
} = require("@/domains/orders/controller/finance/offFlowRefundCredits");
const {
    createOrGetRefundCreditNoteForOrder,
    getLatestRefundCreditNoteBySourceOrder,
    normalizeMoney,
    CREDIT_STATUS,
    REFUND_CREDIT_NOTES_TABLE,
    REFUND_CREDIT_NOTE_COLS: RCN,
} = require("@/domains/orders/controller/finance/refundCredits");
const { generateUniqueOrderCode, VALID_PREFIXES } = require("@/services/orderCodeService");
const { ORDER_PREFIXES } = require("@/utils/orderHelpers");
const {
    findShopBankAccountById,
} = require("@/domains/shop-bank-accounts/repositories/shopBankAccountRepository");
const {
    debitShopBankRefundCashout,
} = require("@/domains/shop-bank-accounts/services/shopBankLedgerService");
const { writeUserEventLog } = require("@/domains/renew-adobe/services/systemEventLogService");
const {
    notifyFinanceMonthlyDelta,
} = require("@/services/telegramFinanceDeltaNotifier");
const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");

const detectPreviewPrefix = (orderCodeRaw) => {
    const normalized = String(orderCodeRaw || "").trim().toUpperCase();
    if (!normalized) return ORDER_PREFIXES.customer || "MAVL";
    return VALID_PREFIXES.find((prefix) => normalized.startsWith(prefix))
        || ORDER_PREFIXES.customer
        || "MAVL";
};

const CREDIT_ACTIONS = {
    DELETE: "delete",
    COMPLETE: "complete",
};

const normalizeCreditAction = (rawAction) => {
    const action = String(rawAction || "").trim().toLowerCase();
    if (action === CREDIT_ACTIONS.DELETE) return CREDIT_ACTIONS.DELETE;
    if (action === CREDIT_ACTIONS.COMPLETE) return CREDIT_ACTIONS.COMPLETE;
    return "";
};

const appendNote = (baseNote, suffix) => {
    const base = String(baseNote || "").trim();
    const next = String(suffix || "").trim();
    if (!next) return base || null;
    if (!base) return next;
    return `${base} — ${next}`;
};

const attachRefundCreditRoutes = (router) => {
    router.get("/refund-credits/logs", async (req, res) => {
        try {
            const params = parseRefundCreditLogsQuery(req.query || {});
            const payload = await listRefundCreditLogs(params);
            return res.json(payload);
        } catch (error) {
            logger.error("List refund credit logs failed", {
                error: error.message,
                stack: error.stack,
                query: req.query,
            });
            return res.status(500).json({ error: "Không thể tải credit logs." });
        }
    });

    /**
     * GET /api/orders/refund-credits/available
     * Phiếu credit **khả dụng** cho form tạo đơn: còn số dư, trạng thái OPEN/PARTIALLY_APPLIED,
     * không bị tuyến thay thế (succeeded_by), và nếu gắn đơn nguồn thì đơn nguồn vẫn ở trạng thái hoàn.
     */
    router.get("/refund-credits/available", async (req, res) => {
        try {
            const orderIdCol = COLS.ORDER.ID;
            const orderStatusCol = COLS.ORDER.STATUS;
            const orderTable = TABLES.orderList;
            const rcn = REFUND_CREDIT_NOTES_TABLE;

            const rows = await db(`${rcn} as rcn_row`)
                .leftJoin(
                    `${orderTable} as src_order`,
                    `src_order.${orderIdCol}`,
                    `rcn_row.${RCN.SOURCE_ORDER_LIST_ID}`
                )
                .where(`rcn_row.${RCN.AVAILABLE_AMOUNT}`, ">", 0)
                .whereIn(`rcn_row.${RCN.STATUS}`, [
                    CREDIT_STATUS.OPEN,
                    CREDIT_STATUS.PARTIALLY_APPLIED,
                ])
                .whereNull(`rcn_row.${RCN.SUCCEEDED_BY_NOTE_ID}`)
                .where((qb) => {
                    qb.whereNull(`rcn_row.${RCN.SOURCE_ORDER_LIST_ID}`).orWhereIn(
                        `src_order.${orderStatusCol}`,
                        [STATUS.PENDING_REFUND, STATUS.REFUNDED]
                    );
                })
                .orderBy(`rcn_row.${RCN.ID}`, "desc")
                .select(
                    `rcn_row.${RCN.ID} as ${RCN.ID}`,
                    `rcn_row.${RCN.CREDIT_CODE} as ${RCN.CREDIT_CODE}`,
                    `rcn_row.${RCN.CUSTOMER_NAME} as ${RCN.CUSTOMER_NAME}`,
                    `rcn_row.${RCN.CUSTOMER_CONTACT} as ${RCN.CUSTOMER_CONTACT}`,
                    `rcn_row.${RCN.AVAILABLE_AMOUNT} as ${RCN.AVAILABLE_AMOUNT}`,
                    `rcn_row.${RCN.REFUND_AMOUNT} as ${RCN.REFUND_AMOUNT}`,
                    `rcn_row.${RCN.SOURCE_ORDER_CODE} as ${RCN.SOURCE_ORDER_CODE}`,
                    `rcn_row.${RCN.SOURCE_ORDER_LIST_ID} as ${RCN.SOURCE_ORDER_LIST_ID}`,
                    `rcn_row.${RCN.STATUS} as ${RCN.STATUS}`
                );
            return res.json({ data: rows });
        } catch (error) {
            logger.error("List available refund credit notes failed", { error: error.message });
            return res.status(500).json({ error: "Không tải được danh sách credit." });
        }
    });

    router.post("/canceled/:id/refund-credit/ensure", ...orderIdParam, async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ error: "ID đơn không hợp lệ." });
        }

        const trx = await db.transaction();
        try {
            const order = await trx(TABLES.orderList)
                .where({ id })
                .first();

            if (!order) {
                await trx.rollback();
                return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
            }

            const orderStatus = String(order.status || "").trim();
            const allowedStatuses = [STATUS.PENDING_REFUND, STATUS.REFUNDED];
            if (!allowedStatuses.includes(orderStatus)) {
                await trx.rollback();
                return res.status(400).json({
                    error: "Chỉ đơn Chưa Hoàn/Đã Hoàn mới có thể tạo credit bù đơn.",
                });
            }

            const refundAmount = normalizeMoney(order.refund);
            if (refundAmount <= 0) {
                await trx.rollback();
                return res.status(400).json({
                    error: "Đơn không có số tiền hoàn hợp lệ để tạo credit.",
                });
            }

            let creditNote = await getLatestRefundCreditNoteBySourceOrder(trx, id);
            if (!creditNote) {
                creditNote = await createOrGetRefundCreditNoteForOrder(trx, {
                    sourceOrderListId: id,
                    sourceOrderCode: order.id_order,
                    customerName: order.customer,
                    customerContact: order.contact,
                    refundAmount,
                    note: `Tạo từ thao tác bù đơn cho đơn ${order.id_order || id}`,
                });
            }

            const previewPrefix = detectPreviewPrefix(order.id_order);
            const previewOrderCode = await generateUniqueOrderCode(previewPrefix, trx);

            await trx.commit();
            writeUserEventLog(req, {
                action: "Tạo credit bù đơn",
                entity: "Credit",
                entityId: creditNote?.[RCN.ID] || creditNote?.id || id,
                message: `Tạo credit bù đơn ${order.id_order || id}`,
                source: "orders.refund_credit_notes",
                metadata: {
                    orderId: id,
                    orderCode: order.id_order || null,
                    creditId: creditNote?.[RCN.ID] || creditNote?.id || null,
                    creditCode: creditNote?.[RCN.CREDIT_CODE] || creditNote?.credit_code || null,
                    refundAmount,
                },
            });
            return res.json({
                success: true,
                credit_note: creditNote,
                preview_order_code: previewOrderCode,
            });
        } catch (error) {
            await trx.rollback();
            logger.error("Lỗi ensure refund credit note", {
                id,
                error: error.message,
                stack: error.stack,
            });
            return res.status(500).json({ error: "Không thể khởi tạo credit bù đơn." });
        }
    });

    router.post("/refund-credits/:id/actions", async (req, res) => {
        const id = Number(req.params.id);
        const action = normalizeCreditAction(req.body?.action);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ error: "ID credit không hợp lệ." });
        }
        if (!action) {
            return res.status(400).json({ error: "Action không hợp lệ. Dùng delete hoặc complete." });
        }

        const rawShopBankAccountId = req.body?.shopBankAccountId ?? req.body?.shop_bank_account_id;
        const shopBankAccountId = Number(rawShopBankAccountId);
        const hasShopBankAccountId =
            rawShopBankAccountId !== undefined &&
            rawShopBankAccountId !== null &&
            rawShopBankAccountId !== "" &&
            Number.isFinite(shopBankAccountId) &&
            shopBankAccountId > 0;

        if (action === CREDIT_ACTIONS.COMPLETE && !hasShopBankAccountId) {
            return res.status(400).json({
                error: "Vui lòng chọn STK để trừ tiền hoàn trước khi xác nhận.",
            });
        }

        const trx = await db.transaction();
        try {
            const current = await trx(REFUND_CREDIT_NOTES_TABLE)
                .where({ [RCN.ID]: id })
                .forUpdate()
                .first();
            if (!current) {
                await trx.rollback();
                return res.status(404).json({ error: "Không tìm thấy credit log." });
            }

            const availableAmount = normalizeMoney(current?.[RCN.AVAILABLE_AMOUNT]);
            const currentStatus = String(current?.[RCN.STATUS] || "").trim().toUpperCase();
            const isAlreadyUnavailable =
                availableAmount <= 0 || [CREDIT_STATUS.FULLY_APPLIED, CREDIT_STATUS.VOID].includes(currentStatus);

            let nextNote = current?.[RCN.NOTE] ?? null;
            let cashoutAmount = 0;
            let cashoutAccount = null;

            if (action === CREDIT_ACTIONS.DELETE) {
                nextNote = appendNote(nextNote, "Ẩn credit khỏi danh sách khả dụng (thao tác Xóa).");
                // Trừ tiền ngoài luồng khi void credit off-flow thủ công.
                if (availableAmount > 0) {
                    const offFlowResult = await applyOffFlowCreditCashout(trx, current, availableAmount);
                    if (offFlowResult.applied) {
                        nextNote = appendNote(
                            nextNote,
                            `Đã trừ ${availableAmount.toLocaleString("vi-VN")} VND khỏi số tiền ngoài luồng (tháng ${offFlowResult.monthKey}).`
                        );
                    }
                }
            } else if (action === CREDIT_ACTIONS.COMPLETE) {
                cashoutAmount = Math.max(0, availableAmount);
                if (cashoutAmount <= 0) {
                    await trx.rollback();
                    return res.status(400).json({
                        error: "Credit không còn số dư khả dụng để hoàn.",
                    });
                }

                cashoutAccount = await findShopBankAccountById(shopBankAccountId);
                if (!cashoutAccount || cashoutAccount.isActive === false) {
                    await trx.rollback();
                    return res.status(400).json({
                        error: "STK không hợp lệ hoặc đang bị tắt.",
                    });
                }

                const accountLabel =
                    String(cashoutAccount.label || "").trim() ||
                    String(cashoutAccount.accountNumber || "").trim() ||
                    `STK ${cashoutAccount.id}`;
                nextNote = appendNote(
                    nextNote,
                    `Đã hoàn tiền theo credit (thao tác Đã Hoàn) — trừ ${accountLabel}.`
                );

                const creditCode = String(current?.[RCN.CREDIT_CODE] || "").trim();
                const ledgerResult = await debitShopBankRefundCashout(trx, {
                    accountId: Number(cashoutAccount.id),
                    amount: cashoutAmount,
                    sourceId: id,
                    note: `Hoàn tiền credit ${creditCode || `#${id}`} — ${accountLabel}`,
                });
                if (!ledgerResult || ledgerResult.skipped) {
                    logger.warn("Refund cashout ledger skipped", {
                        creditId: id,
                        reason: ledgerResult?.reason || "unknown",
                    });
                } else {
                    const cashoutMonthKey = new Date().toISOString().slice(0, 7);
                    await notifyFinanceMonthlyDelta({
                        monthKey: cashoutMonthKey,
                        bankBalanceDelta: -cashoutAmount,
                        context: `orders.refundCreditCashout credit=${creditCode || `#${id}`}`,
                        executor: trx,
                    });
                }

                const offFlowResult = await applyOffFlowCreditCashout(trx, current, cashoutAmount);
                if (offFlowResult.applied) {
                    nextNote = appendNote(
                        nextNote,
                        `Đã trừ ${cashoutAmount.toLocaleString("vi-VN")} VND khỏi số tiền ngoài luồng (tháng ${offFlowResult.monthKey}).`
                    );
                }
            }

            if (!isAlreadyUnavailable || action === CREDIT_ACTIONS.COMPLETE) {
                const updatePayload = {
                    [RCN.STATUS]: CREDIT_STATUS.VOID,
                    [RCN.AVAILABLE_AMOUNT]: 0,
                    [RCN.NOTE]: nextNote,
                };
                if (action === CREDIT_ACTIONS.COMPLETE) {
                    updatePayload[RCN.REFUNDED_CASHOUT_AT] = db.fn.now();
                }

                await trx(REFUND_CREDIT_NOTES_TABLE)
                    .where({ [RCN.ID]: id })
                    .update(updatePayload);
            }

            const updated = await trx(REFUND_CREDIT_NOTES_TABLE)
                .where({ [RCN.ID]: id })
                .first();
            await trx.commit();
            writeUserEventLog(req, {
                action: action === CREDIT_ACTIONS.COMPLETE ? "Xác nhận hoàn credit" : "Xóa credit",
                entity: "Credit",
                entityId: id,
                message: `${action === CREDIT_ACTIONS.COMPLETE ? "Xác nhận hoàn credit" : "Xóa credit"} ${current?.[RCN.CREDIT_CODE] || `#${id}`}`,
                source: "orders.refund_credit_notes",
                metadata: {
                    creditId: id,
                    creditCode: current?.[RCN.CREDIT_CODE] || null,
                    action,
                    availableAmount,
                    cashoutAmount,
                    shopBankAccountId: hasShopBankAccountId ? shopBankAccountId : null,
                },
            });

            eventBus.emit(EVENTS.REFUND_CREDIT_UPDATED, {
                creditId: id,
                creditCode: current?.[RCN.CREDIT_CODE] || null,
                action,
                before: current,
                after: updated,
                availableAmount,
                cashoutAmount,
                shopBankAccountId: hasShopBankAccountId ? shopBankAccountId : null,
                source: "orders.refundCreditAction",
            });

            return res.json({
                success: true,
                item: {
                    id: Number(updated?.[RCN.ID] || id),
                    status: updated?.[RCN.REFUNDED_CASHOUT_AT]
                        ? "REFUNDED"
                        : String(updated?.[RCN.STATUS] || "").toUpperCase(),
                    available_amount: normalizeMoney(updated?.[RCN.AVAILABLE_AMOUNT]),
                    note: updated?.[RCN.NOTE] != null ? String(updated[RCN.NOTE]) : null,
                    refunded_cashout_at: updated?.[RCN.REFUNDED_CASHOUT_AT]
                        ? String(updated[RCN.REFUNDED_CASHOUT_AT])
                        : null,
                    updated_at: updated?.[RCN.UPDATED_AT] ? String(updated[RCN.UPDATED_AT]) : null,
                },
            });
        } catch (error) {
            await trx.rollback();
            logger.error("Update refund credit action failed", {
                id,
                action,
                error: error.message,
                stack: error.stack,
            });
            return res.status(500).json({ error: "Không thể cập nhật credit log." });
        }
    });
};

module.exports = { attachRefundCreditRoutes };

