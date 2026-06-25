const { db } = require("../../../../db");
const { TABLES, STATUS } = require("../constants");
const {
    normalizeOrderRow,
    sanitizeOrderWritePayload,
    normalizeTextInput,
} = require("../helpers");
const { todayYMDInVietnam } = require("../../../../utils/normalizers");
const { updateOrderWithFinance } = require("../orderUpdateService");
const logger = require("../../../../utils/logger");
const { orderIdParam } = require("../../validators/orderValidator");
const { writeUserEventLog } = require("../../../renew-adobe/services/systemEventLogService");
const { ensureSupplierRecord } = require("../../../supplies/services/supplierLookupService");

const AUDIT_FIELD_LABELS = {
    customer: "Khách hàng",
    contact: "Liên hệ",
    email: "Email",
    phone: "Số điện thoại",
    status: "Trạng thái",
    price: "Giá bán",
    cost: "Giá NCC",
    refund: "Tiền hoàn",
    order_date: "Ngày đặt",
    order_date_raw: "Ngày đặt",
    expiry_date: "Ngày hết hạn",
    expired_at: "Ngày hết hạn",
    expiry_date_raw: "Ngày hết hạn",
    id_product: "Sản phẩm",
    variant_id: "Sản phẩm",
    product_display_name: "Sản phẩm",
    supply: "NCC",
    id_supply: "NCC",
    supply_id: "NCC",
    payment_method: "Phương thức thanh toán",
    note: "Ghi chú",
};

const AUDIT_FIELD_ALIASES = {
    id_supply: "supply",
    supply_id: "supply",
    variant_id: "product_display_name",
    id_product: "product_display_name",
    expired_at: "expiry_date_raw",
    expiry_date: "expiry_date_raw",
    order_date: "order_date_raw",
};

const formatAuditValue = (value) => {
    if (value == null || value === "") return "trống";
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
};

const normalizeAuditComparable = (value) => {
    if (value == null) return "";
    if (value instanceof Date) return value.toISOString();
    return String(value).trim();
};

const buildOrderUpdateAudit = (audit = {}) => {
    const before = audit.before || {};
    const after = audit.after || {};
    const requestedFields = Array.isArray(audit.changedFields) ? audit.changedFields : [];
    const fields = [...new Set(requestedFields.map((field) => AUDIT_FIELD_ALIASES[field] || field))];
    const changes = fields
        .map((field) => {
            const beforeValue = before[field];
            const afterValue = after[field];
            if (normalizeAuditComparable(beforeValue) === normalizeAuditComparable(afterValue)) return null;
            return {
                field,
                label: AUDIT_FIELD_LABELS[field] || field,
                from: beforeValue ?? null,
                to: afterValue ?? null,
                text: `${AUDIT_FIELD_LABELS[field] || field}: ${formatAuditValue(beforeValue)} → ${formatAuditValue(afterValue)}`,
            };
        })
        .filter(Boolean);

    return {
        changes,
        summary: changes.length ? changes.map((change) => change.text).join("; ") : "Không có thay đổi dữ liệu sau chuẩn hóa",
    };
};

const attachUpdateOrderRoute = (router) => {
    router.put("/:id", ...orderIdParam, async (req, res) => {
        const id = Number(req.params.id);

        const trx = await db.transaction();
        try {
            const { updated, audit, error, notFound } = await updateOrderWithFinance({
                trx,
                id,
                payload: req.body,
                helpers: {
                    TABLES,
                    STATUS,
                    sanitizeOrderWritePayload,
                    normalizeOrderRow,
                    todayYMDInVietnam,
                    ensureSupplierRecord,
                    normalizeTextInput,
                },
            });

            if (error) {
                await trx.rollback();
                return res.status(400).json({ error });
            }
            if (notFound) {
                await trx.rollback();
                return res.status(404).json({ error: "Không tìm thấy đơn hàng." });
            }

            await trx.commit();
            const auditDiff = buildOrderUpdateAudit(audit);
            await writeUserEventLog(req, {
                action: "Sửa đơn hàng",
                entity: "Đơn hàng",
                entityId: updated?.id_order || id,
                message: `Sửa đơn hàng ${updated?.id_order || id}: ${auditDiff.summary}`,
                source: "orders.order_list",
                metadata: {
                    orderId: id,
                    orderCode: updated?.id_order || null,
                    changedFields: Object.keys(req.body || {}),
                    changes: auditDiff.changes,
                },
            });

            res.json(updated);
        } catch (error) {
            await trx.rollback();
            logger.error("Lỗi cập nhật đơn hàng", { id, error: error.message, stack: error.stack });
            res.status(500).json({ error: "Không thể cập nhật đơn hàng." });
        }
    });
};

module.exports = { attachUpdateOrderRoute };
