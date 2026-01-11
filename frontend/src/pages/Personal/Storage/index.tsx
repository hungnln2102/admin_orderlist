import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { API_ENDPOINTS } from "../../../constants";
import { StorageHeader } from "./components/StorageHeader";
import { SearchBar } from "./components/SearchBar";
import { StorageTable } from "./components/StorageTable";
import { WarehouseItem, normalizeText } from "./types";

export default function Storage() {
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
        let res = await apiFetch(API_ENDPOINTS.WAREHOUSE);
        if (res.status === 404) {
          res = await apiFetch("/api/warehouses");
        }
        if (!res.ok) {
          throw new Error(`Không thể tải dữ liệu (${res.status})`);
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
        throw new Error(`Xoá thất bại (${res.status})`);
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
      <StorageHeader />

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onCreate={startCreate}
        loading={loading}
        error={error}
      />

      <StorageTable
        items={derived.filtered}
        draft={draft}
        editingId={editingId}
        loading={loading}
        onDraftChange={updateDraft}
        onSave={saveEdit}
        onDelete={deleteRow}
        onCancel={cancelEdit}
        onStartEdit={startEdit}
        onStartCreate={startCreate}
      />
    </div>
  );
}
