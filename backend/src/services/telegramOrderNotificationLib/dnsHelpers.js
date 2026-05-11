/**
 * DNS lookup helper ưu tiên IPv4, an toàn với options từ https.Agent.
 *
 * Bug đã từng gặp: spread `options` (do Agent truyền) vào `dns.lookup` làm
 * `dns.lookup` nhận `localAddress: undefined`, `family: 0`, v.v. gây lỗi
 * `Invalid IP address: undefined` trên một số bản Node/Windows.
 *
 * Cách xử lý:
 *   1. Chỉ forward một số field dns.lookup hỗ trợ (`hints`, `verbatim`).
 *   2. Thử IPv4 trước (`family: 4, all: false`); nếu fail/empty, fallback
 *      `all: true` rồi tự chọn IPv4 trong mảng.
 *   3. Normalize address (chấp nhận string hoặc { address, family }).
 *   4. Trả về theo đúng API `cb(err, address, family)` HOẶC `cb(err, [addresses])`
 *      khi caller truyền `options.all === true`.
 */

const dns = require("dns");
const net = require("net");

const dnsLookupOpts = (options, overrides) => {
  const out = { ...overrides };
  if (options && typeof options === "object") {
    if (options.hints != null) out.hints = options.hints;
    if (options.verbatim != null) out.verbatim = options.verbatim;
  }
  return out;
};

const normalizeLookupAddress = (address, family) => {
  if (Array.isArray(address)) {
    const normalized = address
      .map((item) => normalizeLookupAddress(item))
      .filter(Boolean);
    return normalized.find((item) => item.family === 4) || normalized[0] || null;
  }

  const rawAddress =
    address && typeof address === "object" ? address.address : address;
  const ip = typeof rawAddress === "string" ? rawAddress.trim() : "";
  const detectedFamily = net.isIP(ip);

  if (!detectedFamily) return null;

  return {
    address: ip,
    family: detectedFamily || Number(family) || 4,
  };
};

const completeLookup = (options, cb, resolved) => {
  if (options?.all === true) {
    cb(null, [resolved]);
    return;
  }
  cb(null, resolved.address, resolved.family);
};

/**
 * Có thể dùng làm `lookup` cho `https.Agent`.
 *
 * @param {string} hostname
 * @param {object|number} options (object Node truyền hoặc số family)
 * @param {(err: Error|null, address?: string|object[], family?: number) => void} cb
 */
function preferIpv4Lookup(hostname, options, cb) {
  // dns.lookup hỗ trợ 2-arg & 3-arg; trong 2-arg, options là cb.
  let opts = options;
  let callback = cb;
  if (typeof opts === "function" && typeof callback !== "function") {
    callback = opts;
    opts = {};
  }
  if (typeof callback !== "function") {
    throw new TypeError("preferIpv4Lookup: callback is required");
  }

  if (typeof hostname !== "string" || !hostname.trim()) {
    process.nextTick(() =>
      callback(new TypeError("Invalid hostname for DNS lookup"))
    );
    return;
  }

  const tryCb = (err, address, family) => {
    if (err) {
      callback(err);
      return;
    }
    const resolved = normalizeLookupAddress(address, family);
    if (!resolved) {
      callback(new Error(`DNS lookup returned no valid address for ${hostname}`));
      return;
    }
    completeLookup(opts, callback, resolved);
  };

  dns.lookup(
    hostname,
    dnsLookupOpts(opts, { family: 4, all: false }),
    (err, address, family) => {
      const resolved = normalizeLookupAddress(address, family);
      if (err || !resolved) {
        return dns.lookup(
          hostname,
          dnsLookupOpts(opts, { all: true }),
          tryCb
        );
      }
      tryCb(null, resolved.address, resolved.family);
    }
  );
}

module.exports = {
  preferIpv4Lookup,
  // export internals để test xác nhận từng nhánh.
  __testing: {
    dnsLookupOpts,
    normalizeLookupAddress,
    completeLookup,
  },
};
