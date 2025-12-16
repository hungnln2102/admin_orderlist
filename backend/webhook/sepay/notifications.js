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

const postJson = (url, data) =>
  new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);

    if (typeof fetch === "function") {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      })
        .then(async (res) => {
          if (!res.ok) {
            const err = new Error(`Request failed with status ${res.status}`);
            err.status = res.status;
            err.body = await res.text().catch(() => "");
            reject(err);
            return;
          }
          resolve(await res.text());
        })
        .catch(reject);
      return;
    }

    const options = new URL(url);
    options.method = "POST";
    options.headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    };

    const req = https.request(options, (res) => {
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
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });

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
    console.warn("[Renewal][Telegram] Skip send: missing data/config", {
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
    console.log("[Renewal][Telegram] Sending notification", {
      orderCode,
      chat: TELEGRAM_CHAT_ID,
      topic: TELEGRAM_TOPIC_ID,
    });
    await postJson(url, buildPayload(true));
  } catch (err) {
    const bodyText = String(err?.body || err?.message || "");
    const isThreadError =
      err?.status === 400 &&
      bodyText.toLowerCase().includes("message_thread_id") &&
      bodyText.toLowerCase().includes("topic");

    if (isThreadError) {
      console.warn(
        "Telegram renewal notification failed with topic; retrying without topic_id",
        err
      );
      try {
        await postJson(url, buildPayload(false));
        console.log("Telegram renewal notification resent without topic_id after thread error");
        return;
      } catch (retryErr) {
        console.error("Failed to send Telegram renewal notification after retry:", retryErr);
        return;
      }
    }

    console.error("Failed to send Telegram renewal notification:", err);
  }
};

const buildPaymentMessage = (orderCode, transaction) => {
  if (!transaction) return "";
  const amount = normalizeAmount(transaction.transfer_amount || transaction.amount_in);
  const paidDate = parsePaidDate(transaction.transaction_date || transaction.transaction_date_raw);
  const receiverAccount = transaction.account_number || transaction.accountNumber || "";
  const content =
    transaction.description || transaction.transaction_content || transaction.note || "";
  const senderParsed = extractSenderFromContent(
    transaction.transaction_content || transaction.description
  );

  const parts = [
    `[THU TIEN] ${orderCode || "Khong ro don"}`,
    `- So tien: ${formatCurrency(amount)}`,
    `- Ngay: ${paidDate}`,
    senderParsed ? `- Nguoi gui: ${senderParsed}` : null,
    receiverAccount ? `- Tai khoan nhan: ${receiverAccount}` : null,
    content ? `- Noi dung: ${content}` : null,
  ].filter(Boolean);

  return parts.join("\n");
};

const sendPaymentNotification = async (orderCode, transaction) => {
  // Payment notifications to Telegram are currently disabled.
  return;
  // The code below is intentionally left for potential re-enable:
  // if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  // const text = buildPaymentMessage(orderCode, transaction);
  // if (!text) return;
  // const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  // const payload = { chat_id: TELEGRAM_CHAT_ID, text };
  // if (Number.isFinite(TELEGRAM_TOPIC_ID)) {
  //   payload.message_thread_id = TELEGRAM_TOPIC_ID;
  // }
  // await postJson(url, payload);
};

module.exports = {
  postJson,
  buildRenewalMessage,
  sendRenewalNotification,
  buildPaymentMessage,
  sendPaymentNotification,
};
