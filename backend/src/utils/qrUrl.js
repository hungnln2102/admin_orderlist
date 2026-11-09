const VIETQR_IMAGE_TEMPLATE = "compact2";

function buildVietQrImageUrl({ accountNumber, bankCode, amount, accountName, addInfo, template = VIETQR_IMAGE_TEMPLATE }) {
  const account = String(accountNumber || "").trim();
  const bank = String(bankCode || "").trim();
  if (!account || !bank) return "";

  const query = [];
  const numericAmount = Number(amount);
  if (Number.isFinite(numericAmount)) query.push(["amount", Math.round(numericAmount).toString()]);
  const name = String(accountName || "").trim();
  if (name) query.push(["accountName", encodeURIComponent(name)]);
  const info = String(addInfo || "").trim();
  if (info) query.push(["addInfo", encodeURIComponent(info)]);

  const tpl = String(template || VIETQR_IMAGE_TEMPLATE).trim() || VIETQR_IMAGE_TEMPLATE;
  const queryString = query.map(([key, value]) => key + "=" + value).join("&");
  return "https://img.vietqr.io/image/" + bank + "-" + account + "-" + tpl + ".png" + (queryString ? "?" + queryString : "");
}

module.exports = { buildVietQrImageUrl, VIETQR_IMAGE_TEMPLATE };
