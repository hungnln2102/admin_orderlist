const logger = require("../../../utils/logger");

const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

let cachedRate = null;
let cachedAt = 0;

const BINANCE_SYMBOLS = ["USDTVND", "BUSDVND"];

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
};

const parseBinancePrice = (payload) => {
  const price = Number(payload?.price);
  if (!Number.isFinite(price) || price <= 0) return null;
  return Math.round(price * 100) / 100;
};

const fetchUsdtVndFromBinance = async () => {
  for (const symbol of BINANCE_SYMBOLS) {
    try {
      const data = await fetchJson(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
      );
      const rate = parseBinancePrice(data);
      if (rate) {
        return { rate, symbol, source: "binance_spot" };
      }
    } catch (error) {
      logger.warn("[binance-rate] symbol fetch failed", {
        symbol,
        error: error.message,
      });
    }
  }

  try {
    const data = await fetchJson(
      "https://api.binance.com/api/v3/ticker/bookTicker?symbol=USDTBUSD"
    );
    const bid = Number(data?.bidPrice);
    const ask = Number(data?.askPrice);
    if (Number.isFinite(bid) && Number.isFinite(ask) && bid > 0 && ask > 0) {
      return {
        rate: null,
        usdPerUsdt: Math.round(((bid + ask) / 2) * 10000) / 10000,
        symbol: "USDTBUSD",
        source: "binance_spot_usd_only",
      };
    }
  } catch (error) {
    logger.warn("[binance-rate] USDTBUSD fallback failed", { error: error.message });
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
  if (!fetched.rate) {
    throw new Error(
      "Binance chưa có cặp USDT/VND trên API spot. Cần cấu hình tỷ giá thủ công."
    );
  }

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
