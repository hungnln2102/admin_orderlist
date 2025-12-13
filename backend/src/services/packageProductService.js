const { db } = require("../db");
const { DB_SCHEMA, getDefinition, tableName } = require("../config/dbSchema");
const {
  formatDateOutput,
  fromDbNumber,
  getRowId,
} = require("../utils/normalizers");
const { quoteIdent } = require("../utils/sql");
const { QUOTED_COLS } = require("../utils/columns");

const PACKAGE_DEF = getDefinition("PACKAGE_PRODUCT");
const ACCOUNT_DEF = getDefinition("ACCOUNT_STORAGE");
const PRODUCT_PRICE_DEF = getDefinition("PRODUCT_PRICE");

const TABLES = {
  packageProduct: tableName(DB_SCHEMA.PACKAGE_PRODUCT.TABLE),
  accountStorage: tableName(DB_SCHEMA.ACCOUNT_STORAGE.TABLE),
  productPrice: tableName(DB_SCHEMA.PRODUCT_PRICE.TABLE),
};

const PACKAGE_PRODUCTS_SELECT = `
  SELECT
    pp.${QUOTED_COLS.packageProduct.id} AS package_id,
    pp.${QUOTED_COLS.packageProduct.package} AS package_name,
    pp.${QUOTED_COLS.packageProduct.username} AS package_username,
    pp.${QUOTED_COLS.packageProduct.password} AS package_password,
    pp.${QUOTED_COLS.packageProduct.mail2nd} AS package_mail_2nd,
    pp.${QUOTED_COLS.packageProduct.note} AS package_note,
    pp.${QUOTED_COLS.packageProduct.supplier} AS package_supplier,
    pp.${QUOTED_COLS.packageProduct.cost} AS package_import,
    pp.${QUOTED_COLS.packageProduct.slot} AS package_slot,
    pp.${QUOTED_COLS.packageProduct.expired} AS package_expired,
    pp.${QUOTED_COLS.packageProduct.expired}::text AS package_expired_raw,
    pp.${QUOTED_COLS.packageProduct.match} AS package_match,
    acc.${QUOTED_COLS.accountStorage.id} AS account_id,
    acc.${QUOTED_COLS.accountStorage.username} AS account_username,
    acc.${QUOTED_COLS.accountStorage.password} AS account_password,
    acc.${QUOTED_COLS.accountStorage.mail2nd} AS account_mail_2nd,
    acc.${QUOTED_COLS.accountStorage.note} AS account_note,
    acc.${QUOTED_COLS.accountStorage.storage} AS account_storage,
    acc.${QUOTED_COLS.accountStorage.mailFamily} AS account_mail_family,
    COALESCE(product_codes.product_codes, ARRAY[]::text[]) AS package_products
  FROM ${TABLES.packageProduct} pp
  LEFT JOIN ${TABLES.accountStorage} acc
    ON acc.${QUOTED_COLS.accountStorage.mailFamily} = pp.${QUOTED_COLS.packageProduct.username}
  LEFT JOIN (
    SELECT
      LOWER(TRIM(${quoteIdent(PRODUCT_PRICE_DEF.columns.package)}::text)) AS package_key,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT NULLIF(TRIM(${quoteIdent(PRODUCT_PRICE_DEF.columns.product)}::text), '')), NULL) AS product_codes
    FROM ${TABLES.productPrice}
    GROUP BY LOWER(TRIM(${quoteIdent(PRODUCT_PRICE_DEF.columns.package)}::text))
  ) product_codes ON product_codes.package_key = LOWER(TRIM(pp.${QUOTED_COLS.packageProduct.package}::text))
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
  const accountStorageId = getRowId(row, "account_id", "account_storage_id");
  const productCodes = Array.isArray(row.package_products)
    ? row.package_products
        .map((code) => (typeof code === "string" ? code.trim() : ""))
        .filter((code) => Boolean(code))
    : [];
  return {
    id: packageId,
    package: row.package_name || "",
    information: informationSummary,
    informationUser,
    informationPass,
    informationMail,
    note: row.package_note ?? null,
    supplier: row.package_supplier ?? null,
    import: fromDbNumber(row.package_import),
    accountStorageId,
    accountUser: row.account_username ?? null,
    accountPass: row.account_password ?? null,
    accountMail: row.account_mail_2nd ?? null,
    accountNote: row.account_note ?? null,
    capacity: fromDbNumber(row.account_storage),
    expired: formatDateOutput(row.package_expired_raw ?? row.package_expired),
    slot: fromDbNumber(row.package_slot),
    slotUsed: null,
    capacityUsed: null,
    match: row.package_match ?? null,
    productCodes,
    hasCapacityField:
      row.account_storage !== null && row.account_storage !== undefined,
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
