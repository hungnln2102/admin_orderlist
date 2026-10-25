const dns = require("node:dns").promises;
const net = require("node:net");

const MAX_EXTERNAL_RESPONSE_BYTES = 512 * 1024;

function isPrivateIpv4(address) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [first, second] = parts;
  return first === 0 || first === 10 || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 192 && second === 0)
    || (first === 198 && (second === 18 || second === 19))
    || first >= 224;
}

function isPrivateIpAddress(address) {
  const normalized = String(address || "").toLowerCase();
  const family = net.isIP(normalized);
  if (!family) return true;
  if (family === 4) return isPrivateIpv4(normalized);
  if (normalized === "::" || normalized === "::1" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  const mappedV4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mappedV4 ? isPrivateIpv4(mappedV4[1]) : false;
}

async function assertSafeExternalUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw new Error("External service URL is invalid.");
  }

  if (url.protocol !== "https:" || url.username || url.password || !url.hostname) {
    throw new Error("Only public HTTPS URLs without embedded credentials are allowed.");
  }
  if (url.hostname.toLowerCase() === "localhost") throw new Error("Localhost and private networks are not allowed.");

  if (net.isIP(url.hostname)) {
    if (isPrivateIpAddress(url.hostname)) throw new Error("Private IP addresses are not allowed.");
    return url;
  }

  let addresses;
  try {
    addresses = await dns.lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("External hostname cannot be resolved.");
  }
  if (!addresses.length || addresses.some(({ address }) => isPrivateIpAddress(address))) {
    throw new Error("External hostname resolves to a private or unsafe address.");
  }
  return url;
}

async function fetchSafeExternal(value, options = {}) {
  const url = await assertSafeExternalUrl(value);
  return fetch(url, { ...options, redirect: "error" });
}

async function readExternalResponse(response, maxBytes = MAX_EXTERNAL_RESPONSE_BYTES) {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) throw new Error("External response exceeds the allowed size.");
  const body = await response.text();
  if (Buffer.byteLength(body, "utf8") > maxBytes) throw new Error("External response exceeds the allowed size.");
  return body;
}

module.exports = { MAX_EXTERNAL_RESPONSE_BYTES, assertSafeExternalUrl, fetchSafeExternal, readExternalResponse };
