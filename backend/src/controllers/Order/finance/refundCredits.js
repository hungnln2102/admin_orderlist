/**
 * Credit hoàn **khách** (customer): `receipt.refund_credit_notes` + `receipt.refund_credit_applications`.
 * Dùng khi đơn nguồn chuyển hoàn và cần số dư credit áp cho đơn mới / thanh toán còn lại.
 *
 * Phân biệt SoT:
 * - `orders.order_list.refund` — snapshot **tiền hoàn khách** (UI / prorata ngày), không phải công nợ NCC.
 * - `partner.supplier_order_cost_log.refund_amount` — hoàn **NCC** (cost prorata), do trigger log cost.
 * - Bảng trong module này — **credit khách** (ledger), không thay thế hai nguồn trên.
 */
const {
    RECEIPT_SCHEMA,
    SCHEMA_RECEIPT,
    tableName,
} = require("../../../config/dbSchema");

const R = RECEIPT_SCHEMA.REFUND_CREDIT_NOTES.COLS;
const A = RECEIPT_SCHEMA.REFUND_CREDIT_APPLICATIONS.COLS;

const REFUND_CREDIT_NOTES_TABLE = tableName(
    RECEIPT_SCHEMA.REFUND_CREDIT_NOTES.TABLE,
    SCHEMA_RECEIPT
);
const REFUND_CREDIT_APPLICATIONS_TABLE = tableName(
    RECEIPT_SCHEMA.REFUND_CREDIT_APPLICATIONS.TABLE,
    SCHEMA_RECEIPT
);

/** Trạng thái phiếu (CHECK DB). `FULLY_APPLIED` = phiếu đã dùng hết số dư («used»). */
const CREDIT_STATUS = {
    OPEN: "OPEN",
    PARTIALLY_APPLIED: "PARTIALLY_APPLIED",
    FULLY_APPLIED: "FULLY_APPLIED",
    VOID: "VOID",
};

const normalizeMoney = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.round(numeric));
};

const normalizeCodeToken = (value) =>
    String(value || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace(/[^A-Z0-9_-]/g, "");

const buildRefundCreditCode = ({ sourceOrderCode, sourceOrderListId }) => {
    const codeToken = normalizeCodeToken(sourceOrderCode) || "ORDER";
    const idToken = Number(sourceOrderListId) > 0 ? String(Number(sourceOrderListId)) : "NA";
    return `RFC-${codeToken}-${idToken}`;
};

/** Mã phiếu tách: unique, ≤ 80 ký tự (cột credit_code). */
const buildSplitReplacementCreditCode = (parent) => {
    const base = String(parent?.[R.CREDIT_CODE] || "RFC").replace(/\s+/g, "").slice(0, 44);
    const parentId = Number(parent?.[R.ID]) > 0 ? String(Number(parent[R.ID])) : "0";
    const tail = `S${parentId}T${Date.now().toString(36).toUpperCase()}`;
    const out = `${base}-${tail}`;
    return out.length <= 80 ? out : out.slice(0, 80);
};

const getLatestRefundCreditNoteBySourceOrder = async (trx, sourceOrderListId) => {
    if (!Number.isFinite(Number(sourceOrderListId)) || Number(sourceOrderListId) <= 0) {
        return null;
    }
    return trx(REFUND_CREDIT_NOTES_TABLE)
        .where({ [R.SOURCE_ORDER_LIST_ID]: Number(sourceOrderListId) })
        .whereNot(R.STATUS, CREDIT_STATUS.VOID)
        .orderBy(R.ID, "desc")
        .first();
};

const createOrGetRefundCreditNoteForOrder = async (
    trx,
    {
        sourceOrderListId,
        sourceOrderCode,
        customerName,
        customerContact,
        refundAmount,
        note,
    }
) => {
    const normalizedRefundAmount = normalizeMoney(refundAmount);
    if (normalizedRefundAmount <= 0) return null;

    const existing = await getLatestRefundCreditNoteBySourceOrder(trx, sourceOrderListId);
    if (existing) return existing;

    const creditCode = buildRefundCreditCode({
        sourceOrderCode,
        sourceOrderListId,
    });

    const payload = {
        [R.CREDIT_CODE]: creditCode,
        [R.SOURCE_ORDER_LIST_ID]: Number(sourceOrderListId) || null,
        [R.SOURCE_ORDER_CODE]: String(sourceOrderCode || "").trim() || `RF-${Number(sourceOrderListId) || "NA"}`,
        [R.CUSTOMER_NAME]: customerName ? String(customerName).trim() : null,
        [R.CUSTOMER_CONTACT]: customerContact ? String(customerContact).trim() : null,
        [R.REFUND_AMOUNT]: normalizedRefundAmount,
        [R.AVAILABLE_AMOUNT]: normalizedRefundAmount,
        [R.STATUS]: CREDIT_STATUS.OPEN,
        [R.NOTE]: note ? String(note).trim() : null,
    };

    const [inserted] = await trx(REFUND_CREDIT_NOTES_TABLE).insert(payload).returning("*");
    return inserted || null;
};

const lockRefundCreditNoteById = async (trx, creditNoteId) => {
    const normalizedId = Number(creditNoteId);
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) return null;
    return trx(REFUND_CREDIT_NOTES_TABLE)
        .where({ [R.ID]: normalizedId })
        .forUpdate()
        .first();
};

/**
 * Ghi `refund_credit_applications` và cập nhật phiếu (trigger `fn_recompute_refund_credit_note_balance`):
 * OPEN / PARTIALLY_APPLIED / FULLY_APPLIED. Nếu số dư phiếu > phần áp cho đơn → tách phiếu mới (OPEN), phiếu cũ VOID.
 */
const applyRefundCreditToTargetOrder = async (
    trx,
    {
        creditNoteId,
        targetOrderListId,
        targetOrderCode,
        requestedAmount,
        note,
        appliedBy,
    }
) => {
    const creditNote = await lockRefundCreditNoteById(trx, creditNoteId);
    if (!creditNote) {
        return {
            appliedAmount: 0,
            creditNote: null,
            application: null,
            replacementCreditNote: null,
            voidedNote: null,
        };
    }
    if (String(creditNote[R.STATUS] || "").toUpperCase() === CREDIT_STATUS.VOID) {
        return {
            appliedAmount: 0,
            creditNote,
            application: null,
            replacementCreditNote: null,
            voidedNote: null,
        };
    }

    const availableAmount = normalizeMoney(creditNote[R.AVAILABLE_AMOUNT]);
    const toApply = Math.min(availableAmount, normalizeMoney(requestedAmount));
    if (toApply <= 0) {
        return {
            appliedAmount: 0,
            creditNote,
            application: null,
            replacementCreditNote: null,
            voidedNote: null,
        };
    }

    const remainder = Math.max(0, availableAmount - toApply);

    const [application] = await trx(REFUND_CREDIT_APPLICATIONS_TABLE)
        .insert({
            [A.CREDIT_NOTE_ID]: Number(creditNote[R.ID]),
            [A.TARGET_ORDER_LIST_ID]: Number(targetOrderListId) || null,
            [A.TARGET_ORDER_CODE]: String(targetOrderCode || "").trim(),
            [A.APPLIED_AMOUNT]: toApply,
            [A.NOTE]: note ? String(note).trim() : null,
            [A.APPLIED_BY]: appliedBy ? String(appliedBy).trim() : null,
        })
        .returning("*");

    const parentId = Number(creditNote[R.ID]);
    let replacementCreditNote = null;
    let voidedNote = null;
    let activeForBalance = { ...creditNote };

    if (remainder > 0) {
        const newCode = buildSplitReplacementCreditCode(creditNote);
        const splitNote = `Tách số còn lại từ phiếu #${parentId} (${String(creditNote[R.CREDIT_CODE] || "")}) — đã dùng ${String(toApply)} VND (đơn ${String(targetOrderCode || "")}).`;
        const [inserted] = await trx(REFUND_CREDIT_NOTES_TABLE)
            .insert({
                [R.CREDIT_CODE]: newCode,
                [R.SOURCE_ORDER_LIST_ID]: creditNote[R.SOURCE_ORDER_LIST_ID] != null
                    ? Number(creditNote[R.SOURCE_ORDER_LIST_ID])
                    : null,
                [R.SOURCE_ORDER_CODE]: String(creditNote[R.SOURCE_ORDER_CODE] || "").trim() || "RF-NA",
                [R.CUSTOMER_NAME]: creditNote[R.CUSTOMER_NAME],
                [R.CUSTOMER_CONTACT]: creditNote[R.CUSTOMER_CONTACT],
                [R.REFUND_AMOUNT]: remainder,
                [R.AVAILABLE_AMOUNT]: remainder,
                [R.STATUS]: CREDIT_STATUS.OPEN,
                [R.SPLIT_FROM_NOTE_ID]: parentId,
                [R.NOTE]: splitNote,
            })
            .returning("*");
        replacementCreditNote = inserted || null;

        if (replacementCreditNote) {
            const addendum = `Đã tách: phiếu còn dùng #${String(replacementCreditNote[R.ID])} (${String(replacementCreditNote[R.CREDIT_CODE] || "")})`;
            const prev = creditNote[R.NOTE] ? String(creditNote[R.NOTE]).trim() : "";
            await trx(REFUND_CREDIT_NOTES_TABLE)
                .where({ [R.ID]: parentId })
                .update({
                    [R.STATUS]: CREDIT_STATUS.VOID,
                    [R.AVAILABLE_AMOUNT]: 0,
                    [R.SUCCEEDED_BY_NOTE_ID]: Number(replacementCreditNote[R.ID]),
                    [R.NOTE]: prev ? `${prev} — ${addendum}` : addendum,
                });
        }

        voidedNote = await trx(REFUND_CREDIT_NOTES_TABLE).where({ [R.ID]: parentId }).first();
        activeForBalance = replacementCreditNote;
    } else {
        const refreshed = await trx(REFUND_CREDIT_NOTES_TABLE)
            .where({ [R.ID]: parentId })
            .first();
        activeForBalance = refreshed || activeForBalance;
    }

    return {
        appliedAmount: toApply,
        /** Phiếu còn hợp lệ cho số dư: mới tạo nếu tách, không thì cập nhật từ trigger. */
        creditNote: activeForBalance,
        application: application || null,
        replacementCreditNote: replacementCreditNote,
        voidedNote,
    };
};

/**
 * Khi đơn nguồn được xác nhận hoàn tiền chuyển khoản (không còn dùng credit offset):
 * hủy mọi phiếu credit còn số dư gắn đơn nguồn này để không còn trong danh sách khả dụng.
 */
const voidOpenRefundCreditNotesForSourceOrder = async (
    trx,
    sourceOrderListId,
    reasonSuffix
) => {
    const sid = Number(sourceOrderListId);
    if (!Number.isFinite(sid) || sid <= 0) return { voided: 0 };

    const suffix =
        reasonSuffix && String(reasonSuffix).trim()
            ? String(reasonSuffix).trim()
            : "Xác nhận hoàn tiền chuyển khoản — hủy số dư credit (không còn khả dụng).";

    const rows = await trx(REFUND_CREDIT_NOTES_TABLE)
        .where({ [R.SOURCE_ORDER_LIST_ID]: sid })
        .whereIn(R.STATUS, [CREDIT_STATUS.OPEN, CREDIT_STATUS.PARTIALLY_APPLIED])
        .where(R.AVAILABLE_AMOUNT, ">", 0)
        .select(R.ID, R.NOTE);

    let voided = 0;
    for (const row of rows || []) {
        const prev = row?.[R.NOTE] ? String(row[R.NOTE]).trim() : "";
        const note = prev ? `${prev} — ${suffix}` : suffix;
        const n = await trx(REFUND_CREDIT_NOTES_TABLE)
            .where({ [R.ID]: row[R.ID] })
            .update({
                [R.STATUS]: CREDIT_STATUS.VOID,
                [R.AVAILABLE_AMOUNT]: 0,
                [R.NOTE]: note,
            });
        voided += typeof n === "number" ? n : 0;
    }
    return { voided };
};

module.exports = {
    REFUND_CREDIT_NOTES_TABLE,
    REFUND_CREDIT_APPLICATIONS_TABLE,
    REFUND_CREDIT_NOTE_COLS: R,
    REFUND_CREDIT_APPLICATION_COLS: A,
    CREDIT_STATUS,
    normalizeMoney,
    buildRefundCreditCode,
    buildSplitReplacementCreditCode,
    getLatestRefundCreditNoteBySourceOrder,
    createOrGetRefundCreditNoteForOrder,
    lockRefundCreditNoteById,
    applyRefundCreditToTargetOrder,
    voidOpenRefundCreditNotesForSourceOrder,
};
