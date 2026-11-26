const { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } = require("node:crypto");
const { constants, createReadStream, createWriteStream } = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");
const { addAbortSignal, Readable, Transform } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const { createGzip, createGunzip } = require("node:zlib");
const { TextDecoder } = require("node:util");

const MAGIC = Buffer.from("WHP1");
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = MAGIC.length + NONCE_BYTES;
const MAX_ENTRIES = 100_000;
const MAX_PATH_BYTES = 4096;
const MAX_DEPTH = 64;
const DEFAULT_MAX_BYTES = 256 * 1024 * 1024;
const MAX_TIMEOUT_MS = 120_000;
const MAX_POINTER_BYTES = 1024;
const CHROMIUM_RUNTIME_LINKS = new Set(["SingletonCookie", "SingletonLock", "SingletonSocket"]);
const CHROMIUM_ROOT_CACHES = new Set(["GrShaderCache", "GraphiteDawnCache", "ShaderCache"]);
const CHROMIUM_PROFILE_CACHES = new Set(["Cache", "Code Cache", "GPUCache", "DawnGraphiteCache", "DawnWebGPUCache"]);
const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
let client;

function storageConfig(profileKey) {
  if (typeof profileKey !== "string" || !/^[a-z0-9][a-z0-9_-]{0,127}$/.test(profileKey)) {
    throw new Error("Invalid browser profile key");
  }
  const env = process.env;
  const accountId = env.WAREHOUSE_PROFILE_R2_ACCOUNT_ID || env.R2_ACCOUNT_ID;
  const accessKeyId = env.WAREHOUSE_PROFILE_R2_ACCESS_KEY_ID;
  const secretAccessKey = env.WAREHOUSE_PROFILE_R2_SECRET_ACCESS_KEY;
  const bucket = env.WAREHOUSE_PROFILE_R2_BUCKET;
  const encryptionKey = env.WAREHOUSE_PROFILE_ENCRYPTION_KEY;
  const prefix = env.WAREHOUSE_PROFILE_R2_PREFIX || "warehouse-browser-profiles/v1";
  const maxBytes = Number(env.WAREHOUSE_PROFILE_MAX_BYTES || DEFAULT_MAX_BYTES);
  if (!/^[a-f0-9]{32}$/i.test(accountId || "") || !accessKeyId || !secretAccessKey
      || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket || "") || bucket === env.R2_BUCKET
      || !/^[a-f0-9]{64}$/i.test(encryptionKey || "")
      || prefix.length > 128 || !/^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/.test(prefix)
      || !Number.isSafeInteger(maxBytes) || maxBytes < 1024 || maxBytes > 1024 ** 3) {
    throw new Error("Private browser profile storage configuration is invalid");
  }
  client ||= new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    maxAttempts: 1,
  });
  return {
    object: { Bucket: bucket },
    profilePrefix: `${prefix}/${profileKey}`,
    maxBytes,
    key: Buffer.from(encryptionKey, "hex"),
    aad: Buffer.from(`${bucket}/${prefix}/${profileKey}`),
  };
}

function isMissingObject(error) {
  return error.name === "NoSuchKey" && error.$metadata?.httpStatusCode === 404;
}

function objectKey(config, version) {
  return { ...config.object, Key: `${config.profilePrefix}/${version}.whp` };
}

function currentKey(config) {
  return { ...config.object, Key: `${config.profilePrefix}/current.json` };
}

function requestOptions() {
  return { abortSignal: AbortSignal.timeout(MAX_TIMEOUT_MS) };
}

async function hashStream(source, maxBytes) {
  const digest = createHash("sha256");
  let size = 0;
  for await (const block of source) {
    size += block.length;
    if (size > maxBytes) throw new Error("Browser profile object exceeds the size limit");
    digest.update(block);
  }
  return { size, sha256: digest.digest("hex") };
}

async function readPointer(config) {
  let result;
  const { abortSignal } = requestOptions();
  try {
    result = await client.send(new GetObjectCommand(currentKey(config)), { abortSignal });
  } catch (error) {
    if (isMissingObject(error)) return null;
    throw error;
  }
  try {
    if (!Number.isSafeInteger(result.ContentLength) || result.ContentLength < 1
        || result.ContentLength > MAX_POINTER_BYTES || !result.ETag) {
      throw new Error("Invalid browser profile pointer metadata");
    }
    addAbortSignal(abortSignal, result.Body);
    const blocks = [];
    let size = 0;
    for await (const block of result.Body) {
      size += block.length;
      if (size > MAX_POINTER_BYTES) throw new Error("Browser profile pointer exceeds the size limit");
      blocks.push(block);
    }
    const pointer = JSON.parse(utf8.decode(Buffer.concat(blocks)));
    const validVersion = (value) => typeof value === "string"
      && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value);
    if (size !== result.ContentLength || !pointer || !validVersion(pointer.current)
        || (pointer.previous !== null && !validVersion(pointer.previous))
        || pointer.current === pointer.previous
        || !Number.isSafeInteger(pointer.size) || pointer.size <= HEADER_BYTES + TAG_BYTES
        || pointer.size > config.maxBytes || !/^[a-f0-9]{64}$/.test(pointer.sha256 || "")) {
      throw new Error("Invalid browser profile pointer");
    }
    return { ...pointer, etag: result.ETag };
  } finally {
    result.Body?.destroy();
  }
}

async function removeVersion(config, version) {
  if (!version) return;
  try {
    await client.send(new DeleteObjectCommand(objectKey(config, version)), requestOptions());
  } catch {
    console.warn("[Warehouse profile storage] Could not delete a retired archive version.");
  }
}

async function publishArchive(config, filename) {
  const previous = await readPointer(config);
  const version = randomUUID();
  const object = objectKey(config, version);
  const expected = await hashStream(createReadStream(filename), config.maxBytes);
  const body = createReadStream(filename);
  let writingPointer = false;
  try {
    await client.send(new PutObjectCommand({
      ...object,
      IfNoneMatch: "*",
      Body: body,
      ContentLength: expected.size,
      ContentType: "application/octet-stream",
      Metadata: { sha256: expected.sha256 },
    }), requestOptions());
    const options = requestOptions();
    const result = await client.send(new GetObjectCommand(object), options);
    try {
      if (result.ContentLength !== expected.size) throw new Error("Uploaded browser profile size did not match");
      addAbortSignal(options.abortSignal, result.Body);
      const actual = await hashStream(result.Body, expected.size);
      if (actual.size !== expected.size || actual.sha256 !== expected.sha256) {
        throw new Error("Uploaded browser profile digest did not match");
      }
    } finally {
      result.Body?.destroy();
    }
    const pointer = Buffer.from(JSON.stringify({
      current: version,
      previous: previous?.current ?? null,
      ...expected,
    }));
    writingPointer = true;
    await client.send(new PutObjectCommand({
      ...currentKey(config),
      ...(previous ? { IfMatch: previous.etag } : { IfNoneMatch: "*" }),
      Body: pointer,
      ContentLength: pointer.length,
      ContentType: "application/json",
    }), requestOptions());
  } catch (error) {
    if (writingPointer) {
      // An interrupted response may follow a successful conditional write.
      const observed = await readPointer(config).catch(() => undefined);
      if (observed?.current === version) {
        await removeVersion(config, previous?.previous);
        return;
      }
      const status = error.$metadata?.httpStatusCode;
      if ([400, 401, 403, 409, 412].includes(status) && observed?.previous !== version) {
        await removeVersion(config, version);
      }
    } else {
      await removeVersion(config, version);
    }
    throw error;
  } finally {
    body.destroy();
  }
  await removeVersion(config, previous?.previous);
}

function limitBytes(maxBytes) {
  let total = 0;
  return new Transform({
    transform(chunk, _encoding, callback) {
      total += chunk.length;
      callback(total > maxBytes ? new Error("Browser profile exceeds the size limit") : null, chunk);
    },
  });
}

function relativeParts(filename) {
  const parts = filename.split("/");
  if (!filename || Buffer.byteLength(filename) > MAX_PATH_BYTES || parts.length > MAX_DEPTH
      || parts.some((part) => !part || part === "." || part === ".." || /[\\:\x00-\x1f]/.test(part))) {
    throw new Error("Invalid browser profile archive path");
  }
  return parts;
}

// Each record has a name length, entry type, content length, name and raw file data.
// A four-byte zero name length terminates the archive.
async function* packDirectory(dir) {
  let count = 0;
  async function* visit(parent = "") {
    for await (const entry of await fs.opendir(path.join(dir, parent))) {
      if (!parent && entry.isSymbolicLink() && CHROMIUM_RUNTIME_LINKS.has(entry.name)) continue;
      if (entry.isDirectory() && ((!parent && CHROMIUM_ROOT_CACHES.has(entry.name))
        || (/^(Default|Profile \d+)$/.test(parent) && CHROMIUM_PROFILE_CACHES.has(entry.name)))) continue;
      const name = parent ? `${parent}/${entry.name}` : entry.name;
      relativeParts(name);
      if (++count > MAX_ENTRIES) throw new Error("Browser profile contains too many entries");
      const absolute = path.join(dir, name);
      const stat = await fs.lstat(absolute);
      if (!stat.isFile() && !stat.isDirectory()) throw new Error("Unsupported browser profile file type");
      const nameBytes = Buffer.from(name);
      const header = Buffer.alloc(13);
      header.writeUInt32BE(nameBytes.length);
      header[4] = stat.isDirectory() ? 1 : 0;
      header.writeBigUInt64BE(stat.isFile() ? BigInt(stat.size) : 0n, 5);
      yield header;
      yield nameBytes;
      if (stat.isDirectory()) {
        yield* visit(name);
        continue;
      }
      let readBytes = 0;
      const flags = constants.O_RDONLY | (constants.O_NOFOLLOW || 0);
      for await (const block of createReadStream(absolute, { flags })) {
        readBytes += block.length;
        if (readBytes > stat.size) throw new Error("Browser profile changed while being archived");
        yield block;
      }
      if (readBytes !== stat.size) throw new Error("Browser profile changed while being archived");
    }
  }
  if (!(await fs.lstat(dir)).isDirectory()) throw new Error("Invalid browser profile directory");
  yield* visit();
  yield Buffer.alloc(4);
}

function archiveReader(source) {
  const iterator = source[Symbol.asyncIterator]();
  let pending = Buffer.alloc(0);
  async function* take(length) {
    while (length > 0) {
      if (!pending.length) {
        const { done, value } = await iterator.next();
        if (done) throw new Error("Truncated browser profile archive");
        pending = value;
        continue;
      }
      const size = Math.min(length, pending.length);
      const block = pending.subarray(0, size);
      pending = pending.subarray(size);
      length -= size;
      yield block;
    }
  }
  return {
    take,
    async read(length) {
      const value = Buffer.alloc(length);
      let offset = 0;
      for await (const block of take(length)) offset += block.copy(value, offset);
      return value;
    },
    async finish() {
      if (pending.length || !(await iterator.next()).done) throw new Error("Unexpected browser profile archive data");
    },
  };
}

async function unpackDirectory(source, dir, maxBytes) {
  const reader = archiveReader(source);
  let count = 0;
  while (true) {
    const nameBytes = (await reader.read(4)).readUInt32BE();
    if (!nameBytes) break;
    if (nameBytes > MAX_PATH_BYTES || ++count > MAX_ENTRIES) throw new Error("Browser profile archive has invalid entries");
    const header = await reader.read(9);
    const type = header[0];
    const size = header.readBigUInt64BE(1);
    if ((type !== 0 && type !== 1) || (type === 1 && size !== 0n) || size > BigInt(maxBytes)) {
      throw new Error("Browser profile archive has an invalid entry header");
    }
    const relative = utf8.decode(await reader.read(nameBytes));
    const absolute = path.join(dir, ...relativeParts(relative));
    if (type === 1) {
      await fs.mkdir(absolute, { mode: 0o700 });
      continue;
    }
    await pipeline(Readable.from(reader.take(Number(size))), createWriteStream(absolute, { flags: "wx", mode: 0o600 }));
  }
  await reader.finish();
}

async function saveProfile(profileKey, dir) {
  const config = storageConfig(profileKey);
  const { maxBytes, key, aad } = config;
  const workspace = await fs.mkdtemp(path.join(path.dirname(path.resolve(dir)), ".warehouse-profile-"));
  const filename = path.join(workspace, "profile.whp");
  try {
    const nonce = randomBytes(NONCE_BYTES);
    const cipher = createCipheriv("aes-256-gcm", key, nonce);
    cipher.setAAD(aad);
    await fs.writeFile(filename, Buffer.concat([MAGIC, nonce]), { flag: "wx", mode: 0o600 });
    await pipeline(
      Readable.from(packDirectory(dir)),
      limitBytes(maxBytes),
      createGzip(),
      cipher,
      limitBytes(maxBytes - HEADER_BYTES - TAG_BYTES),
      createWriteStream(filename, { flags: "a" }),
    );
    await fs.appendFile(filename, cipher.getAuthTag());
    await publishArchive(config, filename);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}

async function restoreProfile(profileKey, dir) {
  const config = storageConfig(profileKey);
  const { maxBytes, key, aad } = config;
  const pointer = await readPointer(config);
  if (!pointer) return false;
  const signal = AbortSignal.timeout(MAX_TIMEOUT_MS);
  const result = await client.send(new GetObjectCommand(objectKey(config, pointer.current)), { abortSignal: signal });
  const destination = path.resolve(dir);
  let workspace;
  try {
    if (result.ContentLength !== pointer.size) {
      throw new Error("Browser profile object has an invalid size");
    }
    workspace = await fs.mkdtemp(path.join(path.dirname(destination), ".warehouse-profile-"));
    const filename = path.join(workspace, "profile.whp");
    await pipeline(result.Body, limitBytes(maxBytes), createWriteStream(filename, { flags: "wx", mode: 0o600 }), { signal });
    const actual = await hashStream(createReadStream(filename), maxBytes);
    if (actual.size !== pointer.size || actual.sha256 !== pointer.sha256) {
      throw new Error("Browser profile archive digest did not match");
    }
    const handle = await fs.open(filename, "r");
    const header = Buffer.alloc(HEADER_BYTES);
    const tag = Buffer.alloc(TAG_BYTES);
    try {
      const { size } = await handle.stat();
      if (size !== result.ContentLength) throw new Error("Browser profile object was truncated");
      await handle.read(header, 0, HEADER_BYTES, 0);
      await handle.read(tag, 0, TAG_BYTES, size - TAG_BYTES);
      if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Unsupported browser profile archive version");
    } finally {
      await handle.close();
    }
    const decipher = createDecipheriv("aes-256-gcm", key, header.subarray(MAGIC.length));
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    const unpacked = path.join(workspace, "profile");
    await fs.mkdir(unpacked, { mode: 0o700 });
    await pipeline(
      createReadStream(filename, { start: HEADER_BYTES, end: result.ContentLength - TAG_BYTES - 1 }),
      decipher,
      createGunzip(),
      limitBytes(maxBytes),
      (source) => unpackDirectory(source, unpacked, maxBytes),
    );
    try {
      await fs.rmdir(destination);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await fs.rename(unpacked, destination);
    return true;
  } finally {
    result.Body?.destroy();
    if (workspace) await fs.rm(workspace, { recursive: true, force: true });
  }
}

module.exports = { restoreProfile, saveProfile };
