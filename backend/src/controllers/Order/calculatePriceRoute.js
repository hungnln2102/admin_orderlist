const Helpers = require("../../../helpers");
const { db } = require("../../db");
const { TABLES, COLS } = require("./constants");

const attachCalculatePriceRoute = (router) => {
    router.post("/calculate-price", async(req, res) => {
        console.log("[POST] /api/calculate-price");
        const { supply_id, san_pham_name, id_product, id_order, customer_type } = req.body || {};

        const productName = String(san_pham_name || id_product || "").trim();
        const orderId = String(id_order || "").trim();

        if (!productName) {
            return res.status(400).json({ error: "Tên sản phẩm bị thiếu." });
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
                const s = await db(TABLES.supply).where({ source_name: orderRow.supply }).first();
                if (s) effectiveSupplyId = s.id;
            }
            if (!effectiveSupplyId && customer_type) {
                const s = await db(TABLES.supply).where({ source_name: customer_type }).first();
                if (s) effectiveSupplyId = s.id;
            }

            const searchKeys = [
                orderRow?.id_product ? String(orderRow.id_product) : null,
                productName,
                productName.replace(/\s+/g, "")
            ].filter(Boolean);

            const productPricing = await db(TABLES.productPrice)
                .whereIn(COLS.PRICE.PRODUCT, searchKeys)
                .orWhereIn(COLS.PRICE.PACKAGE_PRODUCT, searchKeys)
                .orWhereIn(COLS.PRICE.PACKAGE, searchKeys)
                .first();

            if (!productPricing) {
                return res.status(400).json({ error: "Không tìm được bảng giá." });
            }

            const supplyPriceRow = await db(TABLES.supplyPrice)
                .max(`${COLS.SUPPLY_PRICE.PRICE} as maxPrice`)
                .where(COLS.SUPPLY_PRICE.PRODUCT_ID, productPricing.id)
                .first();

            const baseImport = Number(supplyPriceRow?.maxPrice || 0);
            if (baseImport <= 0) {
                return res.status(400).json({ error: "Không có giá NCC" });
            }

            const pctCtv = Number(productPricing.pct_ctv) || 1;
            const pctKhach = Number(productPricing.pct_khach) || 1;
            const pctPromo = Number(productPricing.pct_promo) || 0;
            const prefixCtv = (Helpers.ORDER_PREFIXES?.ctv || "MAVC").toUpperCase();
            const prefixLe = (Helpers.ORDER_PREFIXES?.le || "MAVL").toUpperCase();
            const prefixKhuyen = (Helpers.ORDER_PREFIXES?.khuyen || "MAVK").toUpperCase();
            const prefixTang = (Helpers.ORDER_PREFIXES?.tang || "MAVT").toUpperCase();
            const prefixNhap = (Helpers.ORDER_PREFIXES?.nhap || "MAVN").toUpperCase();
            const orderPrefix = orderId.toUpperCase();
            const customerTypePrefix = String(customer_type || "").toUpperCase();
            const isCtv = orderPrefix.startsWith(prefixCtv) || customerTypePrefix === prefixCtv;
            const isLe = orderPrefix.startsWith(prefixLe) || customerTypePrefix === prefixLe;
            const isKhuyen = orderPrefix.startsWith(prefixKhuyen) || customerTypePrefix === prefixKhuyen;
            const isTang = orderPrefix.startsWith(prefixTang) || customerTypePrefix === prefixTang;
            const isNhap = orderPrefix.startsWith(prefixNhap) || customerTypePrefix === prefixNhap;

            // Tính 3 biến: Resell, Customer
            const resellRaw = baseImport * pctCtv;
            const customerRaw = resellRaw * pctKhach;

            // làm tròn về bậc nghìn: < 500 xuống, >= 500 lên (1,400 => 1,000; 1,500 => 2,000)
            const round = (v) => Math.max(0, Math.round(v / 1000) * 1000);
            const resellPrice = round(Helpers.roundGiaBanValue(resellRaw));
            const customerPrice = round(Helpers.roundGiaBanValue(customerRaw));
            const baseCost = round(baseImport);

            const promoFactor = pctPromo > 1 ? pctPromo / 100 : pctPromo;
            const promoAmount = round(Helpers.roundGiaBanValue(customerPrice * promoFactor));
            const pricePromo = Math.max(0, customerPrice - promoAmount);
            const promoPrice = promoAmount;

            let price = customerPrice;
            if (isCtv) {
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
            console.error(`Calculation error (${orderId}):`, error);
            res.status(500).json({ error: "System Error" });
        }
    });
};

module.exports = { attachCalculatePriceRoute };


