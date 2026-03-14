const { db } = require("../db");
const { SCHEMA_PRODUCT, PRODUCT_SCHEMA, getDefinition, tableName } =
  require("../config/dbSchema");
const {
  formatDateOutput,
  fromDbNumber,
  getRowId,
} = require("../utils/normalizers");
const { quoteIdent } = require("../utils/sql");
const { QUOTED_COLS } = require("../utils/columns");

const PACKAGE_DEF = getDefinition("PACKAGE_PRODUCT", PRODUCT_SCHEMA);
const PRODUCT_DEF = getDefinition("PRODUCT", PRODUCT_SCHEMA);
const VARIANT_DEF = getDefinition("VARIANT", PRODUCT_SCHEMA);
const STOCK_DEF = getDefinition("PRODUCT_STOCK", PRODUCT_SCHEMA);

const TABLES = {
  packageProduct: tableName(PACKAGE_DEF.tableName, SCHEMA_PRODUCT),
  product: tableName(PRODUCT_DEF.tableName, SCHEMA_PRODUCT),
  variant: tableName(VARIANT_DEF.tableName, SCHEMA_PRODUCT),
  productStock: tableName(STOCK_DEF.tableName, SCHEMA_PRODUCT),
};

const PRODUCT_SCHEMA_COLS = PRODUCT_DEF.columns;
const VARIANT_COLS = VARIANT_DEF.columns;
const STOCK_COLS = STOCK_DEF.columns;

const PACKAGE_PRODUCTS_SELECT = `
  SELECT
    pp.${QUOTED_COLS.packageProduct.id} AS package_id,
    pp.${QUOTED_COLS.packageProduct.packageId} AS product_id,
    p.${quoteIdent(PRODUCT_SCHEMA_COLS.packageName)} AS package_name,
    stk.${quoteIdent(STOCK_COLS.accountUsername)} AS package_username,
    stk.${quoteIdent(STOCK_COLS.passwordEncrypted)} AS package_password,
    stk.${quoteIdent(STOCK_COLS.backupEmail)} AS package_mail_2nd,
    stk.${quoteIdent(STOCK_COLS.note)} AS package_note,
    stk.${quoteIdent(STOCK_COLS.twoFaEncrypted)} AS package_two_fa,
    pp.${QUOTED_COLS.packageProduct.supplier} AS package_supplier,
    pp.${QUOTED_COLS.packageProduct.cost} AS package_import,
    pp.${QUOTED_COLS.packageProduct.slot} AS package_slot,
    stk.${quoteIdent(STOCK_COLS.expiresAt)} AS package_expired,
    stk.${quoteIdent(STOCK_COLS.expiresAt)}::text AS package_expired_raw,
    pp.${QUOTED_COLS.packageProduct.match} AS package_match,
    pp.${QUOTED_COLS.packageProduct.stockId} AS stock_id,
    pp.${QUOTED_COLS.packageProduct.storageId} AS storage_id,
    pp.${QUOTED_COLS.packageProduct.storageTotal} AS storage_total,
    stk2.${quoteIdent(STOCK_COLS.accountUsername)} AS storage_username,
    stk2.${quoteIdent(STOCK_COLS.passwordEncrypted)} AS storage_password,
    stk2.${quoteIdent(STOCK_COLS.backupEmail)} AS storage_mail,
    stk2.${quoteIdent(STOCK_COLS.note)} AS storage_note,
    stk2.${quoteIdent(STOCK_COLS.twoFaEncrypted)} AS storage_two_fa,
    COALESCE(product_codes.product_codes, ARRAY[]::text[]) AS package_products
  FROM ${TABLES.packageProduct} pp
  LEFT JOIN ${TABLES.product} p ON p.${quoteIdent(PRODUCT_SCHEMA_COLS.id)} = pp.${QUOTED_COLS.packageProduct.packageId}
  LEFT JOIN ${TABLES.productStock} stk
    ON stk.${quoteIdent(STOCK_COLS.id)} = pp.${QUOTED_COLS.packageProduct.stockId}
  LEFT JOIN ${TABLES.productStock} stk2
    ON stk2.${quoteIdent(STOCK_COLS.id)} = pp.${QUOTED_COLS.packageProduct.storageId}
  LEFT JOIN (
    SELECT
      v.${quoteIdent(VARIANT_COLS.productId)} AS product_id,
      ARRAY_REMOVE(
        ARRAY_AGG(DISTINCT NULLIF(TRIM(v.${quoteIdent(VARIANT_COLS.displayName)}::text), '')),
        NULL
      ) AS product_codes
    FROM ${TABLES.variant} v
    GROUP BY v.${quoteIdent(VARIANT_COLS.productId)}
  ) product_codes ON product_codes.product_id = pp.${QUOTED_COLS.packageProduct.packageId}
`;

const summarizePackageInformation = (user, pass, mail) =>
  [
    user && `User: ${user}`,
    pass && `Pass: ${pass}`,
    mail && `Mail 2nd: ${mail}`,
  ]
    .filter(Boolean)
    .join(" | ") || null;

const mapPackageProductRow = (row) => {
  const packageId = getRowId(row, "package_id", "id", "ID");
  const informationUser = row.package_username ?? null;
  const informationPass = row.package_password ?? null;
  const informationMail = row.package_mail_2nd ?? null;
  const informationSummary = summarizePackageInformation(
    informationUser,
    informationPass,
    informationMail
  );
  const productCodes = Array.isArray(row.package_products)
    ? row.package_products
        .map((code) => (typeof code === "string" ? code.trim() : ""))
        .filter((code) => Boolean(code))
    : [];
  const productId = row.product_id != null ? getRowId(row, "product_id", "productId", "PRODUCT_ID") : null;
  return {
    id: packageId,
    productId: productId != null ? Number(productId) : null,
    package: (row.package_name != null && row.package_name !== "") ? String(row.package_name).trim() : "",
    information: informationSummary,
    informationUser,
    informationPass,
    informationMail,
    informationTwoFa: row.package_two_fa ?? null,
    informationNote: row.package_note ?? null,
    note: row.package_note ?? null,
    supplier: row.package_supplier ?? null,
    import: fromDbNumber(row.package_import),
    storageId: row.storage_id != null ? Number(row.storage_id) : null,
    storageTotal: row.storage_total != null ? Number(row.storage_total) : null,
    accountUser: row.storage_username ?? null,
    accountPass: row.storage_password ?? null,
    accountMail: row.storage_mail ?? null,
    accountTwoFa: row.storage_two_fa ?? null,
    accountNote: row.storage_note ?? null,
    expired: formatDateOutput(row.package_expired_raw ?? row.package_expired),
    slot: fromDbNumber(row.package_slot),
    slotUsed: null,
    capacityUsed: null,
    match: row.package_match ?? null,
    productCodes,
    hasCapacityField: row.storage_id != null || row.storage_total != null,
    stockId: row.stock_id != null ? Number(row.stock_id) : null,
  };
};

const fetchPackageProductById = async (trxOrDb, id) => {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return null;
  const client = trxOrDb || db;
  const result = await client.raw(`${PACKAGE_PRODUCTS_SELECT} WHERE pp.id = ?`, [
    numericId,
  ]);
  if (!result.rows?.length) return null;
  return mapPackageProductRow(result.rows[0]);
};

module.exports = {
  PACKAGE_PRODUCTS_SELECT,
  mapPackageProductRow,
  fetchPackageProductById,
  QUOTED_COLS,
};
