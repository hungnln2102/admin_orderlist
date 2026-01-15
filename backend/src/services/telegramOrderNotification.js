const https = require("https");
const dns = require("dns");
const { formatYMDToDMY } = require("../utils/normalizers");

const HTTP_TIMEOUT_MS = 10_000;

const DEFAULT_NOTIFICATION_GROUP_ID = "-1002934465528";
const DEFAULT_ORDER_TOPIC_ID = 1;
const DEFAULT_QR_ACCOUNT_NUMBER = "9183400998";
const DEFAULT_QR_BANK_CODE = "VPB";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID =
  process.env.ORDER_NOTIFICATION_CHAT_ID ||
  process.env.TELEGRAM_CHAT_ID ||
  DEFAULT_NOTIFICATION_GROUP_ID;
const TELEGRAM_ORDER_TOPIC_ID = Number.parseInt(
  process.env.ORDER_NOTIFICATION_TOPIC_ID ||
    process.env.TELEGRAM_ORDER_TOPIC_ID ||
    DEFAULT_ORDER_TOPIC_ID,
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
  DEFAULT_QR_ACCOUNT_NUMBER;
const QR_BANK_CODE =
  process.env.ORDER_QR_BANK_CODE ||
  process.env.QR_BANK_CODE ||
  DEFAULT_QR_BANK_CODE;
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
      console.warn("[Order][Telegram] Fetch failed, retrying with https client", {
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
  const priceValue = `${formatCurrency(order.price || 0)} d`;

  const EMOJI_CHECK = "\u2705";
  const EMOJI_BELL = "\uD83D\uDD14";
  const EMOJI_PIN = "\uD83D\uDCCC";
  const EMOJI_RECEIPT = "\uD83E\uDDFE";
  const EMOJI_CALENDAR = "\uD83D\uDCC5";
  const EMOJI_HOURGLASS = "\u23F3";
  const EMOJI_MONEY = "\uD83D\uDCB0";
  const EMOJI_PERSON = "\uD83D\uDC64";
  const EMOJI_CARD = "\uD83D\uDCB3";

  const codeOrder = orderCode ? toInlineCode(orderCode) : "...";
  const codeProduct = productName ? toInlineCode(productName) : "N/A";
  const codeInfo = info ? toInlineCode(info) : "N/A";
  const codeCustomer = customer ? toInlineCode(customer) : "N/A";
  const displayRegister = registerDate ? toPlainText(registerDate) : "";
  const displayExpiry = expiryDate ? toPlainText(expiryDate) : "";
  const displayDays = days > 0 ? toPlainText(`${days} ngày`) : "";
  const displayPrice = toPlainText(priceValue);
  const codeStk = QR_ACCOUNT_NUMBER ? toInlineCode(QR_ACCOUNT_NUMBER) : "";
  const codePayment = paymentNote ? toInlineCode(paymentNote) : "";

  const lines = [
    `${EMOJI_CHECK} Đơn hàng ${codeOrder || "..."} đã được tạo thành công!`,
    "",
    `${EMOJI_BELL} <b>THÔNG TIN SẢN PHẨM</b>`,
    `${EMOJI_PIN} Tên Sản Phẩm: ${codeProduct}`,
    `${EMOJI_RECEIPT} Thông Tin Đơn Hàng: ${codeInfo}`,
    displayRegister ? `${EMOJI_CALENDAR} Ngày Bắt đầu: ${displayRegister}` : null,
    displayDays ? `${EMOJI_HOURGLASS} Thời hạn: ${displayDays}` : null,
    displayExpiry ? `${EMOJI_CALENDAR} Ngày Hết hạn: ${displayExpiry}` : null,
    `${EMOJI_MONEY} Giá bán: ${displayPrice}`,
    "",
    `${EMOJI_PERSON} <b>THÔNG TIN KHÁCH HÀNG</b>`,
    `${EMOJI_PIN} Tên Khách Hàng: ${codeCustomer}`,
    "",
    `${EMOJI_CARD} <b>HƯỚNG DẪN THANH TOÁN</b>`,
    codeStk ? `STK: ${codeStk}` : null,
    codePayment ? `Nội dung: ${codePayment}` : null,
  ].filter(Boolean);

  return lines.join("\n");
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
  if (!SEND_ORDER_NOTIFICATION || !order || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
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
      if (qrUrl) {
        await sendTelegramPhoto(buildPayload(includeTopic, includeButtons));
      } else {
        await sendTelegramMessage(buildPayload(includeTopic, includeButtons));
      }
      return;
    } catch (err) {
      let adjusted = false;
      if (includeTopic && isThreadError(err)) {
        includeTopic = false;
        adjusted = true;
      }
      if (includeButtons && isCopyButtonError(err)) {
        includeButtons = false;
        adjusted = true;
      }
      if (!adjusted) {
        console.error("[Order][Telegram] Send failed", err);
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
