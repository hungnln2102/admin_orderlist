import { apiGet, apiPost, apiPut, apiDelete, apiFetch } from "@/shared/api/client";

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

/** Tạo PRODUCT_STOCK + PACKAGE_PRODUCT trong 1 atomic transaction */
export const createImportPackage = (payload: ImportPackagePayload): Promise<ImportPackageResult> =>
  apiPost<ImportPackageResult>("/api/import-packages", payload);

/** Xử lý hết hạn: xóa package, tùy chọn xóa stock */
export const expireImportPackage = (stockId: number, deleteStock: boolean): Promise<ExpireImportPackageResult> =>
  apiPost<ExpireImportPackageResult>(`/api/import-packages/${stockId}/expire`, { deleteStock });

/** Lấy rule cấu hình của 1 sản phẩm (404 = null) */
export const getImportPackageRule = async (productId: number): Promise<ImportPackageRule | null> => {
  const res = await apiFetch(`/api/import-packages/rules/${productId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

/** Lấy tất cả rules */
export const listImportPackageRules = (): Promise<ImportPackageRule[]> =>
  apiGet<ImportPackageRule[]>("/api/import-packages/rules");

/** Tạo hoặc cập nhật rule cho sản phẩm */
export const upsertImportPackageRule = (
  productId: number,
  data: Partial<Omit<ImportPackageRule, "id" | "productId" | "createdAt" | "updatedAt">>
): Promise<ImportPackageRule> =>
  apiPut<ImportPackageRule>(`/api/import-packages/rules/${productId}`, data);

/** Xóa rule */
export const deleteImportPackageRule = (productId: number): Promise<void> =>
  apiDelete(`/api/import-packages/rules/${productId}`);
