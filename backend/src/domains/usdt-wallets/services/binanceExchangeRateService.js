const logger = require("../../../utils/logger");

const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

const BINANCE_P2P_SEARCH_URL =
  "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search";

const P2P_HEADERS = {
  "Content-Type": "application/json",
  clienttype: "web",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

let cachedRate = null;
let cachedAt = 0;

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
};

const roundRate = (value) => {
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return Math.round(rate * 100) / 100;
};

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

const parseP2pPrices = (payload) => {
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  const prices = [];
  for (const row of rows) {
    const price = roundRate(row?.adv?.price);
    if (price) prices.push(price);
  }
  return prices;
};

const fetchUsdtVndFromBinanceP2p = async () => {
  const payload = await fetchWithTimeout(BINANCE_P2P_SEARCH_URL, {
    method: "POST",
    headers: P2P_HEADERS,
    body: JSON.stringify({
      asset: "USDT",
      fiat: "VND",
      tradeType: "BUY",
      page: 1,
      rows: 10,
      publisherType: "merchant",
    }),
  });

  if (payload?.code !== "000000") {
    throw new Error(payload?.message || "Binance P2P trả về lỗi.");
  }

  const prices = parseP2pPrices(payload);
  const rate = median(prices);
  if (!rate) {
    throw new Error("Binance P2P không có giá USDT/VND hợp lệ.");
  }

  return {
    rate,
    symbol: "USDT/VND",
    source: "binance_p2p",
  };
};

const fetchUsdtVndFromCoinGecko = async () => {
  const payload = await fetchWithTimeout(
    "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=vnd"
  );
  const rate = roundRate(payload?.tether?.vnd);
  if (!rate) {
    throw new Error("CoinGecko không có giá USDT/VND hợp lệ.");
  }
  return {
    rate,
    symbol: "USDT/VND",
    source: "coingecko",
  };
};

const fetchUsdtVndFromBinance = async () => {
  try {
    return await fetchUsdtVndFromBinanceP2p();
  } catch (error) {
    logger.warn("[binance-rate] P2P fetch failed", { error: error.message });
  }

  try {
    const fallback = await fetchUsdtVndFromCoinGecko();
    logger.warn("[binance-rate] using CoinGecko fallback for USDT/VND", {
      rate: fallback.rate,
    });
    return fallback;
  } catch (error) {
    logger.warn("[binance-rate] CoinGecko fallback failed", {
      error: error.message,
    });
  }

  throw new Error(
    "Không lấy được tỷ giá USDT/VND từ Binance. Vui lòng thử lại sau."
  );
};

const getUsdtVndRate = async ({ forceRefresh = false } = {}) => {
  const now = Date.now();
  if (!forceRefresh && cachedRate && now - cachedAt < CACHE_TTL_MS) {
    return cachedRate;
  }

  const fetched = await fetchUsdtVndFromBinance();
  cachedRate = {
    vndPerUsdt: fetched.rate,
    symbol: fetched.symbol,
    source: fetched.source,
    fetchedAt: new Date().toISOString(),
  };
  cachedAt = now;
  return cachedRate;
};

const convertVndToUsd = (vndAmount, vndPerUsdt) => {
  const vnd = Number(vndAmount);
  const rate = Number(vndPerUsdt);
  if (!Number.isFinite(vnd) || vnd <= 0 || !Number.isFinite(rate) || rate <= 0) {
    return 0;
  }
  return Math.round((vnd / rate) * 10000) / 10000;
};

module.exports = {
  getUsdtVndRate,
  convertVndToUsd,
};
