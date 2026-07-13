const { db } = require("../../../db");
const { STATUS, COLS } = require("../controller/constants");
const { todayYMDInVietnam } = require("../../../utils/normalizers");
const { ORDERS_SCHEMA, PARTNER_SCHEMA, PRODUCT_SCHEMA, TABLES } = require("../../../config/dbSchema");
const { generateUniqueOrderCode } = require("../../../services/orderCodeService");
const { lockRefundCreditNoteById, applyRefundCreditToTargetOrder } = require("../controller/finance/refundCredits");
const { allocateCreateOrderPayment, resolveRefundCreditAllocation } = require("../controller/crud/create-order/createOrderPaymentAllocation");
const { insertOrder, generateNextOrderId } = require("../repositories/orderRepository");
const { eventBus, EVENTS } = require("../../../events");


const executeCreateOrder = async ({
    payload,
    requestedCreditNoteId,
    requestedCreditApplyAmount,
    requestedCreditSourceOrderCode,
    requestedCreditCode,
    reservedOrderCodeRaw,
    requestedPrefixFromReserved,
    isUsdtPayment,
    effectivePrefix,
    isGiftOrderCreate,
    isMavnCreate,
}) => {
    const supplyIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_SUPPLY;
    const productIdCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_PRODUCT;
    const idOrderCol = ORDERS_SCHEMA.ORDER_LIST.COLS.ID_ORDER;
    const costCol = ORDERS_SCHEMA.ORDER_LIST.COLS.COST;
    const grossSellingPriceCol = ORDERS_SCHEMA.ORDER_LIST.COLS.GROSS_SELLING_PRICE;

    const trx = await db.transaction();
    try {
        payload.id = await generateNextOrderId(COLS.ORDER.ID, trx);
        let creditNoteForOrder = null;
        if (Number.isFinite(requestedCreditNoteId) && requestedCreditNoteId > 0) {
            creditNoteForOrder = await lockRefundCreditNoteById(trx, requestedCreditNoteId);
        }

        const {
            rawPriceBeforeCredit,
            appliedCreditAmount,
        } = await resolveRefundCreditAllocation({
            trx,
            payload,
            creditNoteForOrder,
            requestedCreditApplyAmount,
            isGiftOrderCreate,
            isMavnCreate,
        });

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

        await allocateCreateOrderPayment({
            trx,
            payload,
            isUsdtPayment,
            idOrderCol,
        });

        const newOrder = await insertOrder(payload, trx);

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


        await trx.commit();

        try {
            eventBus.emit(EVENTS.ORDER_CREATED, newOrder);
        } catch (eventErr) {
            console.error("[EventBus] Lỗi khi phát sự kiện ORDER_CREATED", eventErr);
        }
        return {
            newOrder,
            refundCreditApplication,
            applyRefundResult,
            rawPriceBeforeCredit,
        };
    } catch (error) {
        await trx.rollback();
        throw error;
    }
};

module.exports = { executeCreateOrder };
