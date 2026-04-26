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

/** Mã phiếu tách: unique, ≤ 80 ký tự (cột credit_code). */
const buildSplitReplacementCreditCode = (parent) => {
    const base = String(parent?.credit_code || "RFC").replace(/\s+/g, "").slice(0, 44);
    const parentId = Number(parent?.id) > 0 ? String(Number(parent.id)) : "0";
    const tail = `S${parentId}T${Date.now().toString(36).toUpperCase()}`;
    const out = `${base}-${tail}`;
    return out.length <= 80 ? out : out.slice(0, 80);
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
        return {
            appliedAmount: 0,
            creditNote: null,
            application: null,
            replacementCreditNote: null,
            voidedNote: null,
        };
    }
    if (String(creditNote.status || "").toUpperCase() === CREDIT_STATUS.VOID) {
        return {
            appliedAmount: 0,
            creditNote,
            application: null,
            replacementCreditNote: null,
            voidedNote: null,
        };
    }

    const availableAmount = normalizeMoney(creditNote.available_amount);
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
            credit_note_id: Number(creditNote.id),
            target_order_list_id: Number(targetOrderListId) || null,
            target_order_code: String(targetOrderCode || "").trim(),
            applied_amount: toApply,
            note: note ? String(note).trim() : null,
            applied_by: appliedBy ? String(appliedBy).trim() : null,
        })
        .returning("*");

    const parentId = Number(creditNote.id);
    let replacementCreditNote = null;
    let voidedNote = null;
    let activeForBalance = { ...creditNote };

    if (remainder > 0) {
        const newCode = buildSplitReplacementCreditCode(creditNote);
        const splitNote = `Tách số còn lại từ phiếu #${parentId} (${String(creditNote.credit_code || "")}) — đã dùng ${String(toApply)} VND (đơn ${String(targetOrderCode || "")}).`;
        const [inserted] = await trx(REFUND_CREDIT_NOTES_TABLE)
            .insert({
                credit_code: newCode,
                source_order_list_id: creditNote.source_order_list_id != null
                    ? Number(creditNote.source_order_list_id)
                    : null,
                source_order_code: String(creditNote.source_order_code || "").trim() || "RF-NA",
                customer_name: creditNote.customer_name,
                customer_contact: creditNote.customer_contact,
                refund_amount: remainder,
                available_amount: remainder,
                status: CREDIT_STATUS.OPEN,
                split_from_note_id: parentId,
                note: splitNote,
            })
            .returning("*");
        replacementCreditNote = inserted || null;

        if (replacementCreditNote) {
            const addendum = `Đã tách: phiếu còn dùng #${String(replacementCreditNote.id)} (${String(replacementCreditNote.credit_code || "")})`;
            const prev = creditNote.note ? String(creditNote.note).trim() : "";
            await trx(REFUND_CREDIT_NOTES_TABLE)
                .where({ id: parentId })
                .update({
                    status: CREDIT_STATUS.VOID,
                    available_amount: 0,
                    succeeded_by_note_id: Number(replacementCreditNote.id),
                    note: prev ? `${prev} — ${addendum}` : addendum,
                });
        }

        voidedNote = await trx(REFUND_CREDIT_NOTES_TABLE).where({ id: parentId }).first();
        activeForBalance = replacementCreditNote;
    } else {
        const refreshed = await trx(REFUND_CREDIT_NOTES_TABLE)
            .where({ id: parentId })
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

module.exports = {
    REFUND_CREDIT_NOTES_TABLE,
    REFUND_CREDIT_APPLICATIONS_TABLE,
    CREDIT_STATUS,
    normalizeMoney,
    buildRefundCreditCode,
    buildSplitReplacementCreditCode,
    getLatestRefundCreditNoteBySourceOrder,
    createOrGetRefundCreditNoteForOrder,
    lockRefundCreditNoteById,
    applyRefundCreditToTargetOrder,
};

