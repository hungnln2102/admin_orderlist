/**
 * Build nội dung tin nhắn Telegram: đơn tạo mới, đơn cần gia hạn (4 ngày), đơn hết hạn (0 ngày).
 */

const {
  toSafeString,
  escapeHtml,
  formatDateDMY,
  formatCurrency,
  toInlineCode,
} = require("./formatters");
const {
  QR_ACCOUNT_NUMBER,
  QR_ACCOUNT_NAME,
  QR_BANK_CODE,
  QR_NOTE_PREFIX,
} = require("./constants");

function buildOrderCreatedMessage(order, paymentNote) {
  if (!order) return "";
  const orderCode = toSafeString(
    order.id_order || order.idOrder || order.order_code || order.orderCode
  ).trim();
  const productName = toSafeString(order.id_product || order.idProduct).trim();
  const info = toSafeString(
    order.information_order || order.informationOrder
  ).trim();
  const slot = toSafeString(order.slot).trim();
  const customer = toSafeString(order.customer || order.customer_name).trim();
  const registerDate =
    toSafeString(
      order.registration_date_display || order.registration_date_str
    ).trim() || formatDateDMY(order.order_date);
  const expiryDate =
    toSafeString(order.expiry_date_display || order.expiry_date_str).trim() ||
    formatDateDMY(order.expiry_date);
  const days = Number(order.days || order.total_days || 0) || 0;
  const priceValue = `${formatCurrency(order.price || 0)} đ`;

  const escOrder = orderCode ? escapeHtml(orderCode) : "...";
  const escProduct = productName ? escapeHtml(productName) : "N/A";
  const escInfo = info ? escapeHtml(info) : "N/A";
  const escSlot = slot ? escapeHtml(slot) : "";
  const escCustomer = customer ? escapeHtml(customer) : "N/A";
  const escRegister = registerDate ? escapeHtml(registerDate) : "";
  const escExpiry = expiryDate ? escapeHtml(expiryDate) : "";
  const escDays = days > 0 ? escapeHtml(`${days} ngày`) : "";
  const escPrice = escapeHtml(priceValue);
  const escStk = QR_ACCOUNT_NUMBER ? escapeHtml(QR_ACCOUNT_NUMBER) : "";
  const escPayment = paymentNote ? escapeHtml(paymentNote) : "";

  const separator1 = "━━━━━━ 📦 ━━━━━━";
  const separator2 = "━━━━━━ 👤 ━━━━━━";
  const separator3 = "━━━━━━ 💳 ━━━━━━";

  const lines = [
    `✅ Đơn hàng <code>${escOrder}</code> đã được tạo thành công!`,
    "",
    separator1,
    "🔔 <b>THÔNG TIN SẢN PHẨM</b>",
    `📦 Tên Sản Phẩm: <b>${escProduct}</b>`,
    `📋 Thông Tin Đơn Hàng: <code>${escInfo}</code>`,
    escSlot ? `📌 Slot: <code>${escSlot}</code>` : null,
    escRegister ? `📅 Ngày Bắt đầu: ${escRegister}` : null,
    escDays ? `⏳ Thời hạn: ${escDays}` : null,
    escExpiry ? `📅 Ngày Hết hạn: ${escExpiry}` : null,
    `💰 Giá bán: <b>${escPrice}</b>`,
    "",
    separator2,
    "🔶 <b>THÔNG TIN KHÁCH HÀNG</b>",
    `👤 Tên Khách Hàng: <code>${escCustomer}</code>`,
    "",
    separator3,
    "💳 <b>HƯỚNG DẪN THANH TOÁN</b>",
    escStk ? `🏦 STK: <code>${escStk}</code>` : null,
    escPayment ? `📝 Nội dung: <code>${escPayment}</code>` : null,
  ].filter(Boolean);

  return lines.join("\n");
}

/** MAVN import order: text only (no VietQR / no shop payment lines). */
function buildImportOrderCreatedMessage(order) {
  if (!order) return "";
  const orderCode = toSafeString(
    order.id_order || order.idOrder || order.order_code || order.orderCode
  ).trim();
  const productName = toSafeString(order.id_product || order.idProduct).trim();
  const info = toSafeString(
    order.information_order || order.informationOrder
  ).trim();
  const slot = toSafeString(order.slot).trim();
  const customer = toSafeString(order.customer || order.customer_name).trim();
  const supply = toSafeString(order.supply).trim();
  const registerDate =
    toSafeString(
      order.registration_date_display || order.registration_date_str
    ).trim() || formatDateDMY(order.order_date);
  const expiryDate =
    toSafeString(order.expiry_date_display || order.expiry_date_str).trim() ||
    formatDateDMY(order.expiry_date);
  const days = Number(order.days || order.total_days || 0) || 0;
  const cost = Number(order.cost || 0) || 0;
  const price = Number(order.price || 0) || 0;
  const escOrder = orderCode ? escapeHtml(orderCode) : "...";
  const escProduct = productName ? escapeHtml(productName) : "N/A";
  const escInfo = info ? escapeHtml(info) : "N/A";
  const escSlot = slot ? escapeHtml(slot) : "";
  const escCustomer = customer ? escapeHtml(customer) : "N/A";
  const escSupply = supply ? escapeHtml(supply) : "";
  const escRegister = registerDate ? escapeHtml(registerDate) : "";
  const escExpiry = expiryDate ? escapeHtml(expiryDate) : "";
  const escDays = days > 0 ? escapeHtml(String(days) + " ng\u00e0y") : "";
  const escCost = escapeHtml(formatCurrency(cost) + " \u0111");
  const escPrice = escapeHtml(formatCurrency(price) + " \u0111");

  const sep = "\u2501\u2501\u2501\u2501\u2501\u2501";
  const separator1 = sep + " \ud83d\udce6 " + sep;
  const separator2 = sep + " \ud83d\udc64 " + sep;

  const lines = [
    "\ud83d\uded2 <b>\u0110\u01a1n nh\u1eadp h\xe0ng</b> <code>" +
      escOrder +
      "</code> \u0111\xe3 \u0111\u01b0\u1ee3c t\u1ea1o.",
    "",
    separator1,
    "\ud83d\udd14 <b>TH\xd4NG TIN S\u1ea2N PH\u1ea8M</b>",
    "\ud83d\udce6 T\xean s\u1ea3n ph\u1ea9m: <b>" + escProduct + "</b>",
    escSupply ? "\ud83c\udfe2 NCC: <b>" + escSupply + "</b>" : null,
    "\ud83d\udccb Th\xf4ng tin \u0111\u01a1n h\xe0ng: <code>" + escInfo + "</code>",
    escSlot ? "\ud83d\udccc Slot: <code>" + escSlot + "</code>" : null,
    escRegister
      ? "\ud83d\udcc5 Ng\xe0y b\u1eaft \u0111\u1ea7u: " + escRegister
      : null,
    escDays ? "\u23f3 Th\u1eddi h\u1ea1n: " + escDays : null,
    escExpiry ? "\ud83d\udcc5 Ng\xe0y h\u1ebft h\u1ea1n: " + escExpiry : null,
    cost > 0
      ? "\ud83d\udcb0 Gi\xe1 nh\u1eadp (cost): <b>" + escCost + "</b>"
      : null,
    "\ud83d\udcb0 Gi\xe1 b\xe1n: <b>" + escPrice + "</b>",
    "",
    separator2,
    "\ud83d\udd38 <b>TH\xd4NG TIN KH\xc1CH H\xc0NG</b>",
    "\ud83d\udc64 T\xean kh\xe1ch h\xe0ng: <code>" + escCustomer + "</code>",
  ].filter(Boolean);

  return lines.join("\n");
}

function buildCopyKeyboard({ orderCode, paymentNote }) {
  return null;
}

/**
 * Build message thông báo đơn cần gia hạn (còn 4 ngày). Plain text.
 */
function buildDueOrderMessage(order, index, total) {
  const orderCode = toSafeString(
    order.id_order || order.idOrder || order.order_code || order.orderCode
  ).trim();
  const productName =
    toSafeString(order.id_product || order.idProduct).trim() || "N/A";
  const info = toSafeString(
    order.information_order || order.informationOrder
  ).trim();
  const slot = toSafeString(order.slot).trim();
  const customer =
    toSafeString(order.customer || order.customer_name).trim() || "---";
  const contact =
    toSafeString(order.contact || order.customer_link).trim();
  const registerDate =
    toSafeString(
      order.registration_date_display || order.registration_date_str
    ).trim() || formatDateDMY(order.order_date);
  const expiryDate =
    toSafeString(order.expiry_date_display || order.expiry_date_str).trim() ||
    formatDateDMY(order.expiry_date);
  const days = Number(order.days || order.total_days || 0) || 0;
  const daysLeft = Number(order.days_left) || 4;
  const price = Number(order.price || 0) || 0;
  const priceDisplay =
    price > 0 ? `${formatCurrency(price)} VND` : "Chưa Xác Định";

  const lines = [
    `📦 Đơn hàng đến hạn (${index}/${total})`,
    `🛒 Sản phẩm: ${productName}`,
    `🆔 Mã đơn: ${orderCode || "..."}`,
    `⏳ Còn lại: ${daysLeft} ngày`,
    `——— 🧾 THÔNG TIN SẢN PHẨM ———`,
    info ? `📝 Mô tả: ${info}` : null,
    slot ? `📌 Slot: ${slot}` : null,
    registerDate ? `📅 Ngày đăng ký: ${registerDate}` : null,
    days > 0 ? `⏱️ Thời hạn: ${days} ngày` : null,
    expiryDate ? `📆 Ngày hết hạn: ${expiryDate}` : null,
    `💰 Giá bán: ${priceDisplay}`,
    `——— 🤝 THÔNG TIN KHÁCH HÀNG ———`,
    `👤 Tên: ${customer}`,
    contact ? `📞 Liên hệ: ${contact}` : null,
    `——— ℹ️ THÔNG TIN THANH TOÁN ———`,
    QR_BANK_CODE ? `🏦 Ngân hàng: ${QR_BANK_CODE}` : null,
    QR_ACCOUNT_NUMBER ? `🏧 STK: ${QR_ACCOUNT_NUMBER}` : null,
    QR_ACCOUNT_NAME ? `👤 Tên: ${QR_ACCOUNT_NAME}` : null,
    `📝 Nội dung: ${(QR_NOTE_PREFIX || "Thanh toan")} ${orderCode}`,
    ``,
    `⚠️ Vui lòng ghi đúng mã đơn trong nội dung chuyển khoản để xử lý nhanh.`,
    `🙏 Trân trọng cảm ơn quý khách!`,
  ].filter((line) => line !== null);

  return lines.join("\n");
}

/**
 * Build message thông báo đơn hết hạn ngắn gọn. HTML.
 */
function buildExpiredOrderMessage(order, index, total) {
  const orderCode = toSafeString(
    order.id_order || order.idOrder || order.order_code || order.orderCode
  ).trim();
  const productName = toSafeString(order.id_product || order.idProduct).trim();
  const info = toSafeString(
    order.information_order || order.informationOrder
  ).trim();
  const slot = toSafeString(order.slot).trim();

  const escProduct = productName ? escapeHtml(productName) : "N/A";
  const escInfo = info ? escapeHtml(info) : "N/A";
  const escSlot = slot ? escapeHtml(slot) : "N/A";
  const orderCodeDisplay = toInlineCode(orderCode) || "...";

  const lines = [
    `📦 <b>Đơn hàng hết hạn (${index}/${total})</b>`,
    `Sản phẩm: <b>${escProduct}</b>`,
    `🆔 Mã đơn: ${orderCodeDisplay}`,
    "",
    `— <b>THÔNG TIN SẢN PHẨM</b> —`,
    `📝 Mô tả: ${escInfo}`,
    `📌 Slot: ${escSlot}`,
  ].filter(Boolean);

  return lines.join("\n");
}

module.exports = {
  buildOrderCreatedMessage,
  buildImportOrderCreatedMessage,
  buildCopyKeyboard,
  buildDueOrderMessage,
  buildExpiredOrderMessage,
};
