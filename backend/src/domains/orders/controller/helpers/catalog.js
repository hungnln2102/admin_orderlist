const { getNextSupplyId, nextId } = require("../../../../services/idService");
const { db } = require("../../../../db");
const { TABLES } = require("../constants");
const { PARTNER_SCHEMA, PRODUCT_SCHEMA, SCHEMA_PRODUCT } = require("../../../../config/dbSchema");
const { findProductIdByName } = require("../../../products/controller/finders");
const { getTiers } = require("../../../../services/pricing/tierCache");
const { findSupplierIdByName } = require("../../../supplies/services/supplierLookupService");
const { upsertSupplierCostPrice } = require("../../../supplies/services/supplierCostService");

const resolveProductToVariantId = async(productNameOrId) => {
    if (productNameOrId == null) return null;
    const num = Number(productNameOrId);
    if (Number.isFinite(num) && num > 0) return num;
    const name = String(productNameOrId).trim();
    if (!name) return null;
    const displayNameCol = PRODUCT_SCHEMA.VARIANT.COLS.DISPLAY_NAME || "display_name";
    const variantNameCol = PRODUCT_SCHEMA.VARIANT.COLS.VARIANT_NAME || "variant_name";
    const row = await db(TABLES.variant)
        .where(displayNameCol, name)
        .orWhere(variantNameCol, name)
        .select(PRODUCT_SCHEMA.VARIANT.COLS.ID)
        .first();
    if (row && Number.isFinite(Number(row[PRODUCT_SCHEMA.VARIANT.COLS.ID]))) {
        return Number(row[PRODUCT_SCHEMA.VARIANT.COLS.ID]);
    }
    const { variantId } = await findProductIdByName(name);
    return variantId;
};

const ensureSupplyRecord = async(sourceName) => {
    if (!sourceName) return null;
    const name = sourceName.trim();

    const existingId = await findSupplierIdByName(name);
    if (existingId) return existingId;

    const nextSupplyId = await getNextSupplyId();
    const supplyTableName = PARTNER_SCHEMA.SUPPLIER.TABLE;
    const statusColRes = await db.raw(
        `
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = ? AND table_name = ? 
          AND column_name IN ('status', 'trang_thai', 'is_active') 
        LIMIT 1
    `,
        [SCHEMA_PRODUCT, supplyTableName]
    );
    const statusCol = statusColRes.rows?.[0]?.column_name;

    const newSupply = { id: nextSupplyId, supplier_name: name };
    if (statusCol) newSupply[statusCol] = "active";

    await db(TABLES.supplier).insert(newSupply);
    return nextSupplyId;
};

const ensureSupplierCost = async(variantId, supplierId, cost) => {
    if (!variantId || !supplierId) return;
    const price = Number(cost);
    if (!Number.isFinite(price) || price <= 0) return;

    await upsertSupplierCostPrice({ variantId, supplierId, price });
};

const ensureVariantRecord = async(productName, options = {}) => {
    if (!productName) return { variantId: null, created: false };
    const name = String(productName).trim();
    if (!name) return { variantId: null, created: false };

    const displayNameCol = PRODUCT_SCHEMA.VARIANT.COLS.DISPLAY_NAME;
    const variantNameCol = PRODUCT_SCHEMA.VARIANT.COLS.VARIANT_NAME;
    const variantIdCol = PRODUCT_SCHEMA.VARIANT.COLS.ID;

    const existing = await db(TABLES.variant)
        .where(displayNameCol, name)
        .orWhere(variantNameCol, name)
        .select(variantIdCol)
        .first();
    if (existing && Number.isFinite(Number(existing[variantIdCol]))) {
        return { variantId: Number(existing[variantIdCol]), created: false };
    }

    const variantId = await db.transaction(async(trx) => {
        const productIdCol = PRODUCT_SCHEMA.PRODUCT.COLS.ID;
        const packageNameCol = PRODUCT_SCHEMA.PRODUCT.COLS.PACKAGE_NAME;
        const isActiveCol = PRODUCT_SCHEMA.PRODUCT.COLS.IS_ACTIVE;

        const productId = await nextId(TABLES.product, productIdCol, trx);
        await trx(TABLES.product).insert({
            [productIdCol]: productId,
            [packageNameCol]: name,
            [isActiveCol]: true,
        });

        const descCols = PRODUCT_SCHEMA.PRODUCT_DESC.COLS;
        const descTable = `${SCHEMA_PRODUCT}.${PRODUCT_SCHEMA.PRODUCT_DESC.TABLE}`;
        const descRes = await trx.raw(
            `INSERT INTO ${descTable} (${descCols.RULES}, ${descCols.DESCRIPTION}, ${descCols.SHORT_DESC}) VALUES (NULL, NULL, NULL) RETURNING ${descCols.ID} AS id`
        );
        const descVariantId = descRes.rows?.[0]?.id;
        if (!Number.isFinite(Number(descVariantId))) {
            throw new Error("Unable to create desc_variant for new variant.");
        }

        const newVariantId = await nextId(TABLES.variant, variantIdCol, trx);
        await trx(TABLES.variant).insert({
            [variantIdCol]: newVariantId,
            [PRODUCT_SCHEMA.VARIANT.COLS.PRODUCT_ID]: productId,
            [variantNameCol]: name,
            [displayNameCol]: name,
            [PRODUCT_SCHEMA.VARIANT.COLS.IS_ACTIVE]: true,
            [PRODUCT_SCHEMA.VARIANT.COLS.DESC_VARIANT_ID]: Number(descVariantId),
        });

        const tiers = await getTiers();
        const rawPrefix = String(options.orderPrefix || options.customerType || "")
            .trim()
            .toUpperCase();
        const matchedTier =
            tiers.find((tier) => String(tier.prefix || "").toUpperCase() === rawPrefix) ||
            tiers.find((tier) => tier.key === "customer") ||
            null;

        const salePrice = Number(options.salePrice);
        if (matchedTier && Number.isFinite(salePrice) && salePrice > 0) {
            await trx(TABLES.variantMargin)
                .insert({
                    variant_id: newVariantId,
                    tier_id: matchedTier.id,
                    price: salePrice,
                })
                .onConflict(["variant_id", "tier_id"])
                .merge({ price: salePrice });
        }

        const importTier = tiers.find((tier) => tier.key === "import");
        const importCost = Number(options.cost);
        if (importTier && Number.isFinite(importCost) && importCost > 0) {
            await trx(TABLES.variantMargin)
                .insert({
                    variant_id: newVariantId,
                    tier_id: importTier.id,
                    price: importCost,
                })
                .onConflict(["variant_id", "tier_id"])
                .merge({ price: importCost });
        }

        return newVariantId;
    });

    return { variantId, created: true };
};

module.exports = {
    resolveProductToVariantId,
    ensureSupplyRecord,
    ensureSupplierCost,
    ensureVariantRecord,
};
