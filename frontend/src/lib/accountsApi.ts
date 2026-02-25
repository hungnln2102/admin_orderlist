import { apiFetch } from "./api";

export interface AccountDto {
  id: number;
  email: string | null;
  username: string | null;
  isActive: boolean | null;
  createdAt: string | null;
  suspendedUntil: string | null;
  banReason: string | null;
  updatedAt: string | null;
  roleId: number | null;
  roleCode: string | null;
  roleName: string | null;
}

interface AccountsResponse {
  items?: AccountDto[];
}

export async function fetchAccounts(): Promise<AccountDto[]> {
  const res = await apiFetch("/api/accounts");
  if (!res.ok) {
    throw new Error("Không thể tải danh sách tài khoản");
  }
  const data: AccountsResponse = await res.json().catch(() => ({}));
  if (!data || !Array.isArray(data.items)) {
    return [];
  }
  return data.items;
}

