const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const { db, TABLES, COLS } = require("@/db");
const { buildImapOptions, getRawConfig } = require("../services/vpbankMailboxConfigService");
const { ingestEmailMessage } = require("../services/vpbankEmailIngestionService");
const { TRUSTED_SENDER_ADDRESSES } = require("../services/vpbankEmailParser");

const C_CHECKPOINT = COLS.EMAIL_SYNC_CHECKPOINTS;
let activeClient = null;
let pollTimer = null;
let reconnectTimer = null;
let reconnectAttempts = 0;
let isRunning = false;
let isChecking = false;

async function updateCheckpointState(mailboxAlias, state, error = null) {
  if (!mailboxAlias) return;
  const update = {
    [C_CHECKPOINT.WORKER_STATE]: state,
    [C_CHECKPOINT.UPDATED_AT]: db.fn.now(),
  };
  if (error) {
    update[C_CHECKPOINT.LAST_ERROR_CODE] = error.code || "IMAP_ERROR";
    update[C_CHECKPOINT.LAST_ERROR_MESSAGE] = error.message || String(error);
  }
  await db(TABLES.EMAIL_SYNC_CHECKPOINTS)
    .where({ [C_CHECKPOINT.PROVIDER]: "VPBANK_GMAIL", [C_CHECKPOINT.MAILBOX_ALIAS]: mailboxAlias })
    .update(update);
}

async function ingestUid(client, uid, mailboxAlias, uidValidity) {
  const message = await client.fetchOne(uid, { uid: true, source: true }, { uid: true });
  if (!message?.source) return { status: "MISSING" };

  const parsed = await simpleParser(message.source);
  return ingestEmailMessage({
    uid,
    uidValidity,
    subject: parsed.subject,
    text: parsed.text,
    html: parsed.html,
    from: parsed.from,
    date: parsed.date,
    messageId: parsed.messageId,
    authenticationResults: parsed.headers.get("authentication-results") || "",
  }, {
    mailboxAlias,
    uidValidity,
    folderName: "INBOX",
  });
}

async function checkNewEmails(client, mailboxAlias) {
  if (isChecking) return;
  isChecking = true;
  let lock;
  try {
    lock = await client.getMailboxLock("INBOX");
    const uidValidity = String(client.mailbox.uidValidity || "");
    if (!uidValidity) throw new Error("IMAP server did not provide UIDVALIDITY.");

    const checkpoint = await db(TABLES.EMAIL_SYNC_CHECKPOINTS)
      .where({
        [C_CHECKPOINT.PROVIDER]: "VPBANK_GMAIL",
        [C_CHECKPOINT.MAILBOX_ALIAS]: mailboxAlias,
        [C_CHECKPOINT.FOLDER_NAME]: "INBOX",
      })
      .first();
    const cursor = checkpoint?.[C_CHECKPOINT.UID_VALIDITY] === uidValidity
      ? Number(checkpoint?.[C_CHECKPOINT.LAST_TERMINAL_UID] || 0)
      : 0;

    const foundUidGroups = await Promise.all(
      TRUSTED_SENDER_ADDRESSES.map((sender) => client.search({ from: sender }, { uid: true })),
    );
    const foundUids = [...new Set(foundUidGroups.flat().map(Number))];
    const pendingUids = foundUids
      .filter((uid) => Number(uid) > cursor)
      .sort((left, right) => Number(left) - Number(right));

    for (const uid of pendingUids) {
      await ingestUid(client, Number(uid), mailboxAlias, uidValidity);
    }
  } catch (error) {
    console.error("[VPBank IMAP Worker] Email sync failed:", error.message);
    await updateCheckpointState(mailboxAlias, "ERROR", error).catch(() => undefined);
  } finally {
    lock?.release();
    isChecking = false;
  }
}

function clearTimers() {
  if (pollTimer) clearInterval(pollTimer);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  pollTimer = null;
  reconnectTimer = null;
}

function scheduleReconnect() {
  if (!isRunning || reconnectTimer) return;
  reconnectAttempts += 1;
  const delayMs = Math.min(reconnectAttempts * 5000, 60000);
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      const config = await getRawConfig();
      if (isRunning && config.isActive && config.email && config.appPassword) startImapSession(config);
    } catch (error) {
      console.error("[VPBank IMAP Worker] Reconnect configuration failed:", error.message);
      scheduleReconnect();
    }
  }, delayMs);
}

function startImapSession(config) {
  if (activeClient) void activeClient.logout().catch(() => undefined);
  const client = new ImapFlow(buildImapOptions(config));
  activeClient = client;

  client.on("error", (error) => {
    console.error("[VPBank IMAP Worker] IMAP connection error:", error.message);
    void updateCheckpointState(config.email, "ERROR", error).catch(() => undefined);
  });
  client.on("close", () => {
    if (activeClient === client) activeClient = null;
    if (isRunning) scheduleReconnect();
  });
  client.on("exists", () => {
    void checkNewEmails(client, config.email);
  });

  void (async () => {
    try {
      await client.connect();
      reconnectAttempts = 0;
      await updateCheckpointState(config.email, config.syncMode === "POLLING" ? "POLLING" : "IDLE");
      await checkNewEmails(client, config.email);
      if (config.syncMode === "POLLING") {
        pollTimer = setInterval(() => void checkNewEmails(client, config.email), 60000);
      }
    } catch (error) {
      console.error("[VPBank IMAP Worker] IMAP startup failed:", error.message);
      await updateCheckpointState(config.email, "ERROR", error).catch(() => undefined);
      scheduleReconnect();
    }
  })();
}

async function startWorker() {
  if (isRunning) return;
  isRunning = true;
  try {
    const config = await getRawConfig();
    if (!config.isActive || !config.email || !config.appPassword) return;
    startImapSession(config);
  } catch (error) {
    console.error("[VPBank IMAP Worker] Worker configuration failed:", error.message);
  }
}

async function stopWorker() {
  isRunning = false;
  clearTimers();
  if (activeClient) await activeClient.logout().catch(() => undefined);
  activeClient = null;
}

async function reloadWorker() {
  await stopWorker();
  await startWorker();
}

module.exports = {
  checkNewEmails,
  reloadWorker,
  startWorker,
  stopWorker,
};

