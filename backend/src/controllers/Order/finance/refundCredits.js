const {
    SCHEMA_RECEIPT,
    tableName,
} = require("../../../config/dbSchema");

const REFUND_CREDIT_NOTES_TABLE = tableName("refund_credit_notes", SCHEMA_RECEIPT);
const REFUND_CREDIT_APPLICATIONS_TABLE = tableName("refund_credit_applications", SCHEMA_RECEIPT);

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

const getLatestRefundCreditNoteBySourceOrder = async (trx, sourceOrderListId) => {
    if (!Number.isFinite(Number(sourceOrderListId)) || Number(sourceOrderListId) <= 0) {
        return null;
    }
    return trx(REFUND_CREDIT_NOTES_TABLE)
        .where({ source_order_list_id: Number(sourceOrderListId) })
        .whereNot("status", CREDIT_STATUS.VOID)
        .orderBy("id", "desc")
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
        credit_code: creditCode,
        source_order_list_id: Number(sourceOrderListId) || null,
        source_order_code: String(sourceOrderCode || "").trim() || `RF-${Number(sourceOrderListId) || "NA"}`,
        customer_name: customerName ? String(customerName).trim() : null,
        customer_contact: customerContact ? String(customerContact).trim() : null,
        refund_amount: normalizedRefundAmount,
        available_amount: normalizedRefundAmount,
        status: CREDIT_STATUS.OPEN,
        note: note ? String(note).trim() : null,
    };

    const [inserted] = await trx(REFUND_CREDIT_NOTES_TABLE).insert(payload).returning("*");
    return inserted || null;
};

const lockRefundCreditNoteById = async (trx, creditNoteId) => {
    const normalizedId = Number(creditNoteId);
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) return null;
    return trx(REFUND_CREDIT_NOTES_TABLE)
        .where({ id: normalizedId })
        .forUpdate()
        .first();
};

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
        return { appliedAmount: 0, creditNote: null, application: null };
    }
    if (String(creditNote.status || "").toUpperCase() === CREDIT_STATUS.VOID) {
        return { appliedAmount: 0, creditNote, application: null };
    }

    const availableAmount = normalizeMoney(creditNote.available_amount);
    const toApply = Math.min(availableAmount, normalizeMoney(requestedAmount));
    if (toApply <= 0) {
        return { appliedAmount: 0, creditNote, application: null };
    }

    const [application] = await trx(REFUND_CREDIT_APPLICATIONS_TABLE)
        .insert({
            credit_note_id: Number(creditNote.id),
            target_order_list_id: Number(targetOrderListId) || null,
            target_order_code: String(targetOrderCode || "").trim(),
            applied_amount: toApply,
            note: note ? String(note).trim() : null,
            applied_by: appliedBy ? String(appliedBy).trim() : null,
        })
        .returning("*");

    const refreshedCreditNote = await trx(REFUND_CREDIT_NOTES_TABLE)
        .where({ id: Number(creditNote.id) })
        .first();

    return {
        appliedAmount: toApply,
        creditNote: refreshedCreditNote || creditNote,
        application: application || null,
    };
};

module.exports = {
    REFUND_CREDIT_NOTES_TABLE,
    REFUND_CREDIT_APPLICATIONS_TABLE,
    CREDIT_STATUS,
    normalizeMoney,
    buildRefundCreditCode,
    getLatestRefundCreditNoteBySourceOrder,
    createOrGetRefundCreditNoteForOrder,
    lockRefundCreditNoteById,
    applyRefundCreditToTargetOrder,
};

