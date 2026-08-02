import { API_ENDPOINTS } from "@/constants";
import { apiGet, apiPost, apiPut, apiDelete } from "@/shared/api/client";
import type {
  UsdtExchangeRate,
  UsdtWalletBalanceItem,
  UsdtWalletItem,
  UsdtWalletPayload,
} from "../types";

type ListResponse = { items?: unknown[] };

const toBool = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
};

export const normalizeUsdtWalletItem = (value: unknown): UsdtWalletItem => {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id) || 0,
    label: row.label != null ? String(row.label) : null,
    walletAddress: String(row.walletAddress ?? row.wallet_address ?? "").trim(),
    network: String(row.network ?? "TRC20")
      .trim()
      .toUpperCase(),
    isDefault: toBool(row.isDefault ?? row.is_default, false),
    isActive: toBool(row.isActive ?? row.is_active, true),
    totalWithdrawn: Number(row.totalWithdrawn ?? row.total_withdrawn) || 0,
    totalReceived: Number(row.totalReceived ?? row.total_received) || 0,
    balance: Number(row.balance) || 0,
    createdAt:
      row.createdAt != null
        ? String(row.createdAt)
        : row.created_at != null
          ? String(row.created_at)
          : null,
    updatedAt:
      row.updatedAt != null
        ? String(row.updatedAt)
        : row.updated_at != null
          ? String(row.updated_at)
          : null,
  };
};

export const normalizeUsdtWalletBalanceItem = (value: unknown): UsdtWalletBalanceItem => {
  const base = normalizeUsdtWalletItem(value);
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    ...base,
    totalReceived: Number(row.totalReceived ?? row.total_received) || 0,
    totalWithdrawn: Number(row.totalWithdrawn ?? row.total_withdrawn) || base.totalWithdrawn || 0,
    balanceRemaining: Number(row.balanceRemaining ?? row.balance_remaining ?? row.balance) || 0,
  };
};

export async function fetchUsdtWallets(): Promise<UsdtWalletItem[]> {
  const data = await apiGet<ListResponse>(API_ENDPOINTS.USDT_WALLETS);
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map(normalizeUsdtWalletItem);
}

export async function fetchUsdtWalletBalances(): Promise<UsdtWalletBalanceItem[]> {
  const data = await apiGet<ListResponse>(API_ENDPOINTS.USDT_WALLET_BALANCES);
  const items = Array.isArray(data?.items) ? data.items : [];
  return items.map(normalizeUsdtWalletBalanceItem);
}

export async function fetchUsdtExchangeRate(refresh = false): Promise<UsdtExchangeRate> {
  const url = refresh
    ? `${API_ENDPOINTS.USDT_WALLET_EXCHANGE_RATE}?refresh=1`
    : API_ENDPOINTS.USDT_WALLET_EXCHANGE_RATE;
  const row = await apiGet<Record<string, unknown>>(url);
  return {
    vndPerUsdt: Number(row.vndPerUsdt ?? row.vnd_per_usdt) || 0,
    symbol: row.symbol != null ? String(row.symbol) : undefined,
    source: row.source != null ? String(row.source) : undefined,
    fetchedAt:
      row.fetchedAt != null
        ? String(row.fetchedAt)
        : row.fetched_at != null
          ? String(row.fetched_at)
          : undefined,
  };
}

export const createUsdtWallet = async (payload: UsdtWalletPayload): Promise<UsdtWalletItem> => {
  const raw = await apiPost<unknown>(API_ENDPOINTS.USDT_WALLETS, payload);
  return normalizeUsdtWalletItem(raw);
};

export const updateUsdtWallet = async (id: number, payload: Partial<UsdtWalletPayload>): Promise<UsdtWalletItem> => {
  const raw = await apiPut<unknown>(API_ENDPOINTS.USDT_WALLET_BY_ID(id), payload);
  return normalizeUsdtWalletItem(raw);
};

export const setDefaultUsdtWallet = async (id: number): Promise<UsdtWalletItem> => {
  const raw = await apiPost<unknown>(API_ENDPOINTS.USDT_WALLET_SET_DEFAULT(id));
  return normalizeUsdtWalletItem(raw);
};

export const deleteUsdtWallet = (id: number): Promise<void> =>
  apiDelete(API_ENDPOINTS.USDT_WALLET_BY_ID(id));

export async function recordUsdtWalletWithdrawal(
  id: number,
  amount: number,
  reason?: string | null
): Promise<UsdtWalletBalanceItem> {
  const data = await apiPost<{ item?: unknown }>(API_ENDPOINTS.USDT_WALLET_WITHDRAW(id), {
    amount,
    reason: reason?.trim() || null,
  });
  return normalizeUsdtWalletBalanceItem(data?.item);
}
