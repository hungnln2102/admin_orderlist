import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/shared/api/client";
import type {
  ShopBankAccountItem,
  ShopBankAccountBalanceItem,
  ShopBankAccountPayload,
} from "../types";

type ListResponse = { items?: unknown[] };

const toBool = (value: unknown, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
};

export const normalizeShopBankAccountItem = (value: unknown): ShopBankAccountItem => {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: Number(row.id) || 0,
    label: row.label != null ? String(row.label) : null,
    accountNumber: String(row.accountNumber ?? row.account_number ?? "").trim(),
    accountHolder: String(row.accountHolder ?? row.account_holder ?? "").trim(),
    bankBin: String(row.bankBin ?? row.bank_bin ?? "").trim(),
    bankShortCode:
      row.bankShortCode != null
        ? String(row.bankShortCode)
        : row.bank_short_code != null
          ? String(row.bank_short_code)
          : null,
    bankDisplayName:
      row.bankDisplayName != null
        ? String(row.bankDisplayName)
        : row.bank_display_name != null
          ? String(row.bank_display_name)
          : null,
    qrNotePrefix:
      row.qrNotePrefix != null
        ? String(row.qrNotePrefix)
        : row.qr_note_prefix != null
          ? String(row.qr_note_prefix)
          : null,
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

export const normalizeShopBankAccountBalanceItem = (
  value: unknown
): ShopBankAccountBalanceItem => {
  const base = normalizeShopBankAccountItem(value);
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    ...base,
    totalReceived: Number(row.totalReceived ?? row.total_received) || 0,
    totalWithdrawn:
      Number(row.totalWithdrawn ?? row.total_withdrawn) || base.totalWithdrawn || 0,
    balanceRemaining:
      Number(row.balanceRemaining ?? row.balance_remaining ?? row.balance) || 0,
  };
};

const parseResponse = async <T>(
  response: Response,
  map: (value: unknown) => T
): Promise<T> => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String((body as { error?: string })?.error || response.statusText));
  }
  return map(body);
};

export async function fetchShopBankAccounts(): Promise<ShopBankAccountItem[]> {
  const response = await apiFetch(API_ENDPOINTS.SHOP_BANK_ACCOUNTS);
  const data = await parseResponse(response, (payload) => payload);
  const items = Array.isArray((data as ListResponse)?.items)
    ? (data as ListResponse).items
    : [];
  return items.map(normalizeShopBankAccountItem);
}

export async function fetchShopBankAccountBalances(): Promise<ShopBankAccountBalanceItem[]> {
  const response = await apiFetch(API_ENDPOINTS.SHOP_BANK_ACCOUNT_BALANCES);
  const data = await parseResponse(response, (payload) => payload);
  const items = Array.isArray((data as ListResponse)?.items)
    ? (data as ListResponse).items
    : [];
  return items.map(normalizeShopBankAccountBalanceItem);
}

export async function recordShopBankAccountWithdrawal(
  id: number,
  amount: number,
  reason?: string | null
): Promise<ShopBankAccountBalanceItem> {
  const response = await apiFetch(API_ENDPOINTS.SHOP_BANK_ACCOUNT_WITHDRAW(id), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, reason: reason?.trim() || null }),
  });
  return parseResponse(response, (payload) =>
    normalizeShopBankAccountBalanceItem((payload as { item?: unknown })?.item)
  );
}

export async function updateShopBankAccountWithdrawn(
  id: number,
  totalWithdrawn: number
): Promise<ShopBankAccountBalanceItem> {
  const response = await apiFetch(API_ENDPOINTS.SHOP_BANK_ACCOUNT_WITHDRAWN(id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ totalWithdrawn }),
  });
  return parseResponse(response, (payload) =>
    normalizeShopBankAccountBalanceItem((payload as { item?: unknown })?.item)
  );
}

export async function fetchDefaultShopBankAccount(): Promise<ShopBankAccountItem> {
  const response = await apiFetch(API_ENDPOINTS.SHOP_BANK_ACCOUNT_DEFAULT);
  return parseResponse(response, (payload) =>
    normalizeShopBankAccountItem((payload as { item?: unknown })?.item)
  );
}

export async function createShopBankAccount(
  payload: ShopBankAccountPayload
): Promise<ShopBankAccountItem> {
  const response = await apiFetch(API_ENDPOINTS.SHOP_BANK_ACCOUNTS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(response, normalizeShopBankAccountItem);
}

export async function updateShopBankAccount(
  id: number,
  payload: Partial<ShopBankAccountPayload>
): Promise<ShopBankAccountItem> {
  const response = await apiFetch(API_ENDPOINTS.SHOP_BANK_ACCOUNT_BY_ID(id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(response, normalizeShopBankAccountItem);
}

export async function setDefaultShopBankAccount(id: number): Promise<ShopBankAccountItem> {
  const response = await apiFetch(API_ENDPOINTS.SHOP_BANK_ACCOUNT_SET_DEFAULT(id), {
    method: "POST",
  });
  return parseResponse(response, normalizeShopBankAccountItem);
}

export async function deleteShopBankAccount(id: number): Promise<void> {
  const response = await apiFetch(API_ENDPOINTS.SHOP_BANK_ACCOUNT_BY_ID(id), {
    method: "DELETE",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(String((body as { error?: string })?.error || response.statusText));
  }
}
