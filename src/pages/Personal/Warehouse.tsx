import React, { useEffect, useMemo, useState } from "react";
import {
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { apiFetch } from "../../lib/api";
import { API_ENDPOINTS } from "../../constants";

type WarehouseItem = {
  id?: number;
  category?: string | null;
  account?: string | null;
  password?: string | null;
  backup_email?: string | null;
  two_fa?: string | null;
  note?: string | null;
  status?: string | null;
  created_at?: string | null;
};

const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white placeholder:text-slate-300 focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/60";

const normalizeText = (value: unknown) =>
  (value ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export default function Warehouse() {
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<WarehouseItem | null>(null);

  useEffect(() => {
    let mounted = true;

    const parsePayload = (payload: any) => {
      if (!payload) return [];
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload.items)) return payload.items;
      return [];
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // Try primary endpoint
        let res = await apiFetch(API_ENDPOINTS.WAREHOUSE);
        if (res.status === 404) {
          // Fallback to pluralized path if backend uses it
          res = await apiFetch("/api/warehouses");
        }
        if (!res.ok) {
          throw new Error(`Không tải được dữ liệu (${res.status})`);
        }
        const data = await res.json();
        const parsed = parsePayload(data);
        if (mounted) {
          setItems(parsed);
        }
      } catch (err: any) {
        if (mounted) setError(err?.message || "Lỗi không xác định");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const startEdit = (item: WarehouseItem) => {
    setEditingId(item.id ?? null);
    setDraft({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const updateDraft = (key: keyof WarehouseItem, value: string) => {
    setDraft((prev) => ({ ...(prev || {}), [key]: value }));
  };

  const saveEdit = async (id?: number) => {
    if ((!id && editingId !== "new") || !draft) return;
    setLoading(true);
    setError(null);
    try {
      if (editingId === "new") {
        const res = await apiFetch(API_ENDPOINTS.WAREHOUSE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (!res.ok) throw new Error(`Tạo mới thất bại (${res.status})`);
        const created = await res.json();
        setItems((prev) => [...prev, created]);
        cancelEdit();
      } else {
        const res = await apiFetch(`${API_ENDPOINTS.WAREHOUSE}/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (!res.ok) {
          throw new Error(`Cập nhật thất bại (${res.status})`);
        }
        const updated = await res.json();
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, ...updated } : it))
        );
        cancelEdit();
      }
    } catch (err: any) {
      setError(err?.message || "Lỗi khi cập nhật");
    } finally {
      setLoading(false);
    }
  };

  const deleteRow = async (id?: number) => {
    if (!id) return;
    if (!confirm("Bạn có chắc muốn xóa bản ghi này?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_ENDPOINTS.WAREHOUSE}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(`Xóa thất bại (${res.status})`);
      }
      setItems((prev) => prev.filter((it) => it.id !== id));
      if (editingId === id) cancelEdit();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi xóa");
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    setEditingId("new");
    setDraft({
      category: "",
      account: "",
      password: "",
      backup_email: "",
      two_fa: "",
      note: "",
      status: "Tồn",
    });
  };

  const derived = useMemo(() => {
    const filtered = items
      .filter((item) => {
        if (!search.trim()) return true;
        const q = normalizeText(search);
        return [
          item.category,
          item.account,
          item.password,
          item.backup_email,
          item.two_fa,
          item.note,
          item.status,
        ].some((field) => normalizeText(field).includes(q));
      })
      .sort((a, b) => {
        const nameA = normalizeText(a.category);
        const nameB = normalizeText(b.category);
        return nameA.localeCompare(nameB, "vi");
      });

    return { filtered };
  }, [items, search]);

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ArchiveBoxIcon className="h-7 w-7 text-indigo-300" />
        <div>
          <h1 className="text-xl font-semibold text-white">Lưu trữ</h1>
          <p className="text-sm text-white/70">
            Hàng đang còn tồn kho (chưa ghép vào đơn hàng)
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-indigo-900/40 p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 text-white/60 absolute left-3 top-2.5" />
            <input
              className={`${inputClass} pl-10`}
              placeholder="Tìm theo gói, tài khoản, nhà cung cấp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
            disabled={loading}
          >
            <PlusIcon className="h-4 w-4" />
            Thêm
          </button>
          {loading && (
            <div className="text-sm text-white/80 flex items-center gap-2">
              <span className="animate-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-transparent" />
              Đang tải...
            </div>
          )}
          {error && (
            <div className="text-sm text-rose-200 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5" />
              {error}
            </div>
          )}
        </div>

        <div className="overflow-auto rounded-xl border border-white/10 bg-white/5">
          <table className="min-w-full text-sm text-white">
            <thead className="bg-white/10 text-left">
              <tr>
                <th className="px-4 py-2 font-semibold">Loại</th>
                <th className="px-4 py-2 font-semibold">Tài khoản</th>
                <th className="px-4 py-2 font-semibold">Mật khẩu</th>
                <th className="px-4 py-2 font-semibold">Mail dự phòng</th>
                <th className="px-4 py-2 font-semibold">2FA</th>
                <th className="px-4 py-2 font-semibold">Trạng thái</th>
                <th className="px-4 py-2 font-semibold">Ghi chú</th>
                <th className="px-4 py-2 font-semibold text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {editingId === "new" && draft && (
                <tr className="border-t border-white/5 bg-white/5">
                  <td className="px-4 py-2 whitespace-nowrap font-semibold">
                    <input
                      className={`${inputClass} bg-white/10 border-white/20`}
                      value={draft.category || ""}
                      onChange={(e) => updateDraft("category", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className={`${inputClass} bg-white/10 border-white/20 font-medium`}
                      value={draft.account || ""}
                      onChange={(e) => updateDraft("account", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className={`${inputClass} bg-white/10 border-white/20`}
                      value={draft.password || ""}
                      onChange={(e) => updateDraft("password", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className={`${inputClass} bg-white/10 border-white/20`}
                      value={draft.backup_email || ""}
                      onChange={(e) => updateDraft("backup_email", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className={`${inputClass} bg-white/10 border-white/20`}
                      value={draft.two_fa || ""}
                      onChange={(e) => updateDraft("two_fa", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className={`${inputClass} bg-white/10 border-white/20`}
                      value={draft.status || ""}
                      onChange={(e) => updateDraft("status", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className={`${inputClass} bg-white/10 border-white/20`}
                      value={draft.note || ""}
                      onChange={(e) => updateDraft("note", e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        className="p-2 rounded-lg bg-emerald-600/70 hover:bg-emerald-600 text-white transition disabled:opacity-60"
                        onClick={() => saveEdit(undefined)}
                        disabled={loading}
                        title="Lưu"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-60"
                        onClick={cancelEdit}
                        disabled={loading}
                        title="Hủy"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {derived.filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-white/70"
                  >
                    {loading ? "Đang tải dữ liệu..." : "Không có hàng tồn kho"}
                  </td>
                </tr>
              ) : (
                derived.filtered.map((item) => {
                  const isEditing = editingId === item.id;
                  const current = isEditing ? draft || item : item;
                  return (
                    <tr
                      key={item.id ?? `${item.category ?? ""}-${item.account ?? ""}`}
                      className="border-t border-white/5 hover:bg-white/5"
                    >
                      <td className="px-4 py-2 whitespace-nowrap font-semibold">
                        {isEditing ? (
                          <input
                            className={`${inputClass} bg-white/10 border-white/20`}
                            value={current.category || ""}
                            onChange={(e) => updateDraft("category", e.target.value)}
                          />
                        ) : (
                          item.category || "N/A"
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            className={`${inputClass} bg-white/10 border-white/20 font-medium`}
                            value={current.account || ""}
                            onChange={(e) => updateDraft("account", e.target.value)}
                          />
                        ) : (
                          <div className="font-medium">
                            {item.account || "Chưa có tài khoản"}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            className={`${inputClass} bg-white/10 border-white/20`}
                            value={current.password || ""}
                            onChange={(e) => updateDraft("password", e.target.value)}
                          />
                        ) : (
                          item.password || <span className="text-white/60">--</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            className={`${inputClass} bg-white/10 border-white/20`}
                            value={current.backup_email || ""}
                            onChange={(e) =>
                              updateDraft("backup_email", e.target.value)
                            }
                          />
                        ) : (
                          item.backup_email || (
                            <span className="text-white/60">--</span>
                          )
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            className={`${inputClass} bg-white/10 border-white/20`}
                            value={current.two_fa || ""}
                            onChange={(e) => updateDraft("two_fa", e.target.value)}
                          />
                        ) : (
                          item.two_fa || <span className="text-white/60">--</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            className={`${inputClass} bg-white/10 border-white/20`}
                            value={current.status || ""}
                            onChange={(e) => updateDraft("status", e.target.value)}
                          />
                        ) : (
                          <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                            {item.status || "--"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {isEditing ? (
                          <input
                            className={`${inputClass} bg-white/10 border-white/20`}
                            value={current.note || ""}
                            onChange={(e) => updateDraft("note", e.target.value)}
                          />
                        ) : (
                          <div className="text-white/80 whitespace-pre-wrap break-words">
                            {item.note || "--"}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="inline-flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                className="p-2 rounded-lg bg-emerald-600/70 hover:bg-emerald-600 text-white transition disabled:opacity-60"
                                onClick={() => saveEdit(item.id)}
                                disabled={loading}
                                title="Lưu"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="p-2 rounded-lg bg-rose-600/70 hover:bg-rose-600 text-white transition disabled:opacity-60"
                                onClick={() => deleteRow(item.id)}
                                disabled={loading}
                                title="Xóa"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-60"
                                onClick={cancelEdit}
                                disabled={loading}
                                title="Hủy"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-indigo-100 hover:text-white transition disabled:opacity-60"
                                onClick={() => startEdit(item)}
                                disabled={loading}
                                title="Sửa"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-rose-200 hover:text-rose-100 transition disabled:opacity-60"
                                onClick={() => deleteRow(item.id)}
                                disabled={loading}
                                title="Xóa"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Stat cards removed per request.
