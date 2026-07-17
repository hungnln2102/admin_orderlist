const { normalizeEmail } = require("@/domains/renew-adobe/helpers/email");
const { MAP_COLS } = require("@/services/renew-adobe/orderUserTrackingService/tables");


function normalizeOrgKeyForTracking(orgName) {
  const s = String(orgName ?? "").trim().toLowerCase();
  return s || "";
}

function mappingImpliesHasPackage(productRaw) {
  if (productRaw === false || productRaw === 0) return false;
  if (productRaw === true || productRaw === 1) return true;
  if (typeof productRaw === "string") {
    const n = productRaw.trim().toLowerCase();
    if (!n) return false;
    if (["false", "0", "no"].includes(n)) return false;
    if (["true", "1", "yes"].includes(n)) return true;
    if (n.includes("miễn phí") || n.includes("mien phi")) return false;
    if (n.includes("gói thành viên") || n.includes("goi thanh vien")) return false;
    if (n.includes("thành viên miễn phí") || n.includes("thanh vien mien phi")) return false;
    if (n.includes("free membership")) return false;
    if (n.includes("free") && n.includes("member")) return false;
    return (
      n.includes("ccp") ||
      n.includes("creative cloud pro") ||
      n.includes("creativecloudpro")
    );
  }
  return Boolean(productRaw);
}

function resolveRowStatus({ informationOrder, mapping }) {
  const email = normalizeEmail(informationOrder);
  if (!email) return "chưa add";
  if (!mapping) return "chưa add";
  const adobeId = mapping[MAP_COLS.ADOBE_ACCOUNT_ID];
  if (adobeId == null || adobeId === "") return "chưa add";
  if (!mappingImpliesHasPackage(mapping[MAP_COLS.PRODUCT])) {
    return "chưa cấp quyền";
  }
  return "có gói";
}

module.exports = {
  normalizeEmail,
  normalizeOrgKeyForTracking,
  mappingImpliesHasPackage,
  resolveRowStatus,
};
