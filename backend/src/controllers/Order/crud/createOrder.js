const { db } = require("../../../db");
const { TABLES, STATUS, COLS } = require("../constants");
const {
    normalizeOrderRow,
    sanitizeOrderWritePayload,
    ensureSupplyRecord,
    ensureSupplierCost,
    ensureVariantRecord,
    resolveProductToVariantId,
    normalizeTextInput,
} = require("../helpers");
const { todayYMDInVietnam } = require("../../../utils/normalizers");
const { ORDERS_SCHEMA, PARTNER_SCHEMA, PRODUCT_SCHEMA } = require("../../../config/dbSchema");
const { nextId } = require("../../../services/idService");
const { generateUniqueOrderCode, VALID_PREFIXES } = require("../../../services/orderCodeService");
const { sendOrderCreatedNotification } = require("../../../services/telegramOrderNotification");
const logger = require("../../../utils/logger");
const { ORDER_PREFIXES, isMavrykShopSupplierName } = require("../../../utils/orderHelpers");
const { supplierHasAccountHolderColumn } = require("../../../utils/supplierAccountHolderColumn");
const {
    lockRefundCreditNoteById,
    applyRefundCreditToTargetOrder,
    normalizeMoney,
} = require("../finance/refundCredits");
const { syncMavnStoreProfitExpense } = require("../orderFinanceHelpers");

/** Số còn phải thu (giá − credit) ≤ ngưỡng này coi như đủ; đơn tạo xong ở trạng thái Đã Thanh Toán, không cần QR. */
const CREDIT_BALANCE_TOLERANCE_VND = 5000;

const attachCreateOrderRoute = (router) => {
    router.post("/", async(req, res) => {
        logger.info("[POST] /api/orders");
        const payload = sanitizeOrderWritePayload(req.body);
        delete payload.id;

        if (Object.keys(payload).length === 0) return res.status(400).json({ error: "Empty payload" });

        const supplyIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;
        const productIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_PRODUCT;
        const idOrderCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_ORDER;
        const priceCol = ORDERS_SCHEMA.ORDER_LIST.COLS.PRICE;
        const costCol = ORDERS_SCHEMA.ORDER_LIST.COLS.COST;
        const grossSellingPriceCol = ORDERS_SCHEMA.ORDER_LIST.COLS.GROSS_SELLING_PRICE;
        const requestedCreditNoteId = Number(req.body?.refund_credit_note_id);
        const requestedCreditApplyAmount = normalizeMoney(req.body?.refund_credit_apply_amount);
        const requestedCreditSourceOrderCode = String(
            req.body?.refund_credit_source_order_code || ""
        ).trim();
        const requestedCreditCode = String(req.body?.refund_credit_code || "").trim();
        const reservedOrderCodeRaw = String(req.body?.reserved_order_code || "").trim().toUpperCase();
        const requestedPrefixFromReserved = VALID_PREFIXES.find((prefix) =>
            reservedOrderCodeRaw.startsWith(prefix)
        ) || null;

        if (payload[productIdCol] == null && req.body?.variant_id != null) {
            const numericVariant = Number(req.body.variant_id);
            if (Number.isFinite(numericVariant) && numericVariant > 0) {
                payload[productIdCol] = numericVariant;
            }
        }

        const rawSupplyName = req.body?.supply ?? payload.supply;
        if (rawSupplyName != null && rawSupplyName !== "") {
            const name = normalizeTextInput(String(rawSupplyName));
            if (name) {
                const resolvedId = await ensureSupplyRecord(name);
                payload[supplyIdCol] = resolvedId;
            }
            delete payload.supply;
        } else if (
            req.body?.id_supply != null ||
            req.body?.supply_id != null ||
            payload.id_supply != null ||
            payload.supply_id != null
        ) {
            payload[supplyIdCol] = Number(
                req.body?.id_supply ??
                req.body?.supply_id ??
                payload.id_supply ??
                payload.supply_id
            ) || null;
        }

        const rawProduct = payload[productIdCol];
        if (rawProduct != null) {
            const variantId = await resolveProductToVariantId(rawProduct);
            if (variantId != null) {
                payload[productIdCol] = variantId;
            } else if (typeof rawProduct === "string") {
                const trimmed = rawProduct.trim();
                if (trimmed) {
                    const newVariantId = await ensureVariantRecord(trimmed);
                    payload[productIdCol] = newVariantId;
                } else {
                    payload[productIdCol] = null;
                }
            } else {
                payload[productIdCol] = Number(rawProduct) || null;
            }
        }

        const provisionalIdOrder = String(payload[idOrderCol] || "").trim().toUpperCase();
        const requestedPrefixFromClient = VALID_PREFIXES.find((prefix) =>
            provisionalIdOrder.startsWith(prefix)
        ) || null;
        const effectivePrefix = requestedPrefixFromReserved || requestedPrefixFromClient || "MAVC";
        const giftPrefix = String(ORDER_PREFIXES.gift || "MAVT").toUpperCase();
        const importPrefix = String(ORDER_PREFIXES.import || "MAVN").toUpperCase();
        const isGiftOrderCreate = effectivePrefix === giftPrefix;
        const isMavnCreate = effectivePrefix === importPrefix;

        // Nhập hàng MAVN:
        // - NCC Mavryk/Shop: cost luôn = 0.
        // - NCC khác: cost = giá bán.
        // Tài chính MAVN được
        // tách theo NCC trong syncMavnStoreProfitExpense:
        // - NCC Mavryk/Shop: log external_import + trừ profit/bank.
        // - NCC khác: log NCC (trigger DB) + trừ profit, không trừ bank.
        // Đơn bán (MAVL/MAVC/MAVT/MAVK/MAVS) với NCC Mavryk/Shop nội bộ → cost = 0.
        let isInternalSupplier = false;
        if (payload[supplyIdCol] != null) {
            const supRow = await db(TABLES.supplier)
                .select(COLS.SUPPLIER.SUPPLIER_NAME)
                .where(COLS.SUPPLIER.ID, payload[supplyIdCol])
                .first();
            isInternalSupplier = isMavrykShopSupplierName(supRow?.[COLS.SUPPLIER.SUPPLIER_NAME]);
            if (!isMavnCreate && isInternalSupplier) {
                payload[costCol] = 0;
            }
        }
        if (isMavnCreate) {
            payload[costCol] = isInternalSupplier
                ? 0
                : normalizeMoney(payload[priceCol]);
        }

        if (isGiftOrderCreate) {
            payload[priceCol] = 0;
        }
        payload.status = (isGiftOrderCreate || isMavnCreate)
            ? STATUS.PAID
            : STATUS.UNPAID;

        const trx = await db.transaction();
        try {
            payload.id = await nextId(TABLES.orderList, COLS.ORDER.ID, trx);
            const rawPriceBeforeCredit = normalizeMoney(payload[priceCol]);
            payload[priceCol] = rawPriceBeforeCredit;

            let creditNoteForOrder = null;
            let appliedCreditAmount = 0;
            if (Number.isFinite(requestedCreditNoteId) && requestedCreditNoteId > 0) {
                creditNoteForOrder = await lockRefundCreditNoteById(trx, requestedCreditNoteId);
                if (creditNoteForOrder) {
                    const noteAvailable = normalizeMoney(creditNoteForOrder.available_amount);
                    let effectiveApplyRequest = requestedCreditApplyAmount;
                    if (
                        !Number.isFinite(effectiveApplyRequest) ||
                        effectiveApplyRequest <= 0
                    ) {
                        /** Không gửi số áp dụng → mặc định áp tối đa đủ trừ giá đơn (min(dư phiếu, giá)), và PAID khi dư ≥ giá. */
                        effectiveApplyRequest = Math.min(noteAvailable, rawPriceBeforeCredit);
                    }
                    appliedCreditAmount = Math.min(
                        effectiveApplyRequest,
                        rawPriceBeforeCredit,
                        noteAvailable
                    );
                }
            }

            const remainingToPay = Math.max(0, rawPriceBeforeCredit - appliedCreditAmount);
            payload[priceCol] = remainingToPay;
            if (appliedCreditAmount > 0) {
                payload[grossSellingPriceCol] = rawPriceBeforeCredit;
            }

            if (!isGiftOrderCreate && !isMavnCreate) {
                if (appliedCreditAmount > 0 && remainingToPay <= CREDIT_BALANCE_TOLERANCE_VND) {
                    payload.status = STATUS.PAID;
                    payload[priceCol] = 0;
                } else {
                    payload.status = STATUS.UNPAID;
                }
            }

            if (reservedOrderCodeRaw && requestedPrefixFromReserved) {
                const existingReserved = await trx(TABLES.orderList)
                    .where(idOrderCol, reservedOrderCodeRaw)
                    .first();
                payload[idOrderCol] = existingReserved
                    ? await generateUniqueOrderCode(effectivePrefix, trx)
                    : reservedOrderCodeRaw;
            } else {
                payload[idOrderCol] = await generateUniqueOrderCode(effectivePrefix, trx);
            }

            const [newOrder] = await trx(TABLES.orderList).insert(payload).returning("*");

            let applyRefundResult = null;
            let refundCreditApplication = null;
            if (creditNoteForOrder && appliedCreditAmount > 0) {
                const sourceOrderCodeForNote =
                    requestedCreditSourceOrderCode ||
                    String(creditNoteForOrder.source_order_code || "").trim();
                const creditCodeForNote =
                    requestedCreditCode ||
                    String(creditNoteForOrder.credit_code || "").trim();
                const creditApplicationNote = sourceOrderCodeForNote
                    ? `Áp credit tự động khi tạo đơn từ đơn hoàn ${sourceOrderCodeForNote}`
                    : (creditCodeForNote
                        ? `Áp credit tự động khi tạo đơn từ phiếu ${creditCodeForNote}`
                        : "Áp credit tự động khi tạo đơn");
                applyRefundResult = await applyRefundCreditToTargetOrder(trx, {
                    creditNoteId: Number(creditNoteForOrder.id),
                    targetOrderListId: Number(newOrder.id),
                    targetOrderCode: String(newOrder[idOrderCol] || ""),
                    requestedAmount: appliedCreditAmount,
                    note: creditApplicationNote,
                    appliedBy: "system-create-order",
                });
                refundCreditApplication = applyRefundResult.application;
            }

            if (isMavnCreate && newOrder.status === STATUS.PAID) {
                await syncMavnStoreProfitExpense(trx, null, newOrder);
            }

            await trx.commit();

            const resolvedVariantId = newOrder?.[productIdCol];
            const resolvedSupplyId = newOrder?.[supplyIdCol];
            const orderCost = Number(newOrder?.cost ?? payload.cost ?? 0);
            if (resolvedVariantId && resolvedSupplyId && orderCost > 0) {
                ensureSupplierCost(resolvedVariantId, resolvedSupplyId, orderCost).catch((error) => {
                    logger.error("[Order] Tạo supplier_cost thất bại", { error: error.message });
                });
            }

            const normalized = normalizeOrderRow(newOrder, todayYMDInVietnam());
            const supplyIdVal = newOrder?.[ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY];
            if (supplyIdVal != null) {
                const sCols = PARTNER_SCHEMA.SUPPLIER.COLS;
                const includeAccountHolder =
                    Boolean(sCols.ACCOUNT_HOLDER) &&
                    await supplierHasAccountHolderColumn(db, TABLES.supplier);
                const selectCols = [
                    sCols.SUPPLIER_NAME,
                    sCols.NUMBER_BANK,
                    sCols.BIN_BANK,
                ];
                if (includeAccountHolder) {
                    selectCols.push(sCols.ACCOUNT_HOLDER);
                }
                const supplier = await db(TABLES.supplier)
                    .select(...selectCols)
                    .where(sCols.ID, supplyIdVal)
                    .first();
                normalized.supply = supplier?.[sCols.SUPPLIER_NAME] ?? "";
                normalized.supplier_number_bank = supplier?.[sCols.NUMBER_BANK] ?? null;
                normalized.supplier_bin_bank = supplier?.[sCols.BIN_BANK] ?? null;
                normalized.supplier_account_holder = includeAccountHolder
                    ? (supplier?.[sCols.ACCOUNT_HOLDER] ?? null)
                    : null;
            }

            const variantIdVal = newOrder?.[productIdCol];
            if (variantIdVal != null && Number.isFinite(Number(variantIdVal))) {
                const variant = await db(TABLES.variant)
                    .select(PRODUCT_SCHEMA.VARIANT.COLS.DISPLAY_NAME, PRODUCT_SCHEMA.VARIANT.COLS.VARIANT_NAME)
                    .where(PRODUCT_SCHEMA.VARIANT.COLS.ID, variantIdVal)
                    .first();

                const displayName = variant?.[PRODUCT_SCHEMA.VARIANT.COLS.DISPLAY_NAME]
                    ?? variant?.[PRODUCT_SCHEMA.VARIANT.COLS.VARIANT_NAME];

                normalized.variant_id = Number(variantIdVal);
                if (displayName != null) {
                    normalized.product_display_name = displayName;
                    normalized.id_product = displayName;
                }
            }

            if (refundCreditApplication) {
                normalized.refund_credit_applied_amount = Number(refundCreditApplication.applied_amount || 0);
                const consumedNoteId = Number(refundCreditApplication.credit_note_id || 0);
                normalized.refund_credit_applied_from_note_id = consumedNoteId;
                if (applyRefundResult?.replacementCreditNote) {
                    const rep = applyRefundResult.replacementCreditNote;
                    normalized.refund_credit_replacement_note_id = Number(rep.id);
                    normalized.refund_credit_note_id = Number(rep.id);
                    normalized.refund_credit_code = String(rep.credit_code || "");
                } else {
                    normalized.refund_credit_note_id = consumedNoteId;
                    const cn = applyRefundResult?.creditNote;
                    if (cn?.credit_code) {
                        normalized.refund_credit_code = String(cn.credit_code);
                    }
                }
                normalized.price_before_credit = rawPriceBeforeCredit;
                if (newOrder && newOrder[grossSellingPriceCol] != null) {
                    normalized.gross_selling_price = Number(newOrder[grossSellingPriceCol]);
                } else {
                    normalized.gross_selling_price = rawPriceBeforeCredit;
                }
            }

            res.status(201).json(normalized);
            sendOrderCreatedNotification(normalized).catch((error) => {
                logger.error("[Order][Telegram] Notify failed", { error: error.message, stack: error.stack });
            });
        } catch (error) {
            await trx.rollback();
            logger.error("Create order failed", { error: error.message, stack: error.stack });
            res.status(500).json({ error: "Không thể tạo đơn hàng mới." });
        }
    });
};

module.exports = { attachCreateOrderRoute };
