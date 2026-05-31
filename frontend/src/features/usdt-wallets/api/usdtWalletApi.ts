import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/shared/api/client";
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

const parseResponse = async <T>(response: Response, map: (value: unknown) => T): Promise<T> => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String((body as { error?: string })?.error || response.statusText));
  }
  return map(body);
};

export async function fetchUsdtWallets(): Promise<UsdtWalletItem[]> {
  const response = await apiFetch(API_ENDPOINTS.USDT_WALLETS);
  const data = await parseResponse(response, (payload) => payload);
  const body = data as ListResponse;
  const items = Array.isArray(body.items) ? body.items : [];
  return items.map(normalizeUsdtWalletItem);
}

export async function fetchUsdtWalletBalances(): Promise<UsdtWalletBalanceItem[]> {
  const response = await apiFetch(API_ENDPOINTS.USDT_WALLET_BALANCES);
  const data = await parseResponse(response, (payload) => payload);
  const body = data as ListResponse;
  const items = Array.isArray(body.items) ? body.items : [];
  return items.map(normalizeUsdtWalletBalanceItem);
}

export async function fetchUsdtExchangeRate(refresh = false): Promise<UsdtExchangeRate> {
  const url = refresh
    ? `${API_ENDPOINTS.USDT_WALLET_EXCHANGE_RATE}?refresh=1`
    : API_ENDPOINTS.USDT_WALLET_EXCHANGE_RATE;
  const response = await apiFetch(url);
  return parseResponse(response, (payload) => {
    const row = (payload ?? {}) as Record<string, unknown>;
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
  });
}

export async function createUsdtWallet(payload: UsdtWalletPayload): Promise<UsdtWalletItem> {
  const response = await apiFetch(API_ENDPOINTS.USDT_WALLETS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(response, normalizeUsdtWalletItem);
}

export async function updateUsdtWallet(
  id: number,
  payload: Partial<UsdtWalletPayload>
): Promise<UsdtWalletItem> {
  const response = await apiFetch(API_ENDPOINTS.USDT_WALLET_BY_ID(id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(response, normalizeUsdtWalletItem);
}

export async function setDefaultUsdtWallet(id: number): Promise<UsdtWalletItem> {
  const response = await apiFetch(API_ENDPOINTS.USDT_WALLET_SET_DEFAULT(id), {
    method: "POST",
  });
  return parseResponse(response, normalizeUsdtWalletItem);
}

export async function deleteUsdtWallet(id: number): Promise<void> {
  const response = await apiFetch(API_ENDPOINTS.USDT_WALLET_BY_ID(id), {
    method: "DELETE",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(String((body as { error?: string })?.error || response.statusText));
  }
}

export async function recordUsdtWalletWithdrawal(
  id: number,
  amount: number,
  reason?: string | null
): Promise<UsdtWalletBalanceItem> {
  const response = await apiFetch(API_ENDPOINTS.USDT_WALLET_WITHDRAW(id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, reason: reason?.trim() || null }),
  });
  return parseResponse(response, (payload) =>
    normalizeUsdtWalletBalanceItem((payload as { item?: unknown })?.item)
  );
}
