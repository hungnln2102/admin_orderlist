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
const { QR_ACCOUNT_NUMBER } = require("./constants");

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
    `——— ℹ️ THÔNG TIN THANH TOÁN ———`,
    `🏦 Ngân hàng: VP Bank`,
    `🏧 STK: 9183400998`,
    `👤 Tên: NGO LE NGOC HUNG`,
    `📝 Nội dung: Thanh toán ${orderCode}`,
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
  buildCopyKeyboard,
  buildDueOrderMessage,
  buildExpiredOrderMessage,
};
