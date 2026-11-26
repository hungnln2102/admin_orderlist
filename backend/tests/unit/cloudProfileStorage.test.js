const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { Readable } = require("node:stream");
const { test } = require("node:test");
const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { restoreProfile, saveProfile } = require("../../src/domains/warehouse/services/cloudProfileStorage");

test("browser profile storage encrypts archives and restores only authenticated matching objects", async (t) => {
  const env = {
    WAREHOUSE_PROFILE_R2_ACCOUNT_ID: "a".repeat(32),
    WAREHOUSE_PROFILE_R2_ACCESS_KEY_ID: "test",
    WAREHOUSE_PROFILE_R2_SECRET_ACCESS_KEY: "test",
    WAREHOUSE_PROFILE_R2_BUCKET: "private-profile-test",
    WAREHOUSE_PROFILE_ENCRYPTION_KEY: "c".repeat(64),
    WAREHOUSE_PROFILE_MAX_BYTES: "16384",
  };
  const original = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => {
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "profile-storage-test-"));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const source = path.join(workspace, "source");
  const destination = path.join(workspace, "destination");
  const marker = "browser profile cookie fixture";
  await fs.mkdir(path.join(source, "Default", "Empty"), { recursive: true });
  await fs.writeFile(path.join(source, "Default", "Cookies"), marker);
  await fs.mkdir(destination);

  const objects = new Map();
  let nextEtag = 0;
  let failPointerWrite = false;
  let losePointerResponse = false;
  let corruptUploadReadback = false;
  t.mock.method(S3Client.prototype, "send", async (command) => {
    const { Key, Bucket } = command.input;
    assert.equal(Bucket, env.WAREHOUSE_PROFILE_R2_BUCKET);
    if (command instanceof PutObjectCommand) {
      const existing = objects.get(Key);
      if (command.input.IfNoneMatch === "*") assert.equal(existing, undefined);
      if (command.input.IfMatch) assert.equal(command.input.IfMatch, existing?.etag);
      const body = command.input.Body;
      const blocks = Buffer.isBuffer(body) ? [body] : [];
      if (!Buffer.isBuffer(body)) for await (const block of body) blocks.push(block);
      const payload = Buffer.concat(blocks);
      assert.equal(payload.length, command.input.ContentLength);
      if (Key.endsWith("current.json") && failPointerWrite) {
        throw Object.assign(new Error("pointer publication failed"), { $metadata: { httpStatusCode: 403 } });
      }
      objects.set(Key, { payload, etag: `"${++nextEtag}"` });
      if (Key.endsWith("current.json") && losePointerResponse) throw new Error("pointer response lost");
      return {};
    }
    if (command instanceof DeleteObjectCommand) {
      objects.delete(Key);
      return {};
    }
    assert.ok(command instanceof GetObjectCommand);
    if (Key.endsWith("/forbidden/current.json")) {
      throw Object.assign(new Error("denied"), { name: "AccessDenied", $metadata: { httpStatusCode: 403 } });
    }
    const object = objects.get(Key);
    if (!object) {
      throw Object.assign(new Error("missing"), { name: "NoSuchKey", $metadata: { httpStatusCode: 404 } });
    }
    const payload = Buffer.from(object.payload);
    if (corruptUploadReadback && Key.endsWith(".whp")) payload[payload.length - 1] ^= 1;
    return {
      ContentLength: payload.length,
      ETag: object.etag,
      Body: Readable.from([payload.subarray(0, 7), payload.subarray(7)]),
    };
  });

  assert.equal(await restoreProfile("account-1", destination), false);
  await assert.rejects(restoreProfile("forbidden", destination), { name: "AccessDenied" });
  await saveProfile("account-1", source);
  const prefix = "warehouse-browser-profiles/v1/account-1";
  const key = `${prefix}/current.json`;
  const committed = () => JSON.parse(objects.get(key).payload);
  const versionKey = (version) => `${prefix}/${version}.whp`;
  const firstVersion = committed().current;
  const firstArchive = objects.get(versionKey(firstVersion));
  assert.equal(firstArchive.payload.includes(marker), false);
  assert.equal(await restoreProfile("account-1", destination), true);
  assert.equal(await fs.readFile(path.join(destination, "Default", "Cookies"), "utf8"), marker);
  assert.equal((await fs.stat(path.join(destination, "Default", "Empty"))).isDirectory(), true);
  await assert.rejects(restoreProfile("account-1", destination), { code: "ENOTEMPTY" });

  const secondDestination = path.join(workspace, "second-destination");
  objects.set(key.replace("account-1", "account-2"), objects.get(key));
  objects.set(versionKey(firstVersion).replace("account-1", "account-2"), firstArchive);
  await assert.rejects(restoreProfile("account-2", secondDestination));
  await assert.rejects(fs.stat(secondDestination), { code: "ENOENT" });
  const corrupt = Buffer.from(firstArchive.payload);
  corrupt[corrupt.length - 1] ^= 1;
  objects.set(versionKey(firstVersion), { ...firstArchive, payload: corrupt });
  await assert.rejects(restoreProfile("account-1", secondDestination), /digest did not match/);
  await assert.rejects(fs.stat(secondDestination), { code: "ENOENT" });
  objects.set(versionKey(firstVersion), firstArchive);

  await fs.writeFile(path.join(source, "Default", "Cookies"), "changed");
  failPointerWrite = true;
  await assert.rejects(saveProfile("account-1", source), /pointer publication failed/);
  failPointerWrite = false;
  assert.equal(committed().current, firstVersion);
  assert.equal(await restoreProfile("account-1", secondDestination), true);
  assert.equal(await fs.readFile(path.join(secondDestination, "Default", "Cookies"), "utf8"), marker);
  await fs.rm(secondDestination, { recursive: true });

  corruptUploadReadback = true;
  await assert.rejects(saveProfile("account-1", source), /Uploaded browser profile digest did not match/);
  corruptUploadReadback = false;
  assert.equal(committed().current, firstVersion);
  assert.equal([...objects.keys()].filter((key) => key.startsWith(prefix)).length, 2);

  await saveProfile("account-1", source);
  const secondVersion = committed().current;
  assert.equal(committed().previous, firstVersion);
  losePointerResponse = true;
  await saveProfile("account-1", source);
  losePointerResponse = false;
  assert.equal(committed().previous, secondVersion);
  assert.equal(objects.has(versionKey(firstVersion)), false);
  assert.equal([...objects.keys()].filter((key) => key.startsWith(prefix)).length, 3);
  assert.deepEqual((await fs.readdir(workspace)).sort(), ["destination", "source"]);

  await fs.writeFile(path.join(source, "large"), Buffer.alloc(16384));
  await assert.rejects(saveProfile("account-3", source), /size limit/);
  assert.equal([...objects.keys()].some((key) => key.includes("/account-3/")), false);
});
