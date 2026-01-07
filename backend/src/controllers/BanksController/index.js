const https = require("https");
const { db } = require("../../db");
const { DB_SCHEMA, tableName } = require("../../config/dbSchema");

const BANK_SOURCE_URL =
  process.env.BANK_LIST_SOURCE_URL || "https://api.vietqr.io/v2/banks";
const BANK_SOURCE_TIMEOUT_MS = Number(process.env.BANK_LIST_TIMEOUT_MS || 8000);

const fetchJson = async (url, timeoutMs) => {
  if (typeof fetch === "function") {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  // Fallback for runtimes without fetch (Node < 18)
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { timeout: timeoutMs, headers: { accept: "application/json" } },
      (res) => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.resume();
          reject(
            new Error(`Request failed with status ${res.statusCode || "n/a"}`)
          );
          return;
        }

        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Request timeout"));
    });
  });
};

const normalizeBanks = (items = []) => {
  const seen = new Set();
  const output = [];

  items.forEach((item) => {
    const bin = String(
      item?.bin ??
        item?.binBank ??
        item?.bin_bank ??
        item?.id ??
        item?.code ??
        ""
    ).trim();
    const name = String(
      item?.shortName ??
        item?.short_name ??
        item?.name ??
        item?.bankName ??
        item?.bank_name ??
        item?.bank ??
        item?.code ??
        ""
    ).trim();

    if (!bin || !name || seen.has(bin)) return;
    seen.add(bin);
    output.push({ bin, bank_name: name });
  });

  output.sort((a, b) => a.bank_name.localeCompare(b.bank_name, "vi"));
  return output;
};

const fetchBanksFromSource = async () => {
  const payload = await fetchJson(BANK_SOURCE_URL, BANK_SOURCE_TIMEOUT_MS);
  const rawBanks = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
    ? payload
    : [];
  return normalizeBanks(rawBanks);
};

const persistBanks = async (banks, bankTable, binCol, bankNameCol) => {
  if (!banks.length) return;

  const rows = banks.map((b) => ({
    [binCol]: b.bin,
    [bankNameCol]: b.bank_name,
  }));

  try {
    await db(bankTable).insert(rows).onConflict(binCol).merge();
  } catch (_err) {
    // Fallback when the table has no unique constraint on BIN.
    await db.transaction(async (trx) => {
      await trx(bankTable).del();
      await trx(bankTable).insert(rows);
    });
  }
};

const listBanks = async (_req, res) => {
  const bankDef = DB_SCHEMA.BANK_LIST;
  const bankTable = tableName(bankDef.TABLE);
  const { BIN: binCol, BANK_NAME: bankNameCol } = bankDef.COLS;

  try {
    const banks = await fetchBanksFromSource();
    if (banks.length) {
      await persistBanks(banks, bankTable, binCol, bankNameCol);
      return res.json(banks);
    }
  } catch (error) {
    console.error("[banks] External source fetch failed:", error);
  }

  try {
    const rows = await db(bankTable)
      .select(binCol, bankNameCol)
      .orderBy(bankNameCol, "asc");
    return res.json(rows || []);
  } catch (error) {
    console.error("[banks] Query failed:", error);
    return res
      .status(500)
      .json({ error: "Khong the tai danh sach ngan hang" });
  }
};

module.exports = {
  listBanks,
};
