const { db, TABLES, COLS } = require("@/db");
const { decryptMailboxPassword, encryptMailboxPassword } = require("./vpbankMailboxSecret");

const CONFIG_KEY = "VPBANK_MAILBOX_CONFIG";
const GMAIL_IMAP_HOST = "imap.gmail.com";
const GMAIL_IMAP_PORT = 993;
const C_CONFIG = COLS.SYSTEM_CONFIGS;
const C_CHECKPOINT = COLS.EMAIL_SYNC_CHECKPOINTS;

function getImapFlowClass() {
  try {
    const { ImapFlow } = require("imapflow");
    return ImapFlow;
  } catch (err) {
    throw new Error("Thư viện 'imapflow' chưa được cài đặt hoặc nạp thành công: " + err.message);
  }
}

function parseConfig(value) {
  if (!value) return {};
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    throw new Error("VPBank mailbox configuration is not valid JSON.");
  }
}

async function getStoredConfig() {
  const row = await db(TABLES.SYSTEM_CONFIGS)
    .where(C_CONFIG.CONFIG_KEY, CONFIG_KEY)
    .first();
  return parseConfig(row?.[C_CONFIG.CONFIG_VALUE]);
}

function normalizeConfig(stored, appPassword) {
  return {
    email: String(stored.email || "").trim().toLowerCase(),
    appPassword,
    host: GMAIL_IMAP_HOST,
    port: GMAIL_IMAP_PORT,
    tls: true,
    syncMode: stored.syncMode === "POLLING" ? "POLLING" : "IDLE",
    isActive: stored.isActive === true,
  };
}

async function getRawConfig() {
  const stored = await getStoredConfig();
  if (stored.appPassword) {
    throw new Error("Legacy plaintext VPBank mailbox password detected. Re-enter the App Password after configuring encryption.");
  }
  const appPassword = stored.appPasswordEncrypted
    ? decryptMailboxPassword(stored.appPasswordEncrypted)
    : "";
  return normalizeConfig(stored, appPassword);
}

async function getMaskedConfig() {
  const stored = await getStoredConfig();
  const checkpoint = await db(TABLES.EMAIL_SYNC_CHECKPOINTS)
    .where(C_CHECKPOINT.PROVIDER, "VPBANK_GMAIL")
    .orderBy(C_CHECKPOINT.UPDATED_AT, "desc")
    .first();
  return {
    email: String(stored.email || "").trim().toLowerCase(),
    hasAppPassword: Boolean(stored.appPasswordEncrypted || stored.appPassword),
    requiresPasswordRotation: Boolean(stored.appPassword),
    host: GMAIL_IMAP_HOST,
    port: GMAIL_IMAP_PORT,
    tls: true,
    syncMode: stored.syncMode === "POLLING" ? "POLLING" : "IDLE",
    isActive: stored.isActive === true,
    workerState: checkpoint?.[C_CHECKPOINT.WORKER_STATE] || "STOPPED",
  };
}

async function saveMailboxConfig(payload, { onConfigChanged } = {}) {
  const stored = await getStoredConfig();
  const email = String(payload.email || stored.email || "").trim().toLowerCase();
  if (!email) throw new Error("Gmail email is required.");

  const suppliedPassword = payload.appPassword === undefined ? "" : String(payload.appPassword).trim();
  const hasMaskedPassword = suppliedPassword.includes("•");
  let appPasswordEncrypted = stored.appPasswordEncrypted || null;
  if (suppliedPassword && !hasMaskedPassword) {
    appPasswordEncrypted = encryptMailboxPassword(suppliedPassword);
  } else if (!appPasswordEncrypted && stored.appPassword) {
    throw new Error("Re-enter the VPBank mailbox App Password to replace the legacy plaintext credential.");
  }

  const newConfig = {
    email,
    appPasswordEncrypted,
    host: GMAIL_IMAP_HOST,
    port: GMAIL_IMAP_PORT,
    tls: true,
    syncMode: payload.syncMode === "POLLING" ? "POLLING" : "IDLE",
    isActive: payload.isActive === true,
    updatedAt: new Date().toISOString(),
  };

  const existing = await db(TABLES.SYSTEM_CONFIGS).where(C_CONFIG.CONFIG_KEY, CONFIG_KEY).first();
  const update = {
    [C_CONFIG.CONFIG_VALUE]: JSON.stringify(newConfig),
    [C_CONFIG.UPDATED_AT]: db.fn.now(),
  };
  if (existing) {
    await db(TABLES.SYSTEM_CONFIGS).where(C_CONFIG.CONFIG_KEY, CONFIG_KEY).update(update);
  } else {
    await db(TABLES.SYSTEM_CONFIGS).insert({
      [C_CONFIG.CONFIG_KEY]: CONFIG_KEY,
      [C_CONFIG.CONFIG_VALUE]: JSON.stringify(newConfig),
      [C_CONFIG.GROUP_NAME]: "VPBANK_MAILBOX",
      [C_CONFIG.DESCRIPTION]: "Encrypted Gmail IMAP configuration for VPBank reconciliation",
      [C_CONFIG.DATA_TYPE]: "json",
      [C_CONFIG.UPDATED_AT]: db.fn.now(),
    });
  }

  if (typeof onConfigChanged === "function") onConfigChanged();
  return getMaskedConfig();
}

function buildImapOptions({ email, appPassword }) {
  if (!email || !appPassword) throw new Error("Gmail email and App Password are required.");
  return {
    host: GMAIL_IMAP_HOST,
    port: GMAIL_IMAP_PORT,
    secure: true,
    auth: { user: email, pass: appPassword },
    tls: { rejectUnauthorized: true, servername: GMAIL_IMAP_HOST },
    logger: false,
  };
}

async function testImapConnection(credentials = {}) {
  const stored = await getStoredConfig();
  const email = String(credentials.email || stored.email || "").trim().toLowerCase();
  const suppliedPassword = String(credentials.appPassword || "").trim();
  const appPassword = suppliedPassword || (stored.appPasswordEncrypted ? decryptMailboxPassword(stored.appPasswordEncrypted) : "");
  const startedAt = Date.now();
  const ImapFlow = getImapFlowClass();
  const client = new ImapFlow(buildImapOptions({ email, appPassword }));
  try {
    await client.connect();
    return { success: true, latencyMs: Date.now() - startedAt, message: "Gmail IMAP TLS certificate validation succeeded." };
  } catch (error) {
    return { success: false, latencyMs: Date.now() - startedAt, message: error.message };
  } finally {
    if (client.usable) await client.logout().catch(() => undefined);
  }
}

module.exports = {
  GMAIL_IMAP_HOST,
  GMAIL_IMAP_PORT,
  buildImapOptions,
  getMaskedConfig,
  getRawConfig,
  saveMailboxConfig,
  testImapConnection,
};
