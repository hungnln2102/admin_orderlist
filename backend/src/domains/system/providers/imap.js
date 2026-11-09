const { ImapFlow } = require("imapflow");
const { getImapConfig, assertImapConfigured } = require("./providerConfig");
const { extractOtpCode } = require("./otpProviderUtils");

async function fetchOtpFromImap(input, { includeDetails = false } = {}) {
  const config = getImapConfig();
  assertImapConfigured(config);
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
    logger: false,
    connectionTimeout: config.timeoutMs,
    greetingTimeout: config.timeoutMs,
    socketTimeout: config.timeoutMs,
  });
  const query = String(input || "").trim().toLowerCase();
  if (!query) throw new Error("Vui lòng cung cấp email cần tra cứu IMAP.");
  let result = null;
  try {
    await client.connect();
    const lock = await client.getMailboxLock(config.mailbox);
    try {
      for await (const message of client.fetch({ seen: false }, { envelope: true, source: true, uid: true }, { uid: false })) {
        const from = (message.envelope?.from || []).map((item) => item.address || "").join(",").toLowerCase();
        const subject = message.envelope?.subject || "";
        const source = message.source?.toString("utf8") || "";
        const haystack = `${from}\n${subject}\n${source}`.toLowerCase();
        if (!haystack.includes(query)) continue;
        if (config.allowedSenders.length > 0 && !config.allowedSenders.some((sender) => from.includes(sender))) continue;
        const otp = extractOtpCode(subject) || extractOtpCode(source);
        if (otp) {
          result = { otp, rawData: { from, subject, uid: message.uid } };
          break;
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
  return includeDetails ? result || { otp: null, rawData: null } : result?.otp || null;
}

module.exports = { fetchOtpFromImap };