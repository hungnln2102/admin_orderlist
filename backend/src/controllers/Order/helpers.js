const { normalizeTextInput } = require("./helpers/writePayload");
const { normalizeRawToYMD, normalizeOrderRow } = require("./helpers/normalize");
const { ORDER_WRITABLE_COLUMNS, sanitizeOrderWritePayload } = require("./helpers/writePayload");
const {
    ensureSupplyRecord,
    ensureSupplierCost,
    ensureVariantRecord,
    resolveProductToVariantId,
} = require("./helpers/catalog");

module.exports = {
    normalizeRawToYMD,
    normalizeOrderRow,
    ORDER_WRITABLE_COLUMNS,
    sanitizeOrderWritePayload,
    ensureSupplyRecord,
    ensureSupplierCost,
    ensureVariantRecord,
    resolveProductToVariantId,
    normalizeTextInput,
};
