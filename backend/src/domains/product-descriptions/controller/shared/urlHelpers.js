const path = require("path");
const logger = require("../../../../utils/logger");
const { isImageFile } = require("./constants");

const getForwardedHeader = (req, headerName) => {
  const raw = req.get(headerName);
  if (!raw) return "";
  return String(raw).split(",")[0].trim();
};

const getBaseFromHeader = (req, headerName) => {
  const raw = getForwardedHeader(req, headerName);
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return "";
  }
};

const isLocalHostValue = (value) =>
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(value || "");

const normalizeBaseUrl = (value) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

const isLocalBaseUrl = (baseUrl) => {
  if (!baseUrl) return false;
  try {
    return isLocalHostValue(new URL(baseUrl).host);
  } catch {
    return false;
  }
};

const pickBaseUrl = (envBase, originBase, forwardedBase, hostBase) => {
  const candidates = [envBase, originBase, forwardedBase, hostBase];
  for (const candidate of candidates) {
    if (candidate && !isLocalBaseUrl(candidate)) return candidate;
  }
  // When everything is localhost, prefer the backend host (serves /image).
  if (hostBase) return hostBase;
  if (forwardedBase) return forwardedBase;
  return originBase || envBase || "";
};

const buildImageUrl = (req, filename) => {
  const envBase = normalizeBaseUrl(
    process.env.PUBLIC_BASE_URL || process.env.BASE_PUBLIC_URL
  );

  const originBase = normalizeBaseUrl(
    getBaseFromHeader(req, "origin") || getBaseFromHeader(req, "referer")
  );

  const forwardedProto = getForwardedHeader(req, "x-forwarded-proto");
  const forwardedHost =
    getForwardedHeader(req, "x-forwarded-host") ||
    getForwardedHeader(req, "x-original-host") ||
    getForwardedHeader(req, "x-forwarded-server");
  const forwardedPort = getForwardedHeader(req, "x-forwarded-port");

  const protocol = forwardedProto || req.protocol || "http";
  const forwardedHostValue =
    forwardedHost && forwardedPort && !forwardedHost.includes(":")
      ? `${forwardedHost}:${forwardedPort}`
      : forwardedHost;
  const forwardedBase = forwardedHostValue
    ? normalizeBaseUrl(`${protocol}://${forwardedHostValue}`)
    : "";
  const hostHeader = req.get("host") || "";
  const hostBase = hostHeader
    ? normalizeBaseUrl(`${protocol}://${hostHeader}`)
    : "";

  const base = pickBaseUrl(envBase, originBase, forwardedBase, hostBase);

  logger.debug("[image-url]", {
    envBase,
    originBase,
    forwardedProto,
    forwardedHost,
    forwardedPort,
    hostHeader,
    pickedBase: base,
  });

  const finalBase = base || normalizeBaseUrl("http://localhost:3001");
  return `${finalBase}/image/${encodeURIComponent(filename)}`;
};

const extractImageFileName = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withoutHash = raw.split("#")[0];
  const withoutQuery = withoutHash.split("?")[0];
  try {
    const url = new URL(withoutQuery);
    return path.basename(url.pathname || "");
  } catch {
    if (withoutQuery.includes("/")) {
      return path.basename(withoutQuery);
    }
    return withoutQuery;
  }
};

const normalizeImageUrl = (req, value) => {
  const raw = String(value || "").trim();
  if (!raw || !req) return raw;

  try {
    const parsed = new URL(raw);
    if (!isLocalHostValue(parsed.host)) {
      return raw;
    }
  } catch {
    // Not an absolute URL, continue normalization.
  }

  const fileName = extractImageFileName(raw);
  if (!fileName || !isImageFile(fileName)) {
    return raw;
  }

  const resolved = buildImageUrl(req, fileName);
  if (resolved && resolved != raw) {
    logger.debug("[image-url] normalized", { raw, resolved, fileName });
  }
  return resolved || raw;
};

module.exports = {
  normalizeBaseUrl,
  buildImageUrl,
  extractImageFileName,
  normalizeImageUrl,
};
