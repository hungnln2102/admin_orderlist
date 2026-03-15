import { useEffect, useState, useCallback } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import { API_BASE_URL } from "@/lib/api";
import { API_ENDPOINTS } from "@/constants";

export type ProductSystemRow = {
  id: number;
  variant_id: number;
  system_code: string;
  created_at: string;
};

export type VariantOption = {
  id: number;
  display_name: string;
};

const SYSTEM_CODES = [
  "fix_adobe_edu",
  "renew_adobe",
  "renew_zoom",
  "otp_netflix",
] as const;

function fetchProductSystem(): Promise<ProductSystemRow[]> {
  return fetch(`${API_BASE_URL}${API_ENDPOINTS.RENEW_ADOBE_PRODUCT_SYSTEM}`, {
    credentials: "include",
  })
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText || "Lỗi tải danh sách");
      return res.json();
    })
    .then((rows: ProductSystemRow[]) => Array.isArray(rows) ? rows : []);
}

function fetchVariants(): Promise<VariantOption[]> {
  return fetch(`${API_BASE_URL}${API_ENDPOINTS.RENEW_ADOBE_VARIANTS}`, {
    credentials: "include",
  })
    .then((res) => {
      if (!res.ok) throw new Error(res.statusText || "Lỗi tải danh sách variant");
      return res.json();
    })
    .then((rows: VariantOption[]) => Array.isArray(rows) ? rows : []);
}

export default function ProductSystem() {
  const [rows, setRows] = useState<ProductSystemRow[]>([]);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [formVariantId, setFormVariantId] = useState<string>("");
  const [formSystemCode, setFormSystemCode] = useState<string>(SYSTEM_CODES[0]);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchProductSystem()
      .then(setRows)
      .catch((err) => setError(err?.message ?? "Không thể tải danh sách."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchVariants().then(setVariants).catch(() => setVariants([]));
  }, []);

  const handleAdd = async () => {
    const variantId = formVariantId.trim() ? Number(formVariantId.trim()) : NaN;
    if (!Number.isInteger(variantId) || variantId <= 0 || !formSystemCode.trim()) {
      setFormError("Vui lòng chọn sản phẩm (variant) và hệ thống.");
      return;
    }
    setFormError(null);
    setAdding(true);
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.RENEW_ADOBE_PRODUCT_SYSTEM}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant_id: variantId, system_code: formSystemCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data?.error || res.statusText || "Thêm thất bại");
        return;
      }
    setFormVariantId("");
      setFormSystemCode(SYSTEM_CODES[0]);
      load();
    } catch (e) {
      setFormError((e as Error)?.message ?? "Lỗi kết nối");
    } finally {
      setAdding(false);
    }
  };

  const getDisplayName = (variantId: number) =>
    variants.find((v) => v.id === variantId)?.display_name ?? null;

  const availableVariants = variants.filter(
    (v) => !rows.some((r) => r.variant_id === v.id)
  );

  const handleDelete = async (id: number) => {
    if (deleteId !== null) return;
    setDeleteId(id);
    try {
      const res = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.RENEW_ADOBE_PRODUCT_SYSTEM_DELETE(id)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) {
        setRows((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setDeleteId(null);
    }
  };

  const formatDate = (s: string) => {
    if (!s) return "—";
    try {
      const d = new Date(s);
      return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return s;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Sản phẩm hệ thống
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Ánh xạ variant (sản phẩm) thuộc hệ thống automation. Job hàng loạt dùng bảng này để lấy danh sách đơn theo system_code.
        </p>
      </div>

      {/* Form thêm */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          Thêm ánh xạ
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              Sản phẩm (variant)
            </label>
            <select
              value={formVariantId}
              onChange={(e) => setFormVariantId(e.target.value)}
              className="min-w-[200px] rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">— Chọn sản phẩm —</option>
              {availableVariants.map((v) => (
                <option key={v.id} value={String(v.id)}>
                  {v.display_name || `(ID: ${v.id})`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">
              Hệ thống
            </label>
            <select
              value={formSystemCode}
              onChange={(e) => setFormSystemCode(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {SYSTEM_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="inline-flex items-center gap-1 rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" />
            Thêm
          </button>
        </div>
        {formError && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{formError}</p>
        )}
      </div>

      {/* Bảng dữ liệu */}
      <div className="rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-800">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Đang tải...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 dark:text-red-400">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Chưa có bản ghi. Thêm variant_id và system_code ở form trên.
          </div>
        ) : (
          <>
            <ResponsiveTable
              showCardOnMobile
              cardView={
                <TableCard
                  data={rows as unknown as Record<string, unknown>[]}
                  renderCard={(item, idx) => (
                    <div
                      key={(item.id as number) ?? idx}
                      className="rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700/50"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">#{item.id}</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(Number(item.id))}
                          disabled={deleteId !== null}
                          className="text-red-600 hover:underline disabled:opacity-50"
                        >
                          Xóa
                        </button>
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {getDisplayName(Number(item.variant_id)) ?? `Variant ${item.variant_id}`} · {String(item.system_code)}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {formatDate(String(item.created_at))}
                      </div>
                    </div>
                  )}
                />
              }
            >
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      ID
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Sản phẩm
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Hệ thống
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Ngày tạo
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900 dark:text-white">
                        {row.id}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                        {getDisplayName(row.variant_id) ?? row.variant_id}
                        {getDisplayName(row.variant_id) && (
                          <span className="ml-1 text-gray-500">(ID: {row.variant_id})</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                        {row.system_code}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(row.id)}
                          disabled={deleteId !== null}
                          className="inline-flex text-red-600 hover:text-red-700 disabled:opacity-50"
                          title="Xóa"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveTable>
          </>
        )}
      </div>
    </div>
  );
}
