const { spawn } = require("node:child_process");
const { once } = require("node:events");
const net = require("node:net");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const { setTimeout: delay } = require("node:timers/promises");
const { chromium } = require("playwright");

const desktopEnvironment = { PATH: process.env.PATH, LANG: process.env.LANG || "C.UTF-8" };
const activeUids = new Set();

async function assignOwner(filename, uid) {
  const stat = await fs.lstat(filename);
  if (stat.uid !== uid) await fs.lchown(filename, uid, uid);
  if (!stat.isDirectory()) return;
  for (const name of await fs.readdir(filename)) await assignOwner(path.join(filename, name), uid);
}

function xAuthority(cookie, displayNumber = "") {
  const fields = [Buffer.alloc(0), Buffer.from(displayNumber), Buffer.from("MIT-MAGIC-COOKIE-1"), cookie];
  return Buffer.concat([Buffer.from([255, 255]), ...fields.flatMap((field) => [
    Buffer.from([field.length >> 8, field.length & 255]), field,
  ])]);
}

function start(command, args, options = {}) {
  const child = spawn(command, args, { stdio: "ignore", env: desktopEnvironment, ...options });
  child.on("error", (error) => {
    child.startError = error;
  });
  return child;
}

async function stop(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill();
  const timeout = setTimeout(() => child.kill("SIGKILL"), 3000);
  timeout.unref();
  try {
    await exited;
  } finally {
    clearTimeout(timeout);
  }
}

async function awaitSocket(socketPath, child) {
  const deadline = Date.now() + 8000;
  do {
    if (child.startError) throw child.startError;
    if (child.exitCode !== null || child.signalCode !== null) break;
    const socket = net.connect(socketPath);
    const ready = await new Promise((resolve) => {
      socket.once("connect", () => resolve(true));
      socket.once("error", () => resolve(false));
      socket.setTimeout(300, () => resolve(false));
    });
    socket.destroy();
    if (ready) return;
    await delay(80);
  } while (Date.now() < deadline);
  throw new Error("Cloud browser desktop failed to start");
}

async function startDesktop(profileDir) {
  const children = [];
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "wh-browser-"));
  let uid = 20000;
  while (activeUids.has(uid)) uid++;
  activeUids.add(uid);
  const home = path.join(temp, "home");
  const authority = path.join(home, ".Xauthority");
  const serverAuthority = path.join(temp, "Xauthority");
  const cookie = randomBytes(16);
  const vncSocket = path.join(temp, "vnc.sock");
  const websocketPath = path.join(temp, "ws.sock");
  let context;
  let display;
  async function cleanup() {
    try {
      await Promise.allSettled(children.map(stop));
      await assignOwner(profileDir, 0);
      await fs.rm(temp, { recursive: true, force: true });
    } finally {
      activeUids.delete(uid);
    }
  }
  try {
    await fs.chmod(temp, 0o711);
    await fs.mkdir(home, { mode: 0o700 });
    await fs.writeFile(serverAuthority, xAuthority(cookie), { mode: 0o600 });
    const xvfb = start("Xvfb", ["-displayfd", "3", "-screen", "0", "1280x800x24", "-nolisten", "tcp", "-auth", serverAuthority], {
      stdio: ["ignore", "ignore", "ignore", "pipe"],
    });
    children.push(xvfb);
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Xvfb startup timed out")), 8000);
      xvfb.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      xvfb.once("exit", () => {
        clearTimeout(timeout);
        reject(new Error("Xvfb exited before initialization"));
      });
      xvfb.stdio[3].setEncoding("utf8");
      let output = "";
      xvfb.stdio[3].on("data", (chunk) => {
        output += chunk;
        if (!output.includes("\n")) return;
        clearTimeout(timeout);
        if (!/^\d+\s*$/.test(output)) return reject(new Error("Invalid Xvfb display"));
        display = `:${output.trim()}`;
        resolve();
      });
    });
    await fs.writeFile(authority, xAuthority(cookie, display.slice(1)), { mode: 0o600 });
    await assignOwner(home, uid);
    await assignOwner(profileDir, uid);
    const vnc = start("x11vnc", ["-display", display, "-auth", authority, "-unixsock", vncSocket, "-rfbport", "0", "-forever", "-nopw"]);
    children.push(vnc);
    await awaitSocket(vncSocket, vnc);
    await fs.chmod(vncSocket, 0o600);
    const websocket = start("websockify", [`--unix-listen=${websocketPath}`, `--unix-target=${vncSocket}`]);
    children.push(websocket);
    await awaitSocket(websocketPath, websocket);
    context = await chromium.launchPersistentContext(profileDir, {
      executablePath: "/usr/local/bin/warehouse-chromium",
      env: {
        ...desktopEnvironment, DISPLAY: display, HOME: home, XAUTHORITY: authority,
        WAREHOUSE_CHROMIUM_EXECUTABLE: chromium.executablePath(), WAREHOUSE_CHROMIUM_UID: String(uid),
      },
      args: ["--window-position=0,0", "--window-size=1280,800", "--password-store=basic", "--disk-cache-size=67108864"],
      acceptDownloads: false,
      headless: false,
      viewport: null,
      timeout: 20_000,
    });
    return {
      context,
      websocketPath,
      async close() {
        try {
          await context.close();
        } finally {
          await cleanup();
        }
      },
    };
  } catch (error) {
    await context?.close().catch(() => {});
    await cleanup();
    throw error;
  }
}

module.exports = { startDesktop };
