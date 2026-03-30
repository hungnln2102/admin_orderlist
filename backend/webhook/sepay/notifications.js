const https = require("https");
const dns = require("dns");
const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  TELEGRAM_TOPIC_ID,
  SEND_RENEWAL_TO_TOPIC,
} = require("./config");
const {
  formatCurrency,
  normalizeAmount,
  parsePaidDate,
  extractSenderFromContent,
} = require("./utils");
const logger = require("../../src/utils/logger");

const HTTP_TIMEOUT_MS = 10_000;
const TRANSIENT_FETCH_ERROR_CODES = new Set([
  "ABORT_ERR",
  "UND_ERR_ABORTED",
  "UND_ERR_CONNECT_TIMEOUT",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
]);

const preferIpv4Lookup = (hostname, options, cb) =>
  dns.lookup(hostname, { ...options, family: 4, all: false }, (err, address, family) => {
    if (err || !address) {
      return dns.lookup(hostname, { ...options, all: false }, cb);
    }
    cb(null, address, family);
  });

const getErrorCode = (err) =>
  String(err?.code || err?.cause?.code || "")
    .trim()
    .toUpperCase();

const getErrorMessage = (err) =>
  [err?.message, err?.cause?.message].filter(Boolean).join(" | ");

const isTransientFetchError = (err, timeoutSignal) => {
  const code = getErrorCode(err);
  const message = getErrorMessage(err);

  return (
    timeoutSignal?.aborted === true ||
    err?.name === "AbortError" ||
    err?.name === "TimeoutError" ||
    TRANSIENT_FETCH_ERROR_CODES.has(code) ||
    /fetch failed/i.test(message) ||
    /aborted due to timeout/i.test(message) ||
    /timed out/i.test(message) ||
    /socket hang up/i.test(message) ||
    /network is unreachable/i.test(message)
  );
};

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
      const timeoutError = new Error(`Request timed out after ${HTTP_TIMEOUT_MS}ms`);
      timeoutError.code = "ETIMEDOUT";
      req.destroy(timeoutError);
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
      const code = getErrorCode(err);
      if (!isTransientFetchError(err, timeoutSignal)) {
        throw err;
      }
      logger.warn("[Telegram] Fetch failed, retrying with https client", {
        name: err?.name,
        code,
        status: err?.status,
        message: err?.message,
      });
    }
  }

  return sendWithHttps(url, payload, headers);
};

const buildRenewalMessage = (orderCode, result) => {
  if (!result) return `Don ${orderCode}: Khong co ket qua gia han`;

  const status = result.success
    ? "Gia Hạn Thành Công"
    : result.processType === "skipped"
    ? "Bỏ Qua"
    : "Lỗi Gia Hạn";

  // New rich notification for successful renewals
  if (result.success && result.details && typeof result.details === "object") {
    const d = result.details;
    const lines = [
      "✅ GIA HẠN TỰ ĐỘNG THÀNH CÔNG",
      "──── Thông Tin Đơn Hàng ────",
      `🪪 Mã Đơn: ${orderCode}`,
      `📦 Sản Phẩm: ${d.SAN_PHAM || ""}`,
      `ℹ️ Thông tin: ${d.THONG_TIN_DON || ""}`,
      d.SLOT ? `🎯 Slot: ${d.SLOT}` : null,
      `📅 Ngày Đăng Ký: ${d.NGAY_DANG_KY || ""}`,
      `📆 Hết Hạn: ${d.HET_HAN || ""}`,
      `💵 Giá Bán: ${formatCurrency(d.GIA_BAN)}`,
      "──── Thông Tin Nhà Cung Cấp ────",
      d.NGUON ? `🏷 Nhà Cung Cấp: ${d.NGUON}` : null,
      `💰 Giá Nhập: ${formatCurrency(d.GIA_NHAP)}`,
    ].filter(Boolean);
    return lines.join("\n");
  }

  if (!result.details || typeof result.details !== "object") {
    return `Đơn ${orderCode}: ${status}${result.details ? ` - ${result.details}` : ""}`;
  }

  const d = result.details;
  const lines = [
    `Đơn ${orderCode}: ${status}`,
    `- Sản Phẩm: ${d.SAN_PHAM || ""}`,
    `- Thông Tin: ${d.THONG_TIN_DON || ""}`,
    d.SLOT ? `- Slot: ${d.SLOT}` : null,
    `- Ngày Đăng Ký: ${d.NGAY_DANG_KY || ""}`,
    `- Hết Hạn: ${d.HET_HAN || ""}`,
    `- Giá Bán: ${formatCurrency(d.GIA_BAN)}`,
    `- Giá Nhập: ${formatCurrency(d.GIA_NHAP)}`,
  ].filter(Boolean);
  return lines.join("\n");
};

const sendRenewalNotification = async (orderCode, renewalResult) => {
  const sendEnabled =
    SEND_RENEWAL_TO_TOPIC !== false && String(SEND_RENEWAL_TO_TOPIC) !== "false";
  if (!renewalResult || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    logger.warn("[Renewal][Telegram] Skip send: missing data/config", {
      hasResult: Boolean(renewalResult),
      hasToken: Boolean(TELEGRAM_BOT_TOKEN),
      hasChat: Boolean(TELEGRAM_CHAT_ID),
      sendEnabled,
    });
    return;
  }

  const text = buildRenewalMessage(orderCode, renewalResult);
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const buildPayload = (includeTopic = true) => {
    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text,
    };
    if (includeTopic && sendEnabled && Number.isFinite(TELEGRAM_TOPIC_ID)) {
      payload.message_thread_id = TELEGRAM_TOPIC_ID;
    }
    return payload;
  };

  try {
    logger.debug("[Renewal][Telegram] Sending notification", {
      orderCode,
      chat: TELEGRAM_CHAT_ID,
      topic: TELEGRAM_TOPIC_ID,
    });
    await postJson(url, buildPayload(true));
  } catch (err) {
    const bodyText = String(err?.body || err?.message || "");
    const lowered = bodyText.toLowerCase();
    const isThreadError =
      err?.status === 400 &&
      (lowered.includes("message_thread_id") ||
        lowered.includes("message thread not found") ||
        (lowered.includes("thread") && lowered.includes("not found")) ||
        (lowered.includes("topic") && lowered.includes("not found")));

    if (isThreadError) {
      logger.warn(
        "Thông báo gia hạn Telegram thất bại do thiếu chủ đề; đang thử lại mà không có topic_id",
        { error: err?.message, status: err?.status }
      );
      try {
        await postJson(url, buildPayload(false));
        logger.info("Thông báo gia hạn Telegram được gửi lại mà không có topic_id sau lỗi chủ đề", { orderCode });
        return;
      } catch (retryErr) {
        logger.error("Gửi thông báo gia hạn Telegram thất bại sau khi thử lại", { orderCode, error: retryErr?.message });
        return;
      }
    }

    logger.error("Không thể gửi thông báo gia hạn Telegram", { orderCode, error: err?.message, stack: err?.stack });
  }
};

// Stubbed payment notification (disabled)
const sendPaymentNotification = async () => {
  return;
};

module.exports = {
  postJson,
  isTransientFetchError,
  buildRenewalMessage,
  sendRenewalNotification,
  sendPaymentNotification,
};
