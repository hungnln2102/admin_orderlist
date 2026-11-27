const { createReadStream } = require("node:fs");
const { readdir } = require("node:fs/promises");
const { isIP } = require("node:net");
const path = require("node:path");
const readline = require("node:readline");
const { createGunzip } = require("node:zlib");
const maxmind = require("maxmind");

const DAY_MS = 86_400_000;
const MAX_IP_MAP_CLUSTERS = 500;
const canonicalIp = (address) => isIP(address) === 6 && !address.includes("%")
  ? new URL(`http://[${address}]`).hostname.slice(1, -1)
  : address;
let geoReader;
let geoReaderPath;

/**
 * Đọc và gộp số lượt truy cập theo IP từ các file traffic.log trong khoảng days ngày gần nhất.
 */
async function readTrafficLogEntries({ days, search = "" }) {
  const directory = process.env.TRAFFIC_ACCESS_LOG_DIR;
  if (!directory) return { available: false, reason: "log_not_configured" };

  const now = Date.now();
  const cutoff = now - days * DAY_MS;
  const files = await readdir(directory, { withFileTypes: true });
  const logs = files.filter((file) => file.isFile() && /^traffic\.log(?:\.\d+(?:\.gz)?)?$/.test(file.name));
  if (logs.length === 0) return { available: false, reason: "log_not_found" };

  const entries = new Map();
  const query = search ? canonicalIp(search) : "";
  for (const { name } of logs) {
    const file = createReadStream(path.join(directory, name));
    const compressed = name.endsWith(".gz");
    const stream = compressed ? file.pipe(createGunzip()) : file;
    if (compressed) file.on("error", (error) => stream.destroy(error));
    try {
      for await (const line of readline.createInterface({ input: stream, crlfDelay: Infinity })) {
        const [address, timestamp] = line.split(" ");
        const time = Number(timestamp) * 1000;
        if (!isIP(address ?? "") || address.includes("%") || !Number.isFinite(time) || time < cutoff || time > now) continue;
        const ip = canonicalIp(address);
        if (query && !ip.includes(query)) continue;
        const entry = entries.get(ip) ?? { ip, hits: 0, lastSeenMs: 0 };
        entry.hits++;
        entry.lastSeenMs = Math.max(entry.lastSeenMs, time);
        entries.set(ip, entry);
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    } finally {
      file.destroy();
      stream.destroy();
    }
  }

  return { available: true, entries };
}

async function getGeoReader() {
  const database = process.env.TRAFFIC_GEOIP_DB;
  if (!database) return null;
  if (!geoReader || geoReaderPath !== database) {
    geoReaderPath = database;
    geoReader = maxmind.open(database).catch((error) => {
      geoReader = undefined;
      geoReaderPath = undefined;
      console.error("[TRAFFIC] GeoIP database unavailable:", error.code || error.name);
      return null;
    });
  }
  return geoReader;
}

/**
 * Tổng hợp các IP có tọa độ GeoIP thành cụm theo lưới 0.01 độ (~1.1km) để vẽ bản đồ, không lộ IP thô.
 */
function buildIpMapClusters(entries, reader, { maxPoints = MAX_IP_MAP_CLUSTERS } = {}) {
  let totalHits = 0;
  let mappedIps = 0;
  const clusters = new Map();

  for (const { ip, hits, lastSeenMs } of entries.values()) {
    totalHits += hits;
    const geo = reader?.get(ip);
    const rawLat = geo?.location?.latitude;
    const rawLng = geo?.location?.longitude;
    if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) continue;

    mappedIps++;
    const lat = Math.round(rawLat * 100) / 100;
    const lng = Math.round(rawLng * 100) / 100;
    const key = `${lat},${lng}`;
    const city = geo?.city?.names?.en ?? geo?.subdivisions?.[0]?.names?.en ?? null;
    const country = geo?.country?.names?.en ?? null;
    const countryCode = geo?.country?.iso_code ?? null;

    const existing = clusters.get(key);
    if (existing) {
      existing.ipCount += 1;
      existing.hits += hits;
      existing.lastSeenMs = Math.max(existing.lastSeenMs, lastSeenMs);
      if (!existing.city && city) existing.city = city;
      if (!existing.country && country) existing.country = country;
      if (!existing.countryCode && countryCode) existing.countryCode = countryCode;
    } else {
      clusters.set(key, {
        lat,
        lng,
        city,
        country,
        countryCode,
        ipCount: 1,
        hits,
        lastSeenMs,
      });
    }
  }

  const points = [...clusters.values()]
    .sort((a, b) => b.hits - a.hits || b.ipCount - a.ipCount || b.lastSeenMs - a.lastSeenMs)
    .slice(0, maxPoints)
    .map(({ lat, lng, city, country, countryCode, ipCount, hits, lastSeenMs }) => ({
      lat,
      lng,
      city,
      country,
      countryCode,
      ipCount,
      hits,
      lastSeen: new Date(lastSeenMs).toISOString(),
    }));

  return {
    points,
    totalIps: entries.size,
    mappedIps,
    totalHits,
  };
}

async function getTrafficIps({ days, search, page }) {
  const logResult = await readTrafficLogEntries({ days, search });
  if (!logResult.available) return logResult;

  const reader = await getGeoReader();
  const pageSize = 20;
  const items = [...logResult.entries.values()]
    .sort((a, b) => b.hits - a.hits || b.lastSeenMs - a.lastSeenMs || a.ip.localeCompare(b.ip))
    .slice((page - 1) * pageSize, page * pageSize)
    .map(({ ip, hits, lastSeenMs }) => {
      const geo = reader?.get(ip);
      return {
        ip,
        hits,
        lastSeen: new Date(lastSeenMs).toISOString(),
        city: geo?.city?.names?.en ?? geo?.subdivisions?.[0]?.names?.en ?? null,
        country: geo?.country?.names?.en ?? null,
      };
    });

  return { available: true, items, total: logResult.entries.size, pageSize, geoAvailable: Boolean(reader) };
}

async function getTrafficIpMap({ days }) {
  const logResult = await readTrafficLogEntries({ days });
  if (!logResult.available) return logResult;

  const reader = await getGeoReader();
  if (!reader) {
    let totalHits = 0;
    for (const entry of logResult.entries.values()) totalHits += entry.hits;
    return {
      available: true,
      geoAvailable: false,
      points: [],
      totalIps: logResult.entries.size,
      mappedIps: 0,
      totalHits,
    };
  }

  const summary = buildIpMapClusters(logResult.entries, reader);
  return {
    available: true,
    geoAvailable: true,
    ...summary,
  };
}

module.exports = { getTrafficIps, getTrafficIpMap, buildIpMapClusters };
