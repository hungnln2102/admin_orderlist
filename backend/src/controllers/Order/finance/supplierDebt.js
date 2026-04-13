const { ORDERS_SCHEMA, SCHEMA_PARTNER, tableName } = require("../../../config/dbSchema");
const { resolveSupplierNameColumn } = require("../../SuppliesController/helpers");
const { STATUS, TABLES } = require("../constants");

const findSupplyIdByName = async(trx, supplyNameRaw) => {
    const supplyName = supplyNameRaw === undefined || supplyNameRaw === null
        ? ""
        : String(supplyNameRaw);
    if (!supplyName) return null;

    const supplierNameCol = await resolveSupplierNameColumn();
    const row = await trx(TABLES.supplier)
        .select("id")
        .where(supplierNameCol, supplyName)
        .first();
    return row && row.id !== undefined
        ? Number(row.id) || null
        : null;
};

/** @deprecated Giữ chữ ký; công nợ theo đơn nằm ở partner.supplier_order_cost_log (trigger). */
const increaseSupplierDebt = async() => {};

/** @deprecated */
const decreaseSupplierDebt = async() => {};

/** @deprecated */
const shiftPaidBackToImportForCancel = async() => {};

/**
 * Trước đây chỉnh supplier_payments khi hủy/hoàn theo ngày còn lại.
 * Giờ chỉ cập nhật partner.supplier_order_cost_log (trigger theo cost/refund/status).
 */
const adjustSupplierDebtIfNeeded = async() => {};

/**
 * Trước đây cộng total_amount khi vào Đang Xử Lý / đổi NCC.
 * Giờ trigger order_list ghi log; không đụng supplier_payments.
 */
const addSupplierImportOnProcessing = async() => {};

/**
 * Trước đây bút toán IMPORT→PAID trên chu kỳ supplier_payments khi ĐXL→Đã TT.
 * Giờ ncc_payment_status + số liệu log đủ cho theo dõi theo đơn.
 */
const recordSupplierPaymentOnCompletion = async() => {};

module.exports = {
    findSupplyIdByName,
    increaseSupplierDebt,
    decreaseSupplierDebt,
    shiftPaidBackToImportForCancel,
    adjustSupplierDebtIfNeeded,
    addSupplierImportOnProcessing,
    recordSupplierPaymentOnCompletion,
};
