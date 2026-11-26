const {
  S3Client, ListObjectsV2Command, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { createHash } = require("node:crypto");

function getConfig() {
  const {
    R2_ACCOUNT_ID: accountId, R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey, R2_BUCKET: bucket,
    R2_PUBLIC_BASE_URL: baseUrl,
  } = process.env;
  if (!/^[a-f0-9]{32}$/i.test(accountId || "") || !accessKeyId || !secretAccessKey || !bucket || !baseUrl) {
    throw Object.assign(new Error("Kho ảnh chưa được cấu hình."), { statusCode: 503 });
  }
  const publicUrl = URL.parse(baseUrl);
  if (!publicUrl || publicUrl.protocol !== "https:" || publicUrl.username || publicUrl.password || publicUrl.search || publicUrl.hash) {
    throw Object.assign(new Error("URL công khai của kho ảnh không hợp lệ."), { statusCode: 503 });
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl: publicUrl.href.replace(/\/+$/, "") };
}

let client;
function getClient(config) {
  client ||= new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

function urlFor(key, config = getConfig()) {
  return `${config.publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function list() {
  const config = getConfig();
  const s3 = getClient(config);
  const items = [];
  let next;
  do {
    const result = await s3.send(new ListObjectsV2Command({ Bucket: config.bucket, ContinuationToken: next }), {
      abortSignal: AbortSignal.timeout(10000),
    });
    for (const object of result.Contents || []) {
      if (!object.Key || object.Key.endsWith("/")) continue;
      items.push({
        key: object.Key,
        url: urlFor(object.Key, config),
        size: object.Size,
        lastModified: object.LastModified?.toISOString(),
      });
    }
    next = result.NextContinuationToken;
  } while (next);
  return items;
}

async function exists(key) {
  const config = getConfig();
  try {
    await getClient(config).send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }), {
      abortSignal: AbortSignal.timeout(10000),
    });
    return true;
  } catch (error) {
    if (error.$metadata?.httpStatusCode === 404) return false;
    throw error;
  }
}

async function put(key, buffer, mimeType) {
  const config = getConfig();
  await getClient(config).send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: "public, max-age=0, must-revalidate",
    Metadata: { sha256: createHash("sha256").update(buffer).digest("hex") },
  }), { abortSignal: AbortSignal.timeout(10000) });
  return { key, url: urlFor(key, config), size: buffer.length, lastModified: new Date().toISOString() };
}

async function deleteObject(key) {
  const config = getConfig();
  await getClient(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }), {
    abortSignal: AbortSignal.timeout(10000),
  });
}

async function purge(key) {
  const zoneId = process.env.CLOUDFLARE_CACHE_ZONE_ID;
  const token = process.env.CLOUDFLARE_CACHE_PURGE_TOKEN;
  if (!zoneId || !token) return "not_configured";
  if (!/^[a-f0-9]{32}$/i.test(zoneId)) return "purge_failed";
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ files: [urlFor(key)] }),
      signal: AbortSignal.timeout(5000),
    });
    const result = await response.json();
    return response.ok && result.success ? "purged" : "purge_failed";
  } catch {
    return "purge_failed";
  }
}

module.exports = { list, exists, put, delete: deleteObject, purge, urlFor };
