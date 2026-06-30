import type { NormalizedOrderRecord, PackageRow } from "./packageHelpers";
import { buildPackageLinkKeys, normalizeIdentifier } from "./packageHelpers";
import { getMatchColumn } from "./packageMatchKeys";

/**
 * True if order belongs to package by product.
 * Quan hệ: `package_product.package_id` = `product.id`; `order_list.id_product` = `variant.id`;
 * cùng phạm vi khi `variant.product_id` = `package_id` (ưu tiên: lineProductId trên đơn so với item.productId).
 * Còn lại: (1) tập mã variant (normalizedProductCodes) khớp chuỗi id_product hiển thị, hoặc
 * (2) không có tập mã thì tên gói chuẩn hóa = chuỗi id_product.
 * Không dùng prefix / startsWith / includes.
 */
export function orderBelongsToPackageByProduct(
  record: NormalizedOrderRecord,
  item: PackageRow & { normalizedProductCodes?: string[]; package?: string; productId?: number | null }
): boolean {
  const packageProductId = item.productId;
  if (
    packageProductId != null &&
    Number.isFinite(Number(packageProductId)) &&
    record.lineProductId != null &&
    Number.isFinite(record.lineProductId) &&
    Number(packageProductId) === Number(record.lineProductId)
  ) {
    return true;
  }

  const packageCode = normalizeIdentifier(item.package ?? "");
  const normalizedProductCodes = item.normalizedProductCodes ?? [];
  const productCodeSet =
    normalizedProductCodes.length > 0 ? new Set(normalizedProductCodes) : null;

  if (productCodeSet?.size && record.productCodeNormalized && productCodeSet.has(record.productCodeNormalized))
    return true;

  if (!packageCode || !record.productCodeNormalized) return false;
  const belongs = record.productCodeNormalized === packageCode;
  if (belongs) {
    if (import.meta.env.DEV) {
      console.debug("[PackageMatch] orderBelongsToPackageByProduct", {
        package: item.package,
        packageCode,
        normalizedProductCodes,
        orderId: record.base.id,
        orderCode: record.base.id_order,
        orderProduct: record.base.id_product,
        productCodeNormalized: record.productCodeNormalized,
      });
    }
  }
  return belongs;
}

/**
 * True if order matches package link: theo `slotLinkMode` — tài khoản gốc (slot) hoặc
 * tài khoản kích hoạt (information) so với đúng cột trên đơn.
 */
export function orderMatchesPackageLink(
  record: NormalizedOrderRecord,
  item: PackageRow & { slotLinkMode?: "slot" | "information" }
): boolean {
  const slotMode = item.slotLinkMode ?? "information";
  const packageLinkKeys = buildPackageLinkKeys(item, slotMode);
  if (packageLinkKeys.length === 0) return false;
  const matchColumn = getMatchColumn(slotMode);
  const linkValue =
    matchColumn === "slot" ? record.slotMatchKey : record.informationMatchKey;
  if (!linkValue) return false;
  const matched = packageLinkKeys.some(
    (pkgKey) =>
      pkgKey === linkValue ||
      pkgKey.includes(linkValue) ||
      linkValue.includes(pkgKey)
  );
  // Debug: log detailed comparison when we have keys but không match
  if (import.meta.env.DEV) {
    if (!matched) {
      console.debug("[PackageMatch] orderMatchesPackageLink: NO MATCH", {
        packageId: item.id,
        packageName: item.package,
        slotLinkMode: slotMode,
        packageLinkKeys,
        matchColumn,
        orderId: record.base.id,
        orderCode: record.base.id_order,
        slotDisplay: record.slotDisplay,
        slotMatchKey: record.slotMatchKey,
        informationDisplay: record.informationDisplay,
        informationMatchKey: record.informationMatchKey,
        customer: record.customerDisplay,
      });
    } else {
      console.debug("[PackageMatch] orderMatchesPackageLink: MATCH", {
        packageId: item.id,
        packageName: item.package,
        slotLinkMode: slotMode,
        packageLinkKeys,
        matchColumn,
        orderId: record.base.id,
        orderCode: record.base.id_order,
        slotDisplay: record.slotDisplay,
        slotMatchKey: record.slotMatchKey,
        informationDisplay: record.informationDisplay,
        informationMatchKey: record.informationMatchKey,
        customer: record.customerDisplay,
      });
    }
  }
  return matched;
}
