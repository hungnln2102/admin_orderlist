const { getNextSupplyId, nextId } = require("../../../services/idService");
const { db } = require("../../../db");
const { TABLES, COLS } = require("../constants");
const { PARTNER_SCHEMA, PRODUCT_SCHEMA, SCHEMA_PRODUCT } = require("../../../config/dbSchema");
const { findProductIdByName } = require("../../ProductsController/finders");

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

    const exist = await db(TABLES.supplier).where({ supplier_name: name }).first();
    if (exist) return exist.id;

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

    const scCols = COLS.SUPPLIER_COST;
    const existing = await db(TABLES.supplierCost)
        .where(scCols.VARIANT_ID, variantId)
        .andWhere(scCols.SUPPLIER_ID, supplierId)
        .first();

    if (existing) {
        if (Number(existing[scCols.PRICE]) !== price) {
            await db(TABLES.supplierCost)
                .where(scCols.ID, existing[scCols.ID])
                .update({ [scCols.PRICE]: price });
        }
        return;
    }

    const newId = await nextId(TABLES.supplierCost, scCols.ID);
    await db(TABLES.supplierCost).insert({
        [scCols.ID]: newId,
        [scCols.VARIANT_ID]: variantId,
        [scCols.SUPPLIER_ID]: supplierId,
        [scCols.PRICE]: price,
    });
};

const ensureVariantRecord = async(productName) => {
    if (!productName) return null;
    const name = String(productName).trim();
    if (!name) return null;

    const displayNameCol = PRODUCT_SCHEMA.VARIANT.COLS.DISPLAY_NAME;
    const variantNameCol = PRODUCT_SCHEMA.VARIANT.COLS.VARIANT_NAME;
    const variantIdCol = PRODUCT_SCHEMA.VARIANT.COLS.ID;

    const existing = await db(TABLES.variant)
        .where(displayNameCol, name)
        .orWhere(variantNameCol, name)
        .select(variantIdCol)
        .first();
    if (existing && Number.isFinite(Number(existing[variantIdCol]))) {
        return Number(existing[variantIdCol]);
    }

    return db.transaction(async(trx) => {
        const productIdCol = PRODUCT_SCHEMA.PRODUCT.COLS.ID;
        const packageNameCol = PRODUCT_SCHEMA.PRODUCT.COLS.PACKAGE_NAME;
        const isActiveCol = PRODUCT_SCHEMA.PRODUCT.COLS.IS_ACTIVE;

        const productId = await nextId(TABLES.product, productIdCol, trx);
        await trx(TABLES.product).insert({
            [productIdCol]: productId,
            [packageNameCol]: name,
            [isActiveCol]: true,
        });

        const variantId = await nextId(TABLES.variant, variantIdCol, trx);
        await trx(TABLES.variant).insert({
            [variantIdCol]: variantId,
            [PRODUCT_SCHEMA.VARIANT.COLS.PRODUCT_ID]: productId,
            [variantNameCol]: name,
            [displayNameCol]: name,
            [PRODUCT_SCHEMA.VARIANT.COLS.IS_ACTIVE]: true,
        });

        return variantId;
    });
};

module.exports = {
    resolveProductToVariantId,
    ensureSupplyRecord,
    ensureSupplierCost,
    ensureVariantRecord,
};
