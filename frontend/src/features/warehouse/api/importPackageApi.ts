import { apiFetch } from "@/shared/api/client";

export type ImportPackagePayload = {
  productId: number;
  supplierId?: number | null;
  importPrice?: number | null;
  slotLimit?: number | null;
  matchMode?: "information_order" | "slot";
  account?: string | null;
  password?: string | null;
  backup_email?: string | null;
  two_fa?: string | null;
  expires_at?: string | null;
  note?: string | null;
};

export type ImportPackageResult = {
  stock: {
    id: number;
    category: string | null;
    account: string | null;
    password: string | null;
    backup_email: string | null;
    two_fa: string | null;
    note: string | null;
    status: string;
    expires_at: string | null;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
  };
  pkg: {
    id: number;
    package_id: number;
    supplier: string | null;
    import_price: number | null;
    slot: number | null;
    match: string;
    stock_id: number;
    storage_id: number | null;
    storage_total: number | null;
  };
};

export type ImportPackageRule = {
  id: number;
  productId: number;
  enabled: boolean;
  fields: Array<
    "account" | "password" | "backup_email" | "two_fa" | "expires_at" | "note"
  >;
  defaultSlotLimit: number;
  defaultMatchMode: "information_order" | "slot";
  createdAt: string;
  updatedAt: string;
};

export type ExpireImportPackageResult = {
  deletedPackages: number[];
  stockDeleted: boolean;
};

// ---- API calls ----

/** Tao PRODUCT_STOCK + PACKAGE_PRODUCT trong 1 atomic transaction */
export const createImportPackage = async (
  payload: ImportPackagePayload
): Promise<ImportPackageResult> => {
  const res = await apiFetch("/api/import-packages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
};

/** Xu ly het han: xoa package, tuy chon xoa stock */
export const expireImportPackage = async (
  stockId: number,
  deleteStock: boolean
): Promise<ExpireImportPackageResult> => {
  const res = await apiFetch(`/api/import-packages/${stockId}/expire`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deleteStock }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
};

/** Lay rule cau hinh cua 1 san pham */
export const getImportPackageRule = async (
  productId: number
): Promise<ImportPackageRule | null> => {
  const res = await apiFetch(`/api/import-packages/rules/${productId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

/** Lay tat ca rules */
export const listImportPackageRules = async (): Promise<ImportPackageRule[]> => {
  const res = await apiFetch("/api/import-packages/rules");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

/** Tao hoac cap nhat rule cho san pham */
export const upsertImportPackageRule = async (
  productId: number,
  data: Partial<Omit<ImportPackageRule, "id" | "productId" | "createdAt" | "updatedAt">>
): Promise<ImportPackageRule> => {
  const res = await apiFetch(`/api/import-packages/rules/${productId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
};

/** Xoa rule */
export const deleteImportPackageRule = async (
  productId: number
): Promise<void> => {
  const res = await apiFetch(`/api/import-packages/rules/${productId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
};
