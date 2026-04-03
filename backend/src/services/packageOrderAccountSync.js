/**
 * Một chiều: đổi tài khoản kho / gói → cập nhật cột slot hoặc information_order trên order_list
 * (cùng rule match như frontend: packageMatchUtils / packageHelpers).
 */

const {
  ORDERS_SCHEMA,
  SCHEMA_ORDERS,
  SCHEMA_PRODUCT,
  PRODUCT_SCHEMA,
  tableName,
} = require("../config/dbSchema");
const { fetchPackageProductById } = require("./packageProductService");
const logger = require("../utils/logger");

const ORDER_COLS = ORDERS_SCHEMA.ORDER_LIST.COLS;
const V_COLS = PRODUCT_SCHEMA.VARIANT.COLS;
const PKG_COLS = PRODUCT_SCHEMA.PACKAGE_PRODUCT.COLS;

const TABLES = {
  orderList: tableName(ORDERS_SCHEMA.ORDER_LIST.TABLE, SCHEMA_ORDERS),
  variant: tableName(PRODUCT_SCHEMA.VARIANT.TABLE, SCHEMA_PRODUCT),
  packageProduct: tableName(PRODUCT_SCHEMA.PACKAGE_PRODUCT.TABLE, SCHEMA_PRODUCT),
};

const toCleanString = (value) => {
  if (value == null) return "";
  return typeof value === "string" ? value.trim() : String(value).trim();
};

const normalizeIdentifier = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeMatchKey = (value) => {
  const s = toCleanString(value);
  return s ? s.toLowerCase().replace(/\s+/g, "") : "";
};

const buildPackageLinkKeys = (username) => {
  const n = normalizeMatchKey(username);
  return n ? [n] : [];
};

const orderBelongsToPackageByProduct = (variantDisplayName, pkg) => {
  const codes = Array.isArray(pkg.productCodes)
    ? pkg.productCodes.map((c) => normalizeIdentifier(c)).filter(Boolean)
    : [];
  const recordCode = normalizeIdentifier(variantDisplayName || "");
  if (codes.length > 0) return codes.includes(recordCode);
  const packageCode = normalizeIdentifier(pkg.package || "");
  return Boolean(packageCode && recordCode === packageCode);
};

const linkMatches = (packageKeys, linkValue) => {
  if (!linkValue || packageKeys.length === 0) return false;
  return packageKeys.some(
    (pkgKey) =>
      pkgKey === linkValue ||
      pkgKey.includes(linkValue) ||
      linkValue.includes(pkgKey)
  );
};

const orderMatchesPackageLink = (orderRow, pkg, linkUsername, matchSource) => {
  const packageKeys = buildPackageLinkKeys(linkUsername);
  if (packageKeys.length === 0) return false;
  const ms = matchSource || pkg;
  const matchMode = ms.match === "slot" ? "slot" : "information_order";
  const slot = toCleanString(orderRow[ORDER_COLS.SLOT]);
  const info = toCleanString(orderRow[ORDER_COLS.INFORMATION_ORDER]);
  const linkValue =
    matchMode === "slot"
      ? normalizeMatchKey(slot)
      : normalizeMatchKey(info);
  return linkMatches(packageKeys, linkValue);
};

const replaceAccountInColumn = (oldText, oldAccount, newAccount) => {
  const oldT = toCleanString(oldText);
  const o = normalizeMatchKey(oldAccount);
  const n = toCleanString(newAccount);
  if (!o) return oldT;
  if (normalizeMatchKey(oldT) === o) return n;
  const esc = String(oldAccount).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(esc, "gi");
  if (re.test(oldT)) return oldT.replace(re, n);
  return oldT;
};

/**
 * Khi tài khoản kho (email chính) đổi từ oldUsername → newUsername,
 * cập nhật cột slot hoặc information_order trên các đơn đang match gói này.
 * @param {object} [opts] - `matchModeSource`: gói **trước** khi sửa (giữ đúng cột match nếu đổi match mode cùng lúc).
 */
async function syncOrdersMatchingPackageAccount(
  trx,
  pkg,
  oldUsername,
  newUsername,
  opts = {}
) {
  if (!pkg?.productId) return { updated: 0 };
  const oldKey = normalizeMatchKey(oldUsername);
  if (!oldKey) return { updated: 0 };
  if (normalizeMatchKey(newUsername) === oldKey) return { updated: 0 };

  const matchSource = opts.matchModeSource || pkg;
  const matchMode =
    matchSource.match === "slot" ? "slot" : "information_order";
  const orderCol =
    matchMode === "slot" ? ORDER_COLS.SLOT : ORDER_COLS.INFORMATION_ORDER;

  const variantRows = await trx(TABLES.variant)
    .select(V_COLS.ID, V_COLS.DISPLAY_NAME, V_COLS.VARIANT_NAME)
    .where(V_COLS.PRODUCT_ID, pkg.productId);

  const variantById = new Map(
    variantRows.map((v) => [
      Number(v[V_COLS.ID]),
      v[V_COLS.DISPLAY_NAME] || v[V_COLS.VARIANT_NAME] || "",
    ])
  );
  const variantIds = [...variantById.keys()].filter((x) => Number.isFinite(x));
  if (variantIds.length === 0) return { updated: 0 };

  const orders = await trx(TABLES.orderList).whereIn(
    ORDER_COLS.ID_PRODUCT,
    variantIds
  );

  let updated = 0;
  for (const o of orders) {
    const vid = Number(o[ORDER_COLS.ID_PRODUCT]);
    const display = variantById.get(vid) || "";
    if (!orderBelongsToPackageByProduct(display, pkg)) continue;
    if (!orderMatchesPackageLink(o, pkg, oldUsername, matchSource)) continue;

    const cur = toCleanString(o[orderCol]);
    const next = replaceAccountInColumn(cur, oldUsername, newUsername);
    if (next === cur) continue;

    await trx(TABLES.orderList)
      .where(ORDER_COLS.ID, o[ORDER_COLS.ID])
      .update({ [orderCol]: next || null });
    updated += 1;
  }

  if (updated > 0) {
    logger.info("[packageOrderAccountSync] Đã cập nhật đơn theo đổi tài khoản gói", {
      packageId: pkg.id,
      orderCol,
      updated,
    });
  }
  return { updated };
}

/**
 * Sau khi PUT kho: mọi gói đang dùng stock này — đồng bộ đơn (old account → new account).
 */
async function syncOrdersForPackagesUsingStock(trx, stockId, oldAccount, newAccount) {
  const sid = Number(stockId);
  if (!Number.isFinite(sid) || sid <= 0) return { updated: 0 };
  if (normalizeMatchKey(oldAccount) === normalizeMatchKey(newAccount)) {
    return { updated: 0 };
  }

  const pkgRows = await trx(TABLES.packageProduct)
    .select(PKG_COLS.ID)
    .where(PKG_COLS.STOCK_ID, sid);

  let total = 0;
  for (const pr of pkgRows) {
    const pkgId = pr[PKG_COLS.ID];
    const pkg = await fetchPackageProductById(trx, pkgId);
    if (!pkg) continue;
    const r = await syncOrdersMatchingPackageAccount(
      trx,
      pkg,
      oldAccount,
      newAccount,
      { matchModeSource: pkg }
    );
    total += r.updated;
  }
  return { updated: total };
}

module.exports = {
  syncOrdersMatchingPackageAccount,
  syncOrdersForPackagesUsingStock,
  normalizeMatchKey,
};
