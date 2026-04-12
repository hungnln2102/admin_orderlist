/**
 * Gửi thông báo Telegram khi tài khoản Adobe không còn gói (license hết hạn).
 * Gửi vào topic ZERO_DAYS_TOPIC_ID.
 * Nội dung: tài khoản, org_name, danh sách user từ users_snapshot.
 */

const logger = require("../../utils/logger");
const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  ZERO_DAYS_TOPIC_ID,
} = require("./constants");
const { sendTelegramMessage } = require("./telegramApi");
const { isThreadError } = require("./errorHelpers");

/**
 * Từ users_snapshot (JSON string hoặc mảng) trả về danh sách user dạng text: "- email (name)".
 * @param {string|object[]|null} usersSnapshot
 * @returns {string}
 */
function formatUsersList(usersSnapshot) {
  let list = [];
  if (Array.isArray(usersSnapshot)) {
    list = usersSnapshot;
  } else if (typeof usersSnapshot === "string" && usersSnapshot.trim()) {
    try {
      const parsed = JSON.parse(usersSnapshot);
      list = Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      list = [];
    }
  }
  if (list.length === 0) return "— (không có dữ liệu)";
  return list
    .map((u) => {
      const email = (u && (u.email || u.Email || u.mail)).toString().trim() || "—";
      const name = (u && (u.name || u.Name)).toString().trim() || "";
      return name ? `• ${email} (${name})` : `• ${email}`;
    })
    .join("\n");
}

/**
 * Gửi thông báo Telegram cho các tài khoản Adobe hết gói.
 * @param {Array<{ email: string, org_name?: string, users_snapshot?: string|object[] }>} accounts
 */
async function sendAdobeZeroDaysNotification(accounts = []) {
  logger.info("[Adobe][Telegram] sendAdobeZeroDaysNotification", {
    count: accounts.length,
    hasBotToken: !!TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    ZERO_DAYS_TOPIC_ID,
  });

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    logger.warn("[Adobe][Telegram] Bỏ qua: thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID");
    return;
  }

  if (!accounts || accounts.length === 0) {
    logger.info("[Adobe][Telegram] Không có tài khoản hết gói để gửi.");
    return;
  }

  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    const email = (acc.email || "").toString().trim() || "—";
    const orgName = (acc.org_name ?? acc.orgName ?? "").toString().trim() || "—";
    const usersList = formatUsersList(acc.users_snapshot ?? acc.usersSnapshot ?? null);

    const text = [
      "⚠️ <b>Adobe: Tài khoản không còn gói</b>",
      "",
      "<b>Tài khoản:</b> " + escapeHtml(email),
      "<b>Org name:</b> " + escapeHtml(orgName),
      "",
      "<b>Danh sách user trong tài khoản:</b>",
      usersList,
    ].join("\n");

    const payload = {
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "HTML",
    };
    if (Number.isFinite(ZERO_DAYS_TOPIC_ID)) {
      payload.message_thread_id = ZERO_DAYS_TOPIC_ID;
    }

    try {
      await sendTelegramMessage(payload);
      logger.info("[Adobe][Telegram] Đã gửi thông báo hết gói", { email, index: i + 1, total: accounts.length });
    } catch (err) {
      if (isThreadError(err) && payload.message_thread_id != null) {
        const { message_thread_id: _t, ...rest } = payload;
        try {
          await sendTelegramMessage(rest);
          logger.info("[Adobe][Telegram] Đã gửi (fallback không topic)", { email, index: i + 1 });
        } catch (err2) {
          logger.error("[Adobe][Telegram] Gửi thất bại", { email, error: err2?.message });
        }
      } else {
        logger.error("[Adobe][Telegram] Gửi thất bại", { email, error: err?.message });
      }
    }
    if (i < accounts.length - 1) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
}

function escapeHtml(s) {
  if (typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

module.exports = {
  sendAdobeZeroDaysNotification,
  formatUsersList,
};
