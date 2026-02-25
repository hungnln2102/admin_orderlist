const Helpers = require("../../../helpers");
const { db } = require("../../db");
const { TABLES, COLS } = require("./constants");
const { quoteIdent } = require("../../utils/sql");
const logger = require("../../utils/logger");

const fetchVariantPricing = async (productName) => {
    const name = String(productName ?? "");
    if (!name) return null;

    const sql = `
      SELECT
        v.${quoteIdent(COLS.VARIANT.ID)} AS variant_id,
        pc.${quoteIdent(COLS.PRICE_CONFIG.PCT_CTV)} AS pct_ctv,
        pc.${quoteIdent(COLS.PRICE_CONFIG.PCT_KHACH)} AS pct_khach,
        pc.${quoteIdent(COLS.PRICE_CONFIG.PCT_PROMO)} AS pct_promo
      FROM ${TABLES.variant} v
      LEFT JOIN ${TABLES.priceConfig} pc
        ON pc.${quoteIdent(COLS.PRICE_CONFIG.VARIANT_ID)} = v.${quoteIdent(COLS.VARIANT.ID)}
      WHERE v.${quoteIdent(COLS.VARIANT.DISPLAY_NAME)} = ?
      ORDER BY pc.${quoteIdent(COLS.PRICE_CONFIG.UPDATED_AT)} DESC NULLS LAST
      LIMIT 1;
    `;
    const res = await db.raw(sql, [name]);
    const row = res.rows?.[0];
    if (!row) return null;
    return {
        variantId: row.variant_id,
        pctCtv: row.pct_ctv,
        pctKhach: row.pct_khach,
        pctPromo: row.pct_promo,
    };
};

const attachCalculatePriceRoute = (router) => {
    router.post("/calculate-price", async(req, res) => {
        logger.debug("[POST] /api/calculate-price");
        const { supply_id, san_pham_name, id_product, id_order, customer_type } = req.body || {};

        const productName = String(san_pham_name || id_product || "").trim();
        const orderId = String(id_order || "").trim();

        if (!productName) {
            return res.status(400).json({ error: "Tên sản phẩm bắt buộc." });
        }

        try {
            const orderRow = orderId ?
                await db(TABLES.orderList)
                .select("id_product", "price", "cost", "supply")
                .where({ id_order: orderId })
                .first() :
                null;

            let effectiveSupplyId = Number(supply_id);
            if (!effectiveSupplyId && orderRow?.supply) {
                const s = await db(TABLES.supplier).where({ supplier_name: orderRow.supply }).first();
                if (s) effectiveSupplyId = s.id;
            }
            if (!effectiveSupplyId && customer_type) {
                const s = await db(TABLES.supplier).where({ supplier_name: customer_type }).first();
                if (s) effectiveSupplyId = s.id;
            }

            const variantPricing = await fetchVariantPricing(productName);

            if (!variantPricing?.variantId) {
                return res.status(400).json({ error: "Không tìm thấy gói cho sản phẩm." });
            }

            // Cost ưu tiên theo nguồn đã chọn; giá bán tính theo giá cao nhất
            let importBySource = 0;
            if (effectiveSupplyId) {
                const latestBySource = await db(TABLES.supplierCost)
                    .select(COLS.SUPPLIER_COST.PRICE)
                    .where(COLS.SUPPLIER_COST.VARIANT_ID, variantPricing.variantId)
                    .andWhere(COLS.SUPPLIER_COST.SUPPLIER_ID, effectiveSupplyId)
                    .orderBy(COLS.SUPPLIER_COST.ID, "desc")
                    .first();
                if (latestBySource?.[COLS.SUPPLIER_COST.PRICE] !== undefined) {
                    importBySource = Number(latestBySource[COLS.SUPPLIER_COST.PRICE]) || 0;
                }
            }

            if (importBySource <= 0 && orderRow?.cost) {
                importBySource = Number(orderRow.cost) || 0;
            }

            const maxPriceRow = await db(TABLES.supplierCost)
                .max(`${COLS.SUPPLIER_COST.PRICE} as maxPrice`)
                .where(COLS.SUPPLIER_COST.VARIANT_ID, variantPricing.variantId)
                .first();
            const baseForPricing = Number(maxPriceRow?.maxPrice || 0);

            if (baseForPricing <= 0 && importBySource <= 0) {
                return res.status(400).json({ error: "Không có giá NCC" });
            }

            const pricingBase = baseForPricing > 0 ? baseForPricing : importBySource;
            const baseImport = importBySource > 0 ? importBySource : baseForPricing;

            const pctCtv = Number(variantPricing?.pctCtv) || 1;
            const pctKhach = Number(variantPricing?.pctKhach) || 1;
            const pctPromo = Number(variantPricing?.pctPromo) || 0;
            const prefixCtv = (Helpers.ORDER_PREFIXES?.ctv || "MAVC").toUpperCase();
            const prefixLe = (Helpers.ORDER_PREFIXES?.le || "MAVL").toUpperCase();
            const prefixKhuyen = (Helpers.ORDER_PREFIXES?.khuyen || "MAVK").toUpperCase();
            const prefixTang = (Helpers.ORDER_PREFIXES?.tang || "MAVT").toUpperCase();
            const prefixNhap = (Helpers.ORDER_PREFIXES?.nhap || "MAVN").toUpperCase();
            const prefixSinhVien = (Helpers.ORDER_PREFIXES?.sinhvien || "MAVS").toUpperCase();
            const orderPrefix = orderId.toUpperCase();
            const customerTypePrefix = String(customer_type || "").toUpperCase();
            const isCtv = orderPrefix.startsWith(prefixCtv) || customerTypePrefix === prefixCtv;
            const isLe = orderPrefix.startsWith(prefixLe) || customerTypePrefix === prefixLe;
            const isKhuyen = orderPrefix.startsWith(prefixKhuyen) || customerTypePrefix === prefixKhuyen;
            const isTang = orderPrefix.startsWith(prefixTang) || customerTypePrefix === prefixTang;
            const isNhap = orderPrefix.startsWith(prefixNhap) || customerTypePrefix === prefixNhap;
            const isSinhVien = orderPrefix.startsWith(prefixSinhVien) || customerTypePrefix === prefixSinhVien;

            const resellRaw = pricingBase * pctCtv;
            const customerRaw = resellRaw * pctKhach;

            const round = (v) => Math.max(0, Math.round(v / 1000) * 1000);
            const resellPrice = round(Helpers.roundGiaBanValue(resellRaw));
            const customerPrice = round(Helpers.roundGiaBanValue(customerRaw));
            const baseCost = round(baseImport);

            const promoFactor = pctPromo > 1 ? pctPromo / 100 : pctPromo;
            const promoAmount = round(Helpers.roundGiaBanValue(customerPrice * promoFactor));
            const pricePromo = Math.max(0, customerPrice - promoAmount);
            const promoPrice = pricePromo;

            let price = customerPrice;
            if (isCtv || isSinhVien) {
                price = resellPrice;
            } else if (isLe) {
                price = customerPrice;
            } else if (isKhuyen) {
                const factor = Math.max(0, 1 - promoFactor);
                price = round(Helpers.roundGiaBanValue(customerRaw * factor));
            } else if (isTang) {
                price = 0;
            } else if (isNhap) {
                price = baseCost;
            }
            const totalPrice = price;

            res.json({
                cost: baseCost,
                price,
                promoPrice,
                pricePromo,
                promo: promoAmount,
                resellPrice,
                customerPrice,
                totalPrice,
                days: 30,
                order_expired: ""
            });

        } catch (error) {
            logger.error("Calculation error", { orderId, error: error.message, stack: error.stack });
            res.status(500).json({ error: "System Error" });
        }
    });
};

module.exports = { attachCalculatePriceRoute };
