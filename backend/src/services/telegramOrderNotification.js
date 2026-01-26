const https = require("https");
const dns = require("dns");
const { formatYMDToDMY } = require("../utils/normalizers");
const logger = require("../utils/logger");

const HTTP_TIMEOUT_MS = 10_000;

// All sensitive values must come from environment variables
// No hardcoded defaults for security reasons
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID =
  process.env.ORDER_NOTIFICATION_CHAT_ID ||
  process.env.TELEGRAM_CHAT_ID ||
  "";
const TELEGRAM_ORDER_TOPIC_ID = Number.parseInt(
  process.env.ORDER_NOTIFICATION_TOPIC_ID ||
    process.env.TELEGRAM_ORDER_TOPIC_ID ||
    process.env.ORDER_TOPIC_ID ||
    "1",
  10
);
const SEND_ORDER_NOTIFICATION =
  String(process.env.SEND_ORDER_NOTIFICATION || "true").toLowerCase() !==
  "false";
const SEND_ORDER_TO_TOPIC =
  String(process.env.SEND_ORDER_TO_TOPIC || "true").toLowerCase() !== "false";

const QR_ACCOUNT_NUMBER =
  process.env.ORDER_QR_ACCOUNT_NUMBER ||
  process.env.QR_ACCOUNT_NUMBER ||
  "";
const QR_BANK_CODE =
  process.env.ORDER_QR_BANK_CODE ||
  process.env.QR_BANK_CODE ||
  "";
const QR_NOTE_PREFIX = process.env.ORDER_QR_NOTE_PREFIX || "Thanh toan";
const SEND_ORDER_COPY_BUTTONS =
  String(process.env.SEND_ORDER_COPY_BUTTONS || "true").toLowerCase() !==
  "false";

const preferIpv4Lookup = (hostname, options, cb) =>
  dns.lookup(hostname, { ...options, family: 4, all: false }, cb);

const sendWithHttps = (url, payload, headers = { "Content-Type": "application/json" }) =>
  new Promise((resolve, reject) => {
    const body = typeof payload === "string" ? payload : JSON.stringify(payload);
    const urlObj = new URL(url);

    const req = https.request(
      {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: `${urlObj.pathname}${urlObj.search}`,
        method: "POST",
        headers: {
          ...headers,
          "Content-Length": Buffer.byteLength(body),
        },
        agent: new https.Agent({ keepAlive: true, lookup: preferIpv4Lookup }),
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          const status = res.statusCode || 0;
          if (status >= 400) {
            const err = new Error(`Request failed with status ${status}`);
            err.status = status;
            err.body = responseBody;
            reject(err);
            return;
          }
          resolve(responseBody);
        });
      }
    );

    req.setTimeout(HTTP_TIMEOUT_MS, () => {
      req.destroy(new Error(`Request timed out after ${HTTP_TIMEOUT_MS}ms`));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });

const postJson = async (url, data) => {
  const payload = JSON.stringify(data);
  const headers = { "Content-Type": "application/json" };

  const timeoutSignal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(HTTP_TIMEOUT_MS)
      : undefined;

  if (typeof fetch === "function") {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: payload,
        signal: timeoutSignal,
      });
      if (!res.ok) {
        const err = new Error(`Request failed with status ${res.status}`);
        err.status = res.status;
        err.body = await res.text().catch(() => "");
        throw err;
      }
      return await res.text();
    } catch (err) {
      const code = err?.code || err?.cause?.code;
      const isTransient =
        err?.name === "AbortError" ||
        code === "ETIMEDOUT" ||
        code === "EAI_AGAIN" ||
        code === "ENOTFOUND" ||
        code === "ECONNRESET" ||
        /fetch failed/i.test(err?.message || "");
      if (!isTransient) {
        throw err;
      }
      logger.warn("[Order][Telegram] Fetch failed, retrying with https client", {
        code,
        status: err?.status,
      });
    }
  }

  return sendWithHttps(url, payload, headers);
};

const roundGiaBanValue = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num / 1000) * 1000;
};

const formatCurrency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  try {
    return Math.round(num).toLocaleString("vi-VN");
  } catch {
    return String(Math.round(num));
  }
};

const buildSepayQrUrl = ({ accountNumber, bankCode, amount, description }) => {
  const acc = String(accountNumber || "").trim();
  const bank = String(bankCode || "").trim();
  if (!acc || !bank) return "";

  const params = new URLSearchParams();
  params.set("acc", acc);
  params.set("bank", bank);

  const numericAmount = Number(amount);
  if (Number.isFinite(numericAmount) && numericAmount > 0) {
    params.set("amount", Math.round(numericAmount).toString());
  }

  const desc = String(description || "").trim();
  if (desc) {
    params.set("des", desc);
  }

  return `https://qr.sepay.vn/img?${params.toString()}`;
};

const toSafeString = (value) => (value === undefined || value === null ? "" : String(value));
const escapeHtml = (value) =>
  toSafeString(value)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const normalizeInlineText = (value) =>
  escapeHtml(value).replace(/\s+/g, " ").trim();
const toInlineCode = (value) => {
  const text = normalizeInlineText(value);
  return text ? `<code>${text}</code>` : "";
};
const toPlainText = (value) =>
  toSafeString(value).replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();

const formatDateDMY = (value) => {
  if (!value) return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = value.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const direct = toSafeString(value).trim();
  if (!direct) return "";
  const ymdMatch = direct.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (ymdMatch) return `${ymdMatch[3]}/${ymdMatch[2]}/${ymdMatch[1]}`;
  const dmyMatch = direct.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (dmyMatch) return `${dmyMatch[1]}/${dmyMatch[2]}/${dmyMatch[3]}`;
  const parsed = new Date(direct);
  if (!Number.isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const fromYmd = formatYMDToDMY(direct);
  return fromYmd || direct;
};

const buildOrderCreatedMessage = (order, paymentNote) => {
  if (!order) return "";
  const orderCode =
    toSafeString(order.id_order || order.idOrder || order.order_code || order.orderCode).trim();
  const productName = toSafeString(order.id_product || order.idProduct).trim();
  const info = toSafeString(order.information_order || order.informationOrder).trim();
  const customer = toSafeString(order.customer || order.customer_name).trim();
  const registerDate =
    toSafeString(order.registration_date_display || order.registration_date_str).trim() ||
    formatDateDMY(order.order_date);
  const expiryDate =
    toSafeString(order.expiry_date_display || order.expiry_date_str).trim() ||
    formatDateDMY(order.order_expired);
  const days = Number(order.days || order.total_days || 0) || 0;
  const priceValue = `${formatCurrency(order.price || 0)} đ`;

  // Escape HTML cho các giá trị
  const escOrder = orderCode ? escapeHtml(orderCode) : "...";
  const escProduct = productName ? escapeHtml(productName) : "N/A";
  const escInfo = info ? escapeHtml(info) : "N/A";
  const escCustomer = customer ? escapeHtml(customer) : "N/A";
  const escRegister = registerDate ? escapeHtml(registerDate) : "";
  const escExpiry = expiryDate ? escapeHtml(expiryDate) : "";
  const escDays = days > 0 ? escapeHtml(`${days} ngày`) : "";
  const escPrice = escapeHtml(priceValue);
  const escStk = QR_ACCOUNT_NUMBER ? escapeHtml(QR_ACCOUNT_NUMBER) : "";
  const escPayment = paymentNote ? escapeHtml(paymentNote) : "";

  // Tạo separator line
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
};

const buildCopyKeyboard = ({ orderCode, paymentNote }) => {
  // Tắt copy buttons theo yêu cầu
  return null;
};

const sendTelegramMessage = async (payload) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  return postJson(url, payload);
};

const sendTelegramPhoto = async (payload) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
  return postJson(url, payload);
};

const sendOrderCreatedNotification = async (order) => {
  // Diagnostic logging
  logger.info("[Order][Telegram] sendOrderCreatedNotification called", {
    hasOrder: !!order,
    orderId: order?.id || order?.id_order || "N/A",
    SEND_ORDER_NOTIFICATION,
    hasBotToken: !!TELEGRAM_BOT_TOKEN,
    botTokenLength: TELEGRAM_BOT_TOKEN?.length || 0,
    TELEGRAM_CHAT_ID,
    TELEGRAM_ORDER_TOPIC_ID,
    SEND_ORDER_TO_TOPIC,
  });

  if (!SEND_ORDER_NOTIFICATION || !order || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    logger.warn("[Order][Telegram] Notification skipped", {
      reason: !SEND_ORDER_NOTIFICATION ? "SEND_ORDER_NOTIFICATION is false" :
              !order ? "No order provided" :
              !TELEGRAM_BOT_TOKEN ? "No bot token" :
              !TELEGRAM_CHAT_ID ? "No chat ID" : "Unknown",
      SEND_ORDER_NOTIFICATION,
      hasOrder: !!order,
      hasBotToken: !!TELEGRAM_BOT_TOKEN,
      hasChatId: !!TELEGRAM_CHAT_ID,
    });
    return;
  }

  const orderCode =
    toSafeString(order.id_order || order.idOrder || order.order_code || order.orderCode).trim();
  const paymentNote = `${QR_NOTE_PREFIX} ${orderCode}`.trim();
  const amount = roundGiaBanValue(order.price || 0);
  const qrUrl = buildSepayQrUrl({
    accountNumber: QR_ACCOUNT_NUMBER,
    bankCode: QR_BANK_CODE,
    amount,
    description: paymentNote,
  });
  const caption = buildOrderCreatedMessage(order, paymentNote);

  if (!caption) return;

  const buildPayload = (includeTopic = true, includeButtons = true) => {
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      parse_mode: "HTML",
    };
    if (qrUrl) {
      payload.photo = qrUrl;
      payload.caption = caption;
    } else {
      payload.text = caption;
    }
    if (includeButtons) {
      const keyboard = buildCopyKeyboard({ orderCode, paymentNote });
      if (keyboard) {
        payload.reply_markup = keyboard;
      }
    }
    if (includeTopic && SEND_ORDER_TO_TOPIC && Number.isFinite(TELEGRAM_ORDER_TOPIC_ID)) {
      payload.message_thread_id = TELEGRAM_ORDER_TOPIC_ID;
    }
    return payload;
  };

  const isThreadError = (err) => {
    const bodyText = String(err?.body || err?.message || "");
    const lowered = bodyText.toLowerCase();
    return (
      err?.status === 400 &&
      (lowered.includes("message_thread_id") ||
        lowered.includes("message thread not found") ||
        (lowered.includes("thread") && lowered.includes("not found")) ||
        (lowered.includes("topic") && lowered.includes("not found")))
    );
  };

  const isCopyButtonError = (err) => {
    const bodyText = String(err?.body || err?.message || "");
    const lowered = bodyText.toLowerCase();
    return (
      err?.status === 400 &&
      (lowered.includes("copy_text") ||
        lowered.includes("inline keyboard button") ||
        lowered.includes("reply_markup") ||
        lowered.includes("button_type_invalid") ||
        lowered.includes("can't parse inline keyboard button"))
    );
  };

  let includeTopic = true;
  let includeButtons = true;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      logger.info("[Order][Telegram] Sending notification", {
        attempt: attempt + 1,
        hasQrUrl: !!qrUrl,
        includeTopic,
        includeButtons,
        orderCode,
      });

      if (qrUrl) {
        await sendTelegramPhoto(buildPayload(includeTopic, includeButtons));
      } else {
        await sendTelegramMessage(buildPayload(includeTopic, includeButtons));
      }

      logger.info("[Order][Telegram] Notification sent successfully", {
        orderCode,
        attempt: attempt + 1,
      });
      return;
    } catch (err) {
      logger.warn("[Order][Telegram] Send attempt failed", {
        attempt: attempt + 1,
        error: err?.message,
        status: err?.status,
        body: err?.body,
      });

      let adjusted = false;
      if (includeTopic && isThreadError(err)) {
        logger.info("[Order][Telegram] Retrying without topic ID");
        includeTopic = false;
        adjusted = true;
      }
      if (includeButtons && isCopyButtonError(err)) {
        logger.info("[Order][Telegram] Retrying without copy buttons");
        includeButtons = false;
        adjusted = true;
      }
      if (!adjusted) {
        logger.error("[Order][Telegram] Send failed permanently", { 
          error: err?.message, 
          stack: err?.stack,
          status: err?.status,
          body: err?.body,
        });
        return;
      }
    }
  }
};

module.exports = {
  buildSepayQrUrl,
  buildOrderCreatedMessage,
  sendOrderCreatedNotification,
};
