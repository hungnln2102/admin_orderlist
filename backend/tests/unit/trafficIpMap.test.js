const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { buildIpMapClusters, getTrafficIpMap } = require("../../src/domains/traffic/services/trafficIpService");

test("buildIpMapClusters groups nearby IPs by 0.01-deg grid without exposing raw IP strings", () => {
  const now = Date.now();
  const entries = new Map([
    ["14.161.10.1", { ip: "14.161.10.1", hits: 25, lastSeenMs: now - 5000 }],
    ["14.161.10.2", { ip: "14.161.10.2", hits: 10, lastSeenMs: now }],
    ["113.190.20.5", { ip: "113.190.20.5", hits: 12, lastSeenMs: now - 2000 }],
    ["10.0.0.1", { ip: "10.0.0.1", hits: 4, lastSeenMs: now - 1000 }],
  ]);

  const fakeReader = {
    get(ip) {
      if (ip === "14.161.10.1" || ip === "14.161.10.2") {
        return {
          city: { names: { en: "Ho Chi Minh City" } },
          country: { names: { en: "Vietnam" }, iso_code: "VN" },
          location: { latitude: 10.7764, longitude: 106.7009 },
        };
      }
      if (ip === "113.190.20.5") {
        return {
          city: { names: { en: "Hanoi" } },
          country: { names: { en: "Vietnam" }, iso_code: "VN" },
          location: { latitude: 21.0278, longitude: 105.8342 },
        };
      }
      return null;
    },
  };

  const result = buildIpMapClusters(entries, fakeReader);
  assert.equal(result.totalIps, 4);
  assert.equal(result.mappedIps, 3);
  assert.equal(result.totalHits, 51);
  assert.equal(result.points.length, 2);

  const [hcm, hanoi] = result.points;
  assert.equal(hcm.city, "Ho Chi Minh City");
  assert.equal(hcm.countryCode, "VN");
  assert.equal(hcm.ipCount, 2);
  assert.equal(hcm.hits, 35);
  assert.equal(hcm.lat, 10.78);
  assert.equal(hcm.lng, 106.7);
  assert.equal("ip" in hcm, false);

  assert.equal(hanoi.city, "Hanoi");
  assert.equal(hanoi.ipCount, 1);
  assert.equal(hanoi.hits, 12);
});

test("getTrafficIpMap returns log_not_configured when TRAFFIC_ACCESS_LOG_DIR is missing", async () => {
  const prevDir = process.env.TRAFFIC_ACCESS_LOG_DIR;
  delete process.env.TRAFFIC_ACCESS_LOG_DIR;
  try {
    const result = await getTrafficIpMap({ days: 30 });
    assert.deepEqual(result, { available: false, reason: "log_not_configured" });
  } finally {
    if (prevDir !== undefined) process.env.TRAFFIC_ACCESS_LOG_DIR = prevDir;
  }
});

test("getTrafficIpMap reports geoAvailable=false cleanly when log exists without GeoIP DB", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "traffic-ip-map-"));
  const prevDir = process.env.TRAFFIC_ACCESS_LOG_DIR;
  const prevDb = process.env.TRAFFIC_GEOIP_DB;
  try {
    const ts = Math.floor(Date.now() / 1000) - 60;
    await fs.writeFile(path.join(tmpDir, "traffic.log"), `14.161.10.1 ${ts}\n14.161.10.1 ${ts + 10}\n`, "utf8");
    process.env.TRAFFIC_ACCESS_LOG_DIR = tmpDir;
    delete process.env.TRAFFIC_GEOIP_DB;

    const result = await getTrafficIpMap({ days: 7 });
    assert.equal(result.available, true);
    assert.equal(result.geoAvailable, false);
    assert.equal(result.totalIps, 1);
    assert.equal(result.mappedIps, 0);
    assert.equal(result.totalHits, 2);
    assert.deepEqual(result.points, []);
  } finally {
    if (prevDir !== undefined) process.env.TRAFFIC_ACCESS_LOG_DIR = prevDir;
    else delete process.env.TRAFFIC_ACCESS_LOG_DIR;
    if (prevDb !== undefined) process.env.TRAFFIC_GEOIP_DB = prevDb;
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
