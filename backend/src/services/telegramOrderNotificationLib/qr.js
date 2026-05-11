/**
 * QR helpers cho thông báo đơn hàng:
 *   - Builder URL ảnh QR (VietQR compact / Sepay quick).
 *   - Fetcher tải bytes QR về backend với timeout + multi-provider + LRU cache,
 *     để tránh Telegram tự GET URL chậm (~18s) khi provider chậm/down.
 *
 * @see https://www.vietqr.io/danh-sach-api/link-tao-ma-nhanh/api-tao-ma-qr/
 */

const https = require("https");
const { URL } = require("url");

const {
  QR_ACCOUNT_NUMBER,
  QR_BANK_CODE,
  QR_ACCOUNT_NAME,
  QR_NOTE_PREFIX,
} = require("./constants");
const { preferIpv4Lookup } = require("./dnsHelpers");

const VIETQR_IMAGE_TEMPLATE = "compact";

// ============================================================================
// URL builders (pure)
// ============================================================================

/**
 * Format: https://img.vietqr.io/image/{BANK_CODE}-{ACCOUNT}-{template}.png?amount=...&addInfo=...&accountName=...
 */
function buildSepayQrUrl({
  accountNumber,
  bankCode,
  amount,
  description,
  accountName,
  template = VIETQR_IMAGE_TEMPLATE,
}) {
  const acc = String(accountNumber || "").trim();
  const bank = String(bankCode || "").trim();
  if (!acc || !bank) return "";

  const params = new URLSearchParams();

  const numericAmount = Number(amount);
  if (Number.isFinite(numericAmount) && numericAmount > 0) {
    params.set("amount", Math.round(numericAmount).toString());
  }

  const desc = String(description || "").trim();
  if (desc) {
    params.set("addInfo", desc);
  }

  const name = String(accountName || "").trim();
  if (name) {
    params.set("accountName", name);
  }

  const queryString = params.toString();
  const tpl = String(template || VIETQR_IMAGE_TEMPLATE).trim() || VIETQR_IMAGE_TEMPLATE;
  return `https://img.vietqr.io/image/${bank}-${acc}-${tpl}.png${queryString ? `?${queryString}` : ""}`;
}

/**
 * Build VietQR URL for due order notifications (giống mavrykstore_bot)
 */
function buildVietQrUrl({ amount, orderCode }) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return "";

  const params = new URLSearchParams();
  params.set("amount", Math.round(numericAmount).toString());
  const note = [QR_NOTE_PREFIX, String(orderCode || "").trim()].filter(Boolean).join(" ").trim();
  if (note) {
    params.set("addInfo", note);
  }
  params.set("accountName", QR_ACCOUNT_NAME);

  return `https://img.vietqr.io/image/${QR_BANK_CODE}-${QR_ACCOUNT_NUMBER}-${VIETQR_IMAGE_TEMPLATE}.png?${params.toString()}`;
}

/**
 * Danh sách provider URL theo thứ tự ưu tiên: vietqr.io → qr.sepay.vn.
 * Trả mảng rỗng nếu thiếu bank/acc (không build được URL hợp lệ).
 */
function buildQrProviderUrls({
  amount,
  addInfo,
  accountName,
  bankCode,
  accountNumber,
}) {
  const bank = String(bankCode || QR_BANK_CODE || "").trim();
  const acc = String(accountNumber || QR_ACCOUNT_NUMBER || "").trim();
  if (!bank || !acc) return [];

  const desc = String(addInfo || "").trim();
  const name = String(accountName || QR_ACCOUNT_NAME || "").trim();
  const numericAmount = Number(amount);
  const hasAmount = Number.isFinite(numericAmount) && numericAmount > 0;
  const amountStr = hasAmount ? Math.round(numericAmount).toString() : "";

  const vietQrParams = new URLSearchParams();
  if (hasAmount) vietQrParams.set("amount", amountStr);
  if (desc) vietQrParams.set("addInfo", desc);
  if (name) vietQrParams.set("accountName", name);
  const vietQrUrl = `https://img.vietqr.io/image/${bank}-${acc}-${VIETQR_IMAGE_TEMPLATE}.png${
    vietQrParams.toString() ? `?${vietQrParams.toString()}` : ""
  }`;

  const sepayParams = new URLSearchParams();
  sepayParams.set("acc", acc);
  sepayParams.set("bank", bank);
  if (hasAmount) sepayParams.set("amount", amountStr);
  if (desc) sepayParams.set("des", desc);
  const sepayUrl = `https://qr.sepay.vn/img?${sepayParams.toString()}`;

  return [vietQrUrl, sepayUrl];
}

// ============================================================================
// QR bytes fetcher (network + cache)
// ============================================================================

const FETCH_TIMEOUT_MS = (() => {
  const raw = Number.parseInt(process.env.TELEGRAM_QR_FETCH_TIMEOUT_MS || "", 10);
  if (Number.isFinite(raw) && raw >= 1000 && raw <= 30000) return raw;
  return 4000;
})();

const CACHE_TTL_MS = (() => {
  const raw = Number.parseInt(process.env.TELEGRAM_QR_CACHE_TTL_MS || "", 10);
  if (Number.isFinite(raw) && raw >= 1000 && raw <= 600_000) return raw;
  return 5 * 60 * 1000;
})();

const CACHE_MAX_ENTRIES = 50;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

/** LRU map nhỏ — Map giữ thứ tự insertion. */
const cache = new Map();

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

function cacheSet(key, value) {
  cache.set(key, { value, at: Date.now() });
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

function clearCache() {
  cache.clear();
}

/**
 * HTTPS GET → Buffer. Timeout chặt (mặc định 4s). KHÔNG retry trong hàm này —
 * retry do `fetchQrImageBytes` orchestrator quản (qua provider list).
 *
 * @param {string} url
 * @param {{ timeoutMs?: number }} [options]
 * @returns {Promise<Buffer>}
 */
function httpsGetBuffer(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (err) {
      return reject(err);
    }

    const req = https.request(
      {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: `${urlObj.pathname}${urlObj.search}`,
        method: "GET",
        headers: {
          "User-Agent": "MavrykStoreBot/1.0",
          Accept: "image/png,image/jpeg,image/*",
        },
        agent: new https.Agent({ keepAlive: true, lookup: preferIpv4Lookup }),
      },
      (res) => {
        const status = res.statusCode || 0;
        if (status < 200 || status >= 300) {
          res.resume();
          const err = new Error(`HTTP ${status} from ${urlObj.hostname}`);
          err.status = status;
          return reject(err);
        }
        const contentType = String(res.headers["content-type"] || "").toLowerCase();
        if (contentType && !contentType.startsWith("image/")) {
          res.resume();
          const err = new Error(
            `Unexpected content-type "${contentType}" from ${urlObj.hostname}`
          );
          err.contentType = contentType;
          return reject(err);
        }

        const chunks = [];
        let received = 0;
        let aborted = false;
        res.on("data", (chunk) => {
          if (aborted) return;
          received += chunk.length;
          if (received > MAX_RESPONSE_BYTES) {
            aborted = true;
            res.destroy(new Error(`QR response > ${MAX_RESPONSE_BYTES} bytes`));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          if (aborted) return;
          if (chunks.length === 0) {
            return reject(new Error(`Empty response from ${urlObj.hostname}`));
          }
          resolve(Buffer.concat(chunks));
        });
        res.on("error", reject);
      }
    );

    req.setTimeout(timeoutMs, () => {
      const err = new Error(`QR fetch timed out after ${timeoutMs}ms (${urlObj.hostname})`);
      err.code = "ETIMEDOUT";
      req.destroy(err);
    });
    req.on("error", reject);
    req.end();
  });
}

/**
 * Fetch QR ảnh theo thứ tự provider; trả về { buffer, sourceUrl, cached } đầu
 * tiên thành công. Có cache theo provider URL.
 *
 * @param {{ amount?: number, addInfo?: string, accountName?: string, bankCode?: string, accountNumber?: string }} args
 * @param {{ timeoutMs?: number, deps?: { httpsGetBuffer?: typeof httpsGetBuffer }, providers?: string[] }} [options]
 * @returns {Promise<{ buffer: Buffer, sourceUrl: string, cached: boolean } | null>}
 */
async function fetchQrImageBytes(args, options = {}) {
  const providers =
    Array.isArray(options.providers) && options.providers.length > 0
      ? options.providers
      : buildQrProviderUrls(args);
  if (providers.length === 0) return null;

  const fetchFn = options.deps?.httpsGetBuffer || httpsGetBuffer;
  const timeoutMs = options.timeoutMs ?? FETCH_TIMEOUT_MS;

  const errors = [];
  for (const url of providers) {
    const cached = cacheGet(url);
    if (cached) {
      return { buffer: cached, sourceUrl: url, cached: true };
    }
    try {
      const buffer = await fetchFn(url, { timeoutMs });
      if (Buffer.isBuffer(buffer) && buffer.length > 0) {
        cacheSet(url, buffer);
        return { buffer, sourceUrl: url, cached: false };
      }
      errors.push({ url, error: "empty buffer" });
    } catch (err) {
      errors.push({ url, error: err?.message || String(err) });
    }
  }

  const aggregated = new Error("All QR providers failed");
  aggregated.providerErrors = errors;
  throw aggregated;
}

module.exports = {
  buildSepayQrUrl,
  buildVietQrUrl,
  buildQrProviderUrls,
  fetchQrImageBytes,
  httpsGetBuffer,
  clearCache,
  VIETQR_IMAGE_TEMPLATE,
  FETCH_TIMEOUT_MS,
  CACHE_TTL_MS,
  __testing: { cache, cacheGet, cacheSet },
};
