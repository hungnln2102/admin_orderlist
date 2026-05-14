/**
 * Handler chính: lấy OTP từ hộp thư qua IMAP.
 * Cũng gói gọn 2 hàm phụ thuộc cùng cấu hình env: `fetchOtpFromAdobeEmail`, `hasOtpConfig`.
 *
 * Hỗ trợ:
 * - Đọc thông tin mailbox từ bảng mail_backup (theo mailBackupId).
 * - Fallback env: ADOBE_OTP_IMAP_* / MAILTEST / APPPASSWORD.
 * - Lọc theo người gửi (vd. chỉ mail Adobe) khi options.senderFilter='adobe'.
 * - So sánh thời gian mail với thời gian hiện tại (ADOBE_OTP_MAIL_MAX_AGE_MINUTES, 0 = tắt).
 * - Khi có nhiều mail: chọn mail gần nhất (UID cao nhất) rồi trả về OTP của mail đó.
 */

const logger = require("../../../utils/logger");
const { toUidList, getImapHostFromProvider, createImapClient } = require("../shared/imapClient");
const {
  stripHtml,
  extractOtpFromText,
  isAdobeEmail,
  isVerificationEmail,
} = require("../shared/otpExtractor");
const { getMailBackupById } = require("../repository/mailBackupRepo");

/**
 * Lấy mã OTP từ hộp thư qua IMAP.
 * @param {number|null} [mailBackupId] - ID bản ghi trong mail_backup (ưu tiên).
 * @param {Object} [options]
 * @param {boolean} [options.useEnvFallback=true] - Nếu không có mailBackupId, dùng env ADOBE_OTP_IMAP_* / MAILTEST / APPPASSWORD.
 * @param {string|null} [options.senderFilter] - 'adobe' = chỉ lấy mail từ Adobe; null = lấy bất kỳ mail có mã OTP.
 * @param {boolean} [options.debugToConsole=false] - true = in thêm [OTP DEBUG] ra console để dễ xem khi test.
 * @returns {Promise<string|null>} Mã OTP hoặc null.
 */
async function fetchOtpFromEmail(mailBackupId = null, options = {}) {
  const { useEnvFallback = true, senderFilter = null, debugToConsole = false } = options;
  const log = (msg, ...args) => {
    logger.info(msg, ...args);
    if (debugToConsole && String(msg).includes("[OTP DEBUG]")) {
      try {
        console.log(args.length ? require("util").format(msg, ...args) : msg);
      } catch (_) {
        console.log(msg, ...args);
      }
    }
  };
  let host, user, pass, backup = null;
  if (mailBackupId) {
    backup = await getMailBackupById(mailBackupId);
    if (!backup) return null;
    host = getImapHostFromProvider(backup.provider);
    user = backup.email;
    pass = backup.app_password;
  } else if (useEnvFallback) {
    user = process.env.ADOBE_OTP_IMAP_USER || process.env.MAILTEST;
    pass = process.env.ADOBE_OTP_IMAP_PASSWORD || process.env.APPPASSWORD || process.env["2FA"];
    host = process.env.ADOBE_OTP_IMAP_HOST || "imap.gmail.com";
  }
  if (!host || !user || !pass) {
    log("[mailOtpService] [OTP DEBUG] Không đủ cấu hình IMAP (host/user/pass) — bỏ qua.");
    if (debugToConsole) console.log("[mailOtpService] [OTP] Không đủ cấu hình IMAP — kiểm tra mail_backup_id hoặc ADOBE_OTP_IMAP_* / MAILTEST / APPPASSWORD.");
    return null;
  }
  if (debugToConsole) console.log("[mailOtpService] [OTP] Bắt đầu kết nối IMAP và tìm mail OTP...");
  const onlyAdobe = senderFilter === "adobe";
  const mask = (s) => (s && s.length > 4 ? s.slice(0, 2) + "***" + s.slice(-2) : "***");
  const aliasPrefixVal = backup?.alias_prefix ?? "(env)";
  log("[mailOtpService] [OTP DEBUG] Lấy OTP: host=%s, user=%s, onlyAdobe=%s, alias_prefix=%s", host, mask(user), onlyAdobe, aliasPrefixVal);
  try {
    const client = createImapClient({ host, user, pass });
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const minutesBack = parseInt(process.env.ADOBE_OTP_MAIL_MINUTES || "60", 10) || 60;
      const maxMails = parseInt(process.env.ADOBE_OTP_MAIL_MAX || "50", 10) || 50;
      const maxAgeMinutes = parseInt(process.env.ADOBE_OTP_MAIL_MAX_AGE_MINUTES || "0", 10) || 0;
      if (maxAgeMinutes > 0) log("[mailOtpService] [OTP DEBUG] Chỉ lấy OTP từ mail gửi trong %s phút gần đây (so với thời gian hiện tại).", maxAgeMinutes);
      let uidList = [];
      let list = await client.search({ since: new Date(Date.now() - minutesBack * 60 * 1000) }, { uid: true });
      uidList = toUidList(list);
      if (uidList.length === 0) {
        list = await client.search({ since: new Date(Date.now() - 24 * 60 * 60 * 1000) }, { uid: true });
        uidList = toUidList(list);
      }
      if (uidList.length === 0) {
        list = await client.search({ all: true }, { uid: true });
        uidList = toUidList(list);
      }
      const aliasPrefix = (backup && backup.alias_prefix) ? String(backup.alias_prefix).trim().toLowerCase() : "";
      const mailboxUser = (backup && backup.email) ? String(backup.email).trim().toLowerCase() : "";
      const aliasSameAsMailbox = aliasPrefix && mailboxUser && (aliasPrefix === mailboxUser || aliasPrefix.includes(mailboxUser) || mailboxUser.includes(aliasPrefix));
      if (aliasSameAsMailbox) log("[mailOtpService] [OTP DEBUG] alias_prefix trùng mailbox — chấp nhận mọi mail trong hộp thư (ưu tiên mail mới nhất).");
      let lastCode = null;
      const { simpleParser } = require("mailparser");
      const processOne = async (raw, uidForLog = null) => {
        try {
          const p = await simpleParser(Buffer.isBuffer(raw) ? raw : Buffer.from(raw));
          const htmlStripped = stripHtml(p.html || "");
          const bodyText = [(p.text || "").trim(), htmlStripped].filter(Boolean).join(" ");
          const fromHeader = [p.from?.text, p.from?.value?.map((a) => a.address).join(" ")].filter(Boolean).join(" ");
          const toHeader = [p.to?.text, p.to?.value?.map((a) => a.address).join(" ")].filter(Boolean).join(" ");
          const subject = (p.subject || "").slice(0, 80);
          const mailDate = p.date ? new Date(p.date) : null;
          const now = Date.now();
          const minutesAgo = mailDate ? Math.max(0, Math.floor((now - mailDate.getTime()) / 60000)) : null;
          const timeStr = mailDate ? `${String(mailDate.getHours()).padStart(2, "0")}:${String(mailDate.getMinutes()).padStart(2, "0")} (${minutesAgo} phút trước)` : "(không có ngày)";
          if (uidForLog != null) log("[mailOtpService] [OTP DEBUG] Mail UID %s — From: %s | Subject: %s | Thời gian: %s", uidForLog, (fromHeader || "").slice(0, 50), subject.slice(0, 50), timeStr);
          if (maxAgeMinutes > 0 && mailDate && (now - mailDate.getTime()) > maxAgeMinutes * 60 * 1000) {
            if (uidForLog != null) log("[mailOtpService] [OTP DEBUG] Mail UID %s: bỏ qua — mail cũ (gửi %s phút trước, chỉ lấy mail trong %s phút gần đây).", uidForLog, minutesAgo, maxAgeMinutes);
            return null;
          }
          const fullText = (subject + " " + fromHeader + " " + toHeader + " " + bodyText).replace(/\s+/g, " ");
          const fullLower = fullText.toLowerCase();
          const skipAliasCheck = !!backup;
          if (!skipAliasCheck && aliasPrefix && !aliasSameAsMailbox && !fullLower.includes(aliasPrefix)) {
            if (uidForLog != null) log("[mailOtpService] [OTP DEBUG] Mail UID %s: bỏ qua — không chứa alias_prefix.", uidForLog);
            return null;
          }
          if (onlyAdobe && !isAdobeEmail(fromHeader, fullText)) {
            if (uidForLog != null) log("[mailOtpService] [OTP DEBUG] Mail UID %s: bỏ qua — không phải From Adobe.", uidForLog);
            return null;
          }
          if (!isVerificationEmail(fullText)) {
            if (uidForLog != null) log("[mailOtpService] [OTP DEBUG] Mail UID %s: bỏ qua — không phải mail xác minh (subject: %s).", uidForLog, subject);
            return null;
          }
          const code = extractOtpFromText(bodyText || fullText);
          if (uidForLog != null) log("[mailOtpService] [OTP DEBUG] Mail UID %s: Đúng mail OTP — trích OTP: %s", uidForLog, code || "(không tìm thấy số trong nội dung)");
          return code;
        } catch (e) {
          if (uidForLog != null) log("[mailOtpService] [OTP DEBUG] Mail UID %s: lỗi parse — %s", uidForLog, e.message);
          return null;
        }
      };
      if (uidList.length > 0) {
        const nowStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        log("[mailOtpService] [OTP DEBUG] Thời gian hiện tại: %s — IMAP trả về %s mail, xử lý từ mới nhất (UID cao nhất) xuống.", nowStr, uidList.length);
        const uids = uidList.slice(-Math.min(maxMails, uidList.length));
        let processed = 0;
        for (let i = uids.length - 1; i >= 0; i--) {
          const uid = uids[i];
          const msg = await client.fetchOne(uid, { source: true }, { uid: true });
          if (!msg?.source) {
            log("[mailOtpService] [OTP DEBUG] Mail UID %s: bỏ qua — không có nội dung (source rỗng).", uid);
            continue;
          }
          processed++;
          lastCode = await processOne(msg.source, uid);
          if (lastCode) {
            log("[mailOtpService] [OTP DEBUG] Đã chọn mail UID %s (mail gần nhất đúng điều kiện), trả về OTP=[%s]", uid, lastCode);
            break;
          }
        }
        if (!lastCode && processed > 0) log("[mailOtpService] [OTP DEBUG] Đã quét %s mail, không có mail nào trả về OTP. Xem các dòng trên để biết từng mail bị bỏ qua vì sao.", processed);
      } else {
        const exists = client.mailbox?.exists ?? 0;
        log("[mailOtpService] [OTP DEBUG] Fallback fetch theo sequence, mailbox.exists=%s", exists);
        if (exists > 0) {
          const start = Math.max(1, exists - maxMails + 1);
          const range = `${start}:${exists}`;
          const collected = [];
          for await (const msg of client.fetch(range, { source: true })) {
            if (msg?.source) collected.push(msg.source);
          }
          for (let j = collected.length - 1; j >= 0; j--) {
            lastCode = await processOne(collected[j], `seq_${j}`);
            if (lastCode) {
              log("[mailOtpService] [OTP DEBUG] Đã chọn mail index %s, OTP=[%s]", j, lastCode);
              break;
            }
          }
        }
      }
      const resultMsg = lastCode != null ? `OTP=[${lastCode}]` : "null (không tìm thấy)";
      log("[mailOtpService] [OTP DEBUG] fetchOtpFromEmail kết quả: %s", resultMsg);
      if (debugToConsole) console.log("[mailOtpService] [OTP] Kết quả trả về:", lastCode != null ? "có mã, length=" + String(lastCode).length : "null");
      return lastCode;
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (err) {
    logger.warn("[mailOtpService] fetchOtpFromEmail lỗi: %s", err.message);
    return null;
  }
}

/**
 * Lấy mã OTP từ mail Adobe (chỉ mail từ Adobe, dùng cho flow login Adobe).
 * @param {number|null} [mailBackupId]
 * @returns {Promise<string|null>}
 */
async function fetchOtpFromAdobeEmail(mailBackupId = null) {
  return fetchOtpFromEmail(mailBackupId, { useEnvFallback: true, senderFilter: "adobe" });
}

/**
 * Kiểm tra có cấu hình để lấy OTP qua mail không (mail_backup hoặc env).
 * @param {number|null} [mailBackupId]
 * @returns {Promise<boolean>}
 */
async function hasOtpConfig(mailBackupId = null) {
  if (mailBackupId) {
    const backup = await getMailBackupById(mailBackupId);
    if (backup) return true;
  }
  const user = process.env.ADOBE_OTP_IMAP_USER || process.env.MAILTEST;
  const pass = process.env.ADOBE_OTP_IMAP_PASSWORD || process.env.APPPASSWORD || process.env["2FA"];
  const host = process.env.ADOBE_OTP_IMAP_HOST || (user ? "imap.gmail.com" : null);
  return !!(host && user && pass);
}

module.exports = {
  fetchOtpFromEmail,
  fetchOtpFromAdobeEmail,
  hasOtpConfig,
};
