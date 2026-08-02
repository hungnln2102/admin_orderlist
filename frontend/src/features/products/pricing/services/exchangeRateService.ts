const FX_TTL_MS = 10 * 60 * 1000;
const FX_BASE_URL = "https://open.er-api.com/v6/latest";

type CachedRate = {
  rateToVnd: number;
  fetchedAt: number;
};

const exchangeRateCache = new Map<string, CachedRate>();

const normalizeCurrency = (currency: string): string =>
  String(currency || "VND").trim().toUpperCase();

const isValidRate = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const getCachedRate = (currency: string): number | null => {
  const cached = exchangeRateCache.get(currency);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > FX_TTL_MS) return null;
  return cached.rateToVnd;
};

const setCachedRate = (currency: string, rateToVnd: number): void => {
  exchangeRateCache.set(currency, {
    rateToVnd,
    fetchedAt: Date.now(),
  });
};

export const getRateToVnd = async (currency: string): Promise<number> => {
  const normalizedCurrency = normalizeCurrency(currency);
  if (normalizedCurrency === "VND") return 1;

  const cachedRate = getCachedRate(normalizedCurrency);
  if (cachedRate) return cachedRate;

  const response = await fetch(
    `${FX_BASE_URL}/${encodeURIComponent(normalizedCurrency)}`
  );
  if (!response.ok) {
    throw new Error(`Không thể tải tỷ giá ${normalizedCurrency} -> VND.`);
  }

  const payload = (await response.json()) as {
    result?: string;
    rates?: Record<string, number>;
  };

  const rateToVnd = payload?.rates?.VND;
  if (!isValidRate(rateToVnd)) {
    throw new Error(`Không có tỷ giá hợp lệ cho ${normalizedCurrency}.`);
  }

  setCachedRate(normalizedCurrency, rateToVnd);
  return rateToVnd;
};

export const convertAmountToVnd = async (
  amount: number,
  currency: string
): Promise<{ convertedAmount: number; rateToVnd: number }> => {
  const normalizedCurrency = normalizeCurrency(currency);
  const safeAmount = Number(amount);
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    return { convertedAmount: 0, rateToVnd: normalizedCurrency === "VND" ? 1 : 0 };
  }

  const rateToVnd = await getRateToVnd(normalizedCurrency);
  const convertedAmount = Math.max(0, Math.round(safeAmount * rateToVnd));
  return { convertedAmount, rateToVnd };
};
