import React, { useCallback, useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { apiFetch } from "@/lib/api";
import { type WalletColumn } from "../../hooks/useWalletBalances";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  columns: WalletColumn[];
  onSuccess: () => void;
};

const emptyForm = () => ({
  wallet_name: "",
  asset_code: "VND",
  note: "",
  is_investment: false,
  balance_scope: "per_row" as "per_row" | "column_total",
});

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data?.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export const WalletTypesManagerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  columns,
  onSuccess,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
  }, []);

  useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen, resetForm]);

  const startEdit = (col: WalletColumn) => {
    setEditingId(col.id);
    setForm({
      wallet_name: col.name,
      asset_code: col.assetCode || "VND",
      note: col.note || "",
      is_investment: Boolean(col.isInvestment),
      balance_scope: col.balanceScope === "column_total" ? "column_total" : "per_row",
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const name = form.wallet_name.trim();
    if (!name) {
      setError("Tên cột không được để trống.");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        wallet_name: name,
        asset_code: (form.asset_code || "VND").trim() || "VND",
        note: form.note.trim() || null,
        is_investment: form.is_investment,
        balance_scope: form.balance_scope,
      };

      let res: Response;
      if (editingId != null) {
        res = await apiFetch(`/api/wallets/types/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch("/api/wallets/types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      resetForm();
      onSuccess();
    } catch {
      setError("Không thể lưu. Thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (
      !window.confirm(
        "Xóa cột này? Toàn bộ số dư theo ngày của cột sẽ bị xóa khỏi hệ thống.",
      )
    ) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/wallets/types/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      if (editingId === id) resetForm();
      onSuccess();
    } catch {
      setError("Không thể xóa cột.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>

          <h2 className="mb-4 text-xl font-bold text-white">Quản lý cột dòng tiền</h2>
          <p className="mb-6 text-xs text-white/60">
            <strong className="text-white/85">Theo ngày</strong> và <strong className="text-white/85">Tổng cột</strong> đều nhập số theo từng ngày giống nhau; khác nhau chỉ là nhãn phân loại (ví dụ để báo cáo sau này). Đổi loại không xóa dữ liệu.
          </p>

          <form onSubmit={handleSubmit} className="mb-8 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-white/70">
                  Tên hiển thị (cột)
                </label>
                <input
                  type="text"
                  value={form.wallet_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, wallet_name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="VD: MoMo, VP Bank…"
                  disabled={loading}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-white/70">
                  Cách lưu số liệu
                </label>
                <select
                  value={form.balance_scope}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      balance_scope: e.target.value as "per_row" | "column_total",
                    }))
                  }
                  className="w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  disabled={loading}
                >
                  <option value="per_row">Theo ngày — mỗi dòng một giá trị</option>
                  <option value="column_total">Tổng cột (nhãn phân loại)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-white/70">
                  Mã tài sản
                </label>
                <input
                  type="text"
                  value={form.asset_code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, asset_code: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  placeholder="VND"
                  disabled={loading}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-white/70">
                  Ghi chú
                </label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  disabled={loading}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-white/80 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.is_investment}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_investment: e.target.checked }))
                  }
                  disabled={loading}
                  className="rounded border-white/30 bg-white/10 text-indigo-500 focus:ring-indigo-500/50"
                />
                Cột đầu tư
              </label>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {editingId != null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                  disabled={loading}
                >
                  Hủy sửa
                </button>
              )}
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white hover:from-indigo-500 hover:to-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading}
              >
                {loading
                  ? "Đang lưu…"
                  : editingId != null
                    ? "Cập nhật cột"
                    : "Thêm cột mới"}
              </button>
            </div>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm text-white">
              <thead className="bg-white/10 text-xs uppercase tracking-wide text-white/70">
                <tr>
                  <th className="px-3 py-2">ID</th>
                  <th className="px-3 py-2">Tên</th>
                  <th className="px-3 py-2">Mã</th>
                  <th className="px-3 py-2">Loại</th>
                  <th className="px-3 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {[...columns]
                  .sort((a, b) => a.id - b.id)
                  .map((col) => (
                    <tr key={col.id} className="bg-white/[0.02]">
                      <td className="px-3 py-2 font-mono text-white/80">{col.id}</td>
                      <td className="px-3 py-2">{col.name}</td>
                      <td className="px-3 py-2 text-white/70">
                        {col.assetCode || "—"}
                        {col.isInvestment ? (
                          <span className="ml-2 text-[10px] text-amber-300/90">đầu tư</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-xs text-white/75">
                        {col.balanceScope === "column_total" ? "Tổng cột" : "Theo ngày"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => startEdit(col)}
                          className="mr-2 text-indigo-300 hover:text-indigo-200"
                          disabled={loading}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(col.id)}
                          className="text-rose-300 hover:text-rose-200"
                          disabled={loading}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
