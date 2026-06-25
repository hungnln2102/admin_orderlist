const { db } = require("../../../db");
const { quoteIdent } = require("../../../utils/sql");
const { isMavrykShopSupplierName } = require("../../../utils/orderHelpers");
const {
  resolveSupplierNameColumn,
  resolveSupplierTableName,
} = require("../../supplies/controller/helpers");
const { findProductIdByName } = require("./productLookupService");
const { mapSupplyPriceRow } = require("../controller/mappers");
const { supplyPriceCols, TABLES } = require("../controller/constants");

const resolveCandidateVariantIds = async (productName) => {
  const ids = await findProductIdByName(productName);
  return [ids.variantId, ids.productId].filter((id) => Number.isFinite(Number(id)));
};

const buildSupplierCostJoinContext = async () => {
  const supplierTable = await resolveSupplierTableName();
  const supplierNameCol = await resolveSupplierNameColumn();
  const supplierNameIdent = quoteIdent(supplierNameCol);
  return {
    supplierTable,
    supplierNameIdent,
  };
};

const listProductSuppliersByName = async (productName) => {
  const candidateIds = await resolveCandidateVariantIds(productName);
  if (!candidateIds.length) return [];

  const { supplierTable, supplierNameIdent } = await buildSupplierCostJoinContext();
  const placeholders = candidateIds.map(() => "?").join(", ");
  const query = `
      SELECT
        sp.${quoteIdent(supplyPriceCols.supplierId)} AS source_id,
        COALESCE(s.${supplierNameIdent}, '') AS source_name
      FROM ${TABLES.supplyPrice} sp
      LEFT JOIN ${supplierTable} s
        ON s.${quoteIdent("id")} = sp.${quoteIdent(supplyPriceCols.supplierId)}
      WHERE sp.${quoteIdent(supplyPriceCols.variantId)} IN (${placeholders})
      ORDER BY COALESCE(s.${supplierNameIdent}, sp.${quoteIdent(
        supplyPriceCols.supplierId
      )}::text);
    `;
  const result = await db.raw(query, candidateIds);
  const rows =
    result.rows?.map((row) => ({
      id: Number(row.source_id) || null,
      source_name: row.source_name || "",
    })) || [];

  const mavrykRows = await db(supplierTable)
    .select(
      db.raw(`${quoteIdent("id")} AS id`),
      db.raw(`${supplierNameIdent} AS source_name`)
    )
    .whereRaw(`LOWER(TRIM(COALESCE(${supplierNameIdent}::text, ''))) IN ('mavryk', 'shop')`);

  const merged = [...rows];
  for (const row of mavrykRows) {
    const parsedId = Number(row.id) || null;
    const name = String(row.source_name || "").trim();
    if (!parsedId || !name) continue;
    const exists = merged.some((item) => Number(item.id) === parsedId);
    if (!exists) {
      merged.push({ id: parsedId, source_name: name });
    }
  }

  merged.sort((a, b) => {
    const aName = String(a.source_name || "");
    const bName = String(b.source_name || "");
    const aIsMavryk = isMavrykShopSupplierName(aName);
    const bIsMavryk = isMavrykShopSupplierName(bName);
    if (aIsMavryk !== bIsMavryk) {
      return aIsMavryk ? -1 : 1;
    }
    return aName.localeCompare(bName, "vi");
  });

  return merged;
};

const listProductSupplierPricesByName = async (productName) => {
  const candidateIds = await resolveCandidateVariantIds(productName);
  if (!candidateIds.length) return [];

  const { supplierTable, supplierNameIdent } = await buildSupplierCostJoinContext();
  const placeholders = candidateIds.map(() => "?").join(", ");
  const query = `
      SELECT
        sp.${quoteIdent(supplyPriceCols.supplierId)} AS source_id,
        sp.${quoteIdent(supplyPriceCols.price)} AS price,
        COALESCE(s.${supplierNameIdent}, '') AS source_name,
        NULL::text AS last_order_date
      FROM ${TABLES.supplyPrice} sp
      LEFT JOIN ${supplierTable} s
        ON s.${quoteIdent("id")} = sp.${quoteIdent(supplyPriceCols.supplierId)}
      WHERE sp.${quoteIdent(supplyPriceCols.variantId)} IN (${placeholders})
      ORDER BY COALESCE(s.${supplierNameIdent}, sp.${quoteIdent(
        supplyPriceCols.supplierId
      )}::text);
    `;
  const result = await db.raw(query, candidateIds);
  return (result.rows || []).map(mapSupplyPriceRow);
};

module.exports = {
  listProductSupplierPricesByName,
  listProductSuppliersByName,
  resolveCandidateVariantIds,
};
