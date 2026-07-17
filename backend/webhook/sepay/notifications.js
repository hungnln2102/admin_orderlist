const https = require("https");
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
const logger = require("@/utils/logger");

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

/** IPv4 cho Telegram API; tránh custom dns.lookup (Node 20+ autoSelectFamily / options không tương thích → IP undefined). */
const httpsAgentPreferIpv4 = new https.Agent({ keepAlive: true, family: 4 });

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
        agent: httpsAgentPreferIpv4,
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
  // Telegram sends are not idempotent; use one transport per payload.
  const payload = JSON.stringify(data);
  const headers = { "Content-Type": "application/json" };
  return sendWithHttps(url, payload, headers);
};

const buildOrderDetailsBlock = (orderCode, result, commonOverrides = {}) => {
  if (!result) return `Đơn ${orderCode}: Không có kết quả gia hạn`;

  const status = result.success
    ? "Gia Hạn Thành Công"
    : result.processType === "skipped"
    ? "Bỏ Qua"
    : "Lỗi Gia Hạn";

  if (result.success && result.details && typeof result.details === "object") {
    const d = result.details;
    const lines = [
      `🪪 Mã Đơn: ${orderCode}`,
      !commonOverrides.hasOwnProperty('SAN_PHAM') && d.SAN_PHAM ? `📦 Sản Phẩm: ${d.SAN_PHAM}` : null,
      `ℹ️ Thông tin: ${d.THONG_TIN_DON || ""}`,
      d.SLOT ? `🎯 Slot: ${d.SLOT}` : null,
      !commonOverrides.hasOwnProperty('NGAY_DANG_KY') && d.NGAY_DANG_KY ? `📅 Ngày Đăng Ký: ${d.NGAY_DANG_KY}` : null,
      !commonOverrides.hasOwnProperty('HET_HAN') && d.HET_HAN ? `📆 Hết Hạn: ${d.HET_HAN}` : null,
      !commonOverrides.hasOwnProperty('GIA_BAN') && d.GIA_BAN !== undefined ? `💵 Giá Bán: ${formatCurrency(d.GIA_BAN)}` : null,
    ];

    const showSupplierSection = (!commonOverrides.hasOwnProperty('NGUON') && d.NGUON) || (!commonOverrides.hasOwnProperty('GIA_NHAP') && d.GIA_NHAP !== undefined);
    
    if (showSupplierSection) {
      lines.push("──── Thông Tin Nhà Cung Cấp ────");
      if (!commonOverrides.hasOwnProperty('NGUON') && d.NGUON) lines.push(`🏷 Nhà Cung Cấp: ${d.NGUON}`);
      if (!commonOverrides.hasOwnProperty('GIA_NHAP') && d.GIA_NHAP !== undefined) lines.push(`💰 Giá Nhập: ${formatCurrency(d.GIA_NHAP)}`);
    }

    return lines.filter(Boolean).join("\n");
  }

  if (!result.details || typeof result.details !== "object") {
    return `Đơn ${orderCode}: ${status}${result.details ? ` - ${result.details}` : ""}`;
  }

  const d = result.details;
  const lines = [
    `Đơn ${orderCode}: ${status}`,
    !commonOverrides.hasOwnProperty('SAN_PHAM') && d.SAN_PHAM ? `- Sản Phẩm: ${d.SAN_PHAM}` : null,
    `- Thông Tin: ${d.THONG_TIN_DON || ""}`,
    d.SLOT ? `- Slot: ${d.SLOT}` : null,
    !commonOverrides.hasOwnProperty('NGAY_DANG_KY') && d.NGAY_DANG_KY ? `- Ngày Đăng Ký: ${d.NGAY_DANG_KY}` : null,
    !commonOverrides.hasOwnProperty('HET_HAN') && d.HET_HAN ? `- Hết Hạn: ${d.HET_HAN}` : null,
    !commonOverrides.hasOwnProperty('GIA_BAN') && d.GIA_BAN !== undefined ? `- Giá Bán: ${formatCurrency(d.GIA_BAN)}` : null,
    !commonOverrides.hasOwnProperty('GIA_NHAP') && d.GIA_NHAP !== undefined ? `- Giá Nhập: ${formatCurrency(d.GIA_NHAP)}` : null,
  ].filter(Boolean);
  return lines.join("\n");
};

const buildRenewalMessage = (orderCode, result) => {
  const isSuccess = result?.success;
  const header = isSuccess ? "✅ GIA HẠN TỰ ĐỘNG THÀNH CÔNG\n──── Thông Tin Đơn Hàng ────\n" : "❌ LỖI GIA HẠN TỰ ĐỘNG\n──── Thông Tin Đơn Hàng ────\n";
  return header + buildOrderDetailsBlock(orderCode, result);
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

const sendGroupedRenewalNotification = async (items) => {
  const sendEnabled =
    SEND_RENEWAL_TO_TOPIC !== false && String(SEND_RENEWAL_TO_TOPIC) !== "false";
  if (!items || !items.length || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const isAllSuccess = items.every(i => i.result?.success);
  const isAllFailed = items.every(i => !i.result?.success);
  
  let header = "";
  if (isAllSuccess) {
    header = `✅ GIA HẠN TỰ ĐỘNG THÀNH CÔNG${items.length > 1 ? ` (${items.length} ĐƠN)` : ""}`;
  } else if (isAllFailed) {
    header = `❌ LỖI GIA HẠN TỰ ĐỘNG${items.length > 1 ? ` (${items.length} ĐƠN)` : ""}`;
  } else {
    header = `⚠️ GIA HẠN TỰ ĐỘNG (THÀNH CÔNG & LỖI) (${items.length} ĐƠN)`;
  }

  // Tối ưu thông tin chung
  const allMatch = (key) => {
    if (items.length === 0) return false;
    const firstVal = items[0].result?.details?.[key];
    if (firstVal === undefined || firstVal === null) return false;
    return items.every(i => i.result?.details?.[key] === firstVal);
  };

  const commonOverrides = {};
  const checkFields = ['SAN_PHAM', 'NGAY_DANG_KY', 'HET_HAN', 'GIA_BAN', 'NGUON', 'GIA_NHAP'];
  
  checkFields.forEach(field => {
    if (allMatch(field)) {
      commonOverrides[field] = items[0].result.details[field];
    }
  });

  if (Object.keys(commonOverrides).length > 0) {
    header += `\n──── Thông Tin Chung ────`;
    if (commonOverrides.hasOwnProperty('SAN_PHAM')) header += `\n📦 Sản Phẩm: ${commonOverrides.SAN_PHAM}`;
    if (commonOverrides.hasOwnProperty('NGAY_DANG_KY')) header += `\n📅 Ngày Đăng Ký: ${commonOverrides.NGAY_DANG_KY}`;
    if (commonOverrides.hasOwnProperty('HET_HAN')) header += `\n📆 Hết Hạn: ${commonOverrides.HET_HAN}`;
    if (commonOverrides.hasOwnProperty('GIA_BAN')) header += `\n💵 Giá Bán: ${formatCurrency(commonOverrides.GIA_BAN)}`;
    
    // Nếu có NGUON hoặc GIA_NHAP, nhóm riêng
    if (commonOverrides.hasOwnProperty('NGUON') || commonOverrides.hasOwnProperty('GIA_NHAP')) {
      header += `\n──── Chung: Nhà Cung Cấp ────`;
      if (commonOverrides.hasOwnProperty('NGUON')) header += `\n🏷 Nhà Cung Cấp: ${commonOverrides.NGUON}`;
      if (commonOverrides.hasOwnProperty('GIA_NHAP')) header += `\n💰 Giá Nhập: ${formatCurrency(commonOverrides.GIA_NHAP)}`;
    }
  }

  header += `\n──── Chi Tiết Các Đơn ────`;

  const detailsBlocks = items.map(item => buildOrderDetailsBlock(item.orderCode, item.result, commonOverrides));
  const text = header + "\n" + detailsBlocks.join("\n━━━━━━━━━━━━━━━━━━━━\n");
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
      try {
        await postJson(url, buildPayload(false));
        return;
      } catch (retryErr) {
        logger.error("Gửi thông báo gia hạn gộp Telegram thất bại sau khi thử lại", { error: retryErr?.message });
        return;
      }
    }
    logger.error("Không thể gửi thông báo gia hạn gộp Telegram", { error: err?.message });
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
  sendGroupedRenewalNotification,
  sendPaymentNotification,
};
