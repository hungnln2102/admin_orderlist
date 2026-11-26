const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { startDesktop } = require("./cloudBrowserDesktop");
const storage = require("./cloudProfileStorage");

const sessions = new Map();
const profiles = new Map();
const closingTimeout = 5 * 60_000;
let shuttingDown = false;
let startupRecovery;

class CloudBrowserError extends Error {
  constructor(status, message, options) {
    super(message, options);
    this.status = status;
  }
}

function authorize(id, owner) {
  const session = sessions.get(id);
  if (!session || !owner || session.owner !== owner) {
    throw new CloudBrowserError(404, "Không tìm thấy phiên Chromium.");
  }
  return session;
}

function savePending(session) {
  return closeSession(session).catch(() => console.error("[CloudBrowser] Profile save pending:", session.key));
}

function pendingFile(session) {
  return path.join(path.dirname(session.dir), `.pending-${session.key}`);
}

function touch(session) {
  clearTimeout(session.idle);
  session.idle = setTimeout(() => {
    if (!session.sockets.size) {
      void savePending(session);
    }
  }, closingTimeout);
  session.idle.unref();
}

async function prepare(session, root) {
  await fs.mkdir(root, { recursive: true, mode: 0o711 });
  await fs.chmod(root, 0o711);
  const disk = await fs.statfs(root);
  const reserve = Number(process.env.WAREHOUSE_PROFILE_DISK_RESERVE_BYTES || 512 * 1024 * 1024);
  const maxBytes = Number(process.env.WAREHOUSE_PROFILE_MAX_BYTES || 256 * 1024 * 1024);
  if (!Number.isSafeInteger(reserve) || reserve < 1 || !Number.isSafeInteger(maxBytes) || maxBytes < 1024
    || disk.bavail * disk.bsize < reserve + maxBytes * 2) {
    throw new CloudBrowserError(507, "Ổ đĩa chưa đủ dung lượng để mở thêm profile.");
  }
  let restored = false;
  try {
    await fs.access(session.dir);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const staging = await fs.mkdtemp(path.join(root, ".restore-"));
    try {
      if (session.persistent) {
        await storage.restoreProfile(session.key, staging).catch((cause) => {
          console.error("[CloudBrowser] Profile restore failed:", session.key, cause.name);
          throw new CloudBrowserError(503, "Chưa tải được profile Chromium từ kho lưu trữ.", { cause });
        });
      }
      await fs.rename(staging, session.dir);
      restored = true;
    } finally {
      await fs.rm(staging, { recursive: true, force: true });
    }
  }
  try {
    session.desktop = await startDesktop(session.dir);
  } catch (error) {
    if (restored) await fs.rm(session.dir, { recursive: true, force: true });
    throw error;
  }
  touch(session);
}

async function openSession({ key, owner, loginUrl, verify, persistent = true }) {
  const root = process.env.WAREHOUSE_PROFILE_WORK_DIR;
  if (shuttingDown || !root) throw new CloudBrowserError(503, "Trình duyệt đám mây chưa sẵn sàng.");
  await startupRecovery;
  if (shuttingDown) throw new CloudBrowserError(503, "Trình duyệt đám mây đang dừng.");
  let session = profiles.get(key);
  if (session && (session.owner !== owner || session.closing || session.state === "pending")) {
    throw new CloudBrowserError(409, "Profile đang được sử dụng hoặc đang chờ lưu.");
  }
  if (!session) {
    const limit = Number(process.env.WAREHOUSE_PROFILE_MAX_SESSIONS || 2);
    if (!Number.isSafeInteger(limit) || limit < 1 || profiles.size >= limit) {
      throw new CloudBrowserError(429, "Đã đạt giới hạn phiên Chromium. Hãy đóng một phiên trước.");
    }
    const id = randomUUID();
    session = {
      id, key, owner, persistent, dir: path.join(root, key),
      sockets: new Set(), checks: new Map(), state: "opening",
    };
    sessions.set(id, session);
    profiles.set(key, session);
    session.queue = prepare(session, root).then(() => { session.state = "open"; }).catch((error) => {
      sessions.delete(id);
      profiles.delete(key);
      throw error;
    });
  }
  const navigate = session.queue.then(async () => {
    const { context } = session.desktop;
    const page = context.pages()[0] || await context.newPage();
    await page.bringToFront();
    await page.goto(loginUrl, { waitUntil: "commit", timeout: 15_000 });
    if (verify) session.checks.set(verify.slotId, verify);
    touch(session);
  });
  session.queue = navigate.catch(() => {});
  await navigate;
  return { success: true, viewerUrl: `/api/warehouse/cloud-browser/sessions/${session.id}/viewer` };
}

function closeSession(session) {
  if (session.closing) return session.closing;
  if (session.state === "saved") return Promise.resolve();
  clearTimeout(session.idle);
  clearTimeout(session.retry);
  session.closing = session.queue.then(async () => {
    if (!session.desktop && session.state === "opening") return;
    try {
      session.state = "saving";
      for (const socket of session.sockets) socket.destroy();
      if (session.desktop) {
        for (const check of session.checks.values()) {
          try {
            await check.run(session.desktop.context);
          } catch {
            console.error("[CloudBrowser] Session verification failed:", session.key);
          }
        }
        await session.desktop.close();
        session.desktop = null;
      }
      if (session.persistent) {
        await fs.writeFile(pendingFile(session), "", { mode: 0o600 });
        await storage.saveProfile(session.key, session.dir);
      }
      const cleared = path.join(path.dirname(session.dir), `.saved-${session.id}`);
      await fs.rename(session.dir, cleared);
      session.state = "saved";
      if (session.persistent) await fs.rm(pendingFile(session), { force: true }).catch(() => {
        console.error("[CloudBrowser] Saved workspace marker cleanup failed:", session.key);
      });
      profiles.delete(session.key);
      await fs.rm(cleared, { recursive: true, force: true }).catch(() => {
        console.error("[CloudBrowser] Saved workspace cleanup failed:", session.key);
      });
      const expire = setTimeout(() => sessions.delete(session.id), closingTimeout);
      expire.unref();
    } catch (cause) {
      session.state = "pending";
      if (!shuttingDown) {
        session.retry = setTimeout(() => {
          void savePending(session);
        }, 30_000);
        session.retry.unref();
      }
      throw new CloudBrowserError(503, "Chưa lưu được profile. Dữ liệu vẫn được giữ trên VPS để thử lại.", { cause });
    }
  }).finally(() => { session.closing = null; });
  return session.closing;
}

function onSocket(session, socket) {
  session.sockets.add(socket);
  clearTimeout(session.idle);
  socket.once("close", () => {
    session.sockets.delete(socket);
    if (session.state === "open") touch(session);
  });
}

async function drain() {
  shuttingDown = true;
  return Promise.allSettled(Array.from(profiles.values(), closeSession));
}

async function recoverPending() {
  const root = process.env.WAREHOUSE_PROFILE_WORK_DIR;
  if (!root) return;
  await fs.mkdir(root, { recursive: true, mode: 0o711 });
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (shuttingDown) return;
    if (entry.isDirectory() && (entry.name.startsWith(".restore-") || entry.name.startsWith(".saved-")
      || entry.name.startsWith(".warehouse-profile-") || entry.name === "catalog")) {
      await fs.rm(path.join(root, entry.name), { recursive: true, force: true });
      continue;
    }
    if (!entry.isFile() || !/^\.pending-account-[1-9]\d*$/.test(entry.name)) continue;
    const key = entry.name.slice(".pending-".length);
    const dir = path.join(root, key);
    if (!entries.some((candidate) => candidate.name === key && candidate.isDirectory())) {
      await fs.rm(path.join(root, entry.name), { force: true });
      continue;
    }
    const session = {
      id: randomUUID(), key, dir,
      persistent: true, sockets: new Set(), checks: new Map(), state: "pending", queue: Promise.resolve(),
    };
    profiles.set(key, session);
    await savePending(session);
  }
}

function startRecovery() {
  startupRecovery = recoverPending();
  return startupRecovery;
}

module.exports = { CloudBrowserError, openSession, authorize, closeSession, onSocket, drain, startRecovery };
