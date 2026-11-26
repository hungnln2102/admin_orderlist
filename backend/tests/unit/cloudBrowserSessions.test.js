const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const services = "../../src/domains/warehouse/services";
const desktopModule = require(`${services}/cloudBrowserDesktop`);
const storage = require(`${services}/cloudProfileStorage`);

test("isolates account workspaces and keeps the authoritative local data until upload succeeds", async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "warehouse-session-test-"));
  const env = process.env.WAREHOUSE_PROFILE_WORK_DIR;
  process.env.WAREHOUSE_PROFILE_WORK_DIR = root;
  t.after(async () => {
    if (env === undefined) delete process.env.WAREHOUSE_PROFILE_WORK_DIR;
    else process.env.WAREHOUSE_PROFILE_WORK_DIR = env;
    await fs.rm(root, { recursive: true, force: true });
  });
  const remote = new Map();
  const launches = [];
  let uploadError = true;
  t.mock.method(storage, "restoreProfile", async (key, dir) => {
    if (!remote.has(key)) return false;
    await fs.writeFile(path.join(dir, "fixture"), remote.get(key));
    return true;
  });
  t.mock.method(storage, "saveProfile", async (key, dir) => {
    if (key === "account-1" && uploadError) throw new Error("R2 unavailable");
    remote.set(key, await fs.readFile(path.join(dir, "fixture"), "utf8"));
  });
  t.mock.method(desktopModule, "startDesktop", async (dir) => {
    const page = { bringToFront: async () => {}, goto: async () => {} };
    const context = { pages: () => [page] };
    launches.push(dir);
    return { context, close: async () => {} };
  });

  const { openSession, authorize, closeSession, startRecovery, drain } = require(`${services}/cloudBrowserSessions`);
  await startRecovery();
  t.after(drain);
  const open = (key, owner = "admin") => openSession({ key, owner, loginUrl: "https://example.com/" });
  const getSession = (opened, owner = "admin") => authorize(opened.viewerUrl.split("/").at(-2), owner);
  const [first, repeated, other] = await Promise.all([open("account-1"), open("account-1"), open("account-2")]);
  assert.equal(first.viewerUrl, repeated.viewerUrl);
  assert.notEqual(first.viewerUrl, other.viewerUrl);
  assert.equal(launches.length, 2);
  assert.throws(() => getSession(first, "another-admin"), { status: 404 });
  await assert.rejects(open("account-1", "another-admin"), { status: 409 });
  const account1 = getSession(first);
  const account2 = getSession(other);
  await fs.writeFile(path.join(account1.dir, "fixture"), "profile A");
  await fs.writeFile(path.join(account2.dir, "fixture"), "profile B");
  await assert.rejects(closeSession(account1), { status: 503 });
  assert.equal(await fs.readFile(path.join(account1.dir, "fixture"), "utf8"), "profile A");
  await assert.rejects(open("account-1"), { status: 409 });
  uploadError = false;
  await Promise.all([closeSession(account1), closeSession(account2)]);
  await assert.rejects(fs.stat(account1.dir), { code: "ENOENT" });
  const reopened = getSession(await open("account-1"));
  assert.equal(await fs.readFile(path.join(reopened.dir, "fixture"), "utf8"), "profile A");
  assert.equal(remote.get("account-2"), "profile B");
  assert.equal(launches.length, 3);
});
