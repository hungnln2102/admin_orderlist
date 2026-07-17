import React, { useEffect, useMemo, useState } from "react";
import { apiFetch, apiPost, apiPut, apiDelete } from "@/shared/api/client";
import { API_ENDPOINTS } from "@/constants";
import ConfirmModal from "@/components/modals/ConfirmModal/ConfirmModal";
import {
  buildPaginationPages,
  getPaginated as getWarehousePaginated,
} from "@/shared/utils/pagination";
import { StorageHeader } from "./components/StorageHeader";
import { SearchBar } from "./components/SearchBar";
import { StorageTable } from "./components/StorageTable";
import { useWarehouseProducts } from "./hooks/useWarehouseProducts";
import { WarehouseItem, normalizeText } from "./types";
import { useImportPackageSubmit } from "./hooks/useImportPackageSubmit";

export default function Storage() {
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [draft, setDraft] = useState<WarehouseItem | null>(null);
  const [warehouseIdPendingDelete, setWarehouseIdPendingDelete] = useState<number | null>(null);
  const [warehouseDeleteSubmitting, setWarehouseDeleteSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { expireStock } = useImportPackageSubmit();

  useEffect(() => {
    let mounted = true;

    const parsePayload = (payload: unknown): WarehouseItem[] => {
      if (!payload) return [];
      if (Array.isArray(payload)) return payload;
      if (
        typeof payload === "object" &&
        payload !== null &&
        "items" in payload &&
        Array.isArray((payload as { items?: unknown[] }).items)
      ) {
        return (payload as { items: WarehouseItem[] }).items;
      }
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
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Lỗi không xác định");
        }
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
    if (item.id != null) setExpandedItemId(item.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const toggleDetails = (id: number) => {
    setExpandedItemId((prev) => (prev === id ? null : id));
  };

  const updateDraft = (key: keyof WarehouseItem, value: string) => {
    const parsed = key === "is_verified" ? value === "true" : value;
    setDraft((prev) => ({ ...(prev || {}), [key]: parsed }));
  };

  const saveEdit = async (id?: number) => {
    if ((!id && editingId !== "new") || !draft) return;
    setLoading(true);
    setError(null);
    try {
      if (editingId === "new") {
        const res = await apiPost<WarehouseItem>(API_ENDPOINTS.WAREHOUSE, draft);
        setItems((prev) => [...prev, res]);
        cancelEdit();
      } else {
        const updated = await apiPut<WarehouseItem>(`${API_ENDPOINTS.WAREHOUSE}/${id}`, draft);
        setItems((prev) =>
          prev.map((it) => (it.id === id ? { ...it, ...updated } : it))
        );
        cancelEdit();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi cập nhật");
    } finally {
      setLoading(false);
    }
  };

  const requestDeleteRow = (id?: number) => {
    if (!id) return;
    setWarehouseIdPendingDelete(id);
  };

  const confirmDeleteRow = async () => {
    const id = warehouseIdPendingDelete;
    if (!id) return;
    setWarehouseDeleteSubmitting(true);
    setLoading(true);
    setError(null);
    try {
      await apiDelete(`${API_ENDPOINTS.WAREHOUSE}/${id}`);
      setItems((prev) => prev.filter((it) => it.id !== id));
      if (editingId === id) cancelEdit();
      if (expandedItemId === id) setExpandedItemId(null);
      setWarehouseIdPendingDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi xóa");
    } finally {
      setLoading(false);
      setWarehouseDeleteSubmitting(false);
    }
  };

  const startCreate = () => {
    setEditingId("new");
    setDraft({
      account: "",
      note: "",
      is_verified: false,
      services: [
        {
          category: "",
          password: "",
          backup_email: "",
          two_fa: "",
          status: "Tồn",
          expires_at: "",
        }
      ]
    });
  };

  const handleCreatePackage = (_item: WarehouseItem) => {
    // Mo form Package Product hien tai - navigate hoac open modal
    // Hien tai: dieu huong sang trang package-product
    window.location.hash = "package-product";
  };

  const handleExpireStock = async (stockId: number, deleteStock: boolean) => {
    const result = await expireStock(stockId, deleteStock);
    if (result) {
      // Refresh lai danh sach
      setItems((prev) => prev.filter((it) => it.id !== stockId || !deleteStock));
    }
  };

  const { productOptions, loadingProducts } = useWarehouseProducts(items);

  const filtered = useMemo(() => {
    return items
      .filter((item) => {
        if (productFilter.trim()) {
          const filter = normalizeText(productFilter);
          const hasMatchingCat = item.services?.some(s => normalizeText(s.category) === filter);
          if (!hasMatchingCat && normalizeText(item.category) !== filter) return false;
        }
        if (!search.trim()) return true;
        const q = normalizeText(search);
        
        const baseMatch = [
          item.account,
          item.note,
          item.status,
          item.category, // Legacy fallback
        ].some((field) => normalizeText(field).includes(q));

        if (baseMatch) return true;

        return item.services?.some(s => 
          [s.category, s.password, s.backup_email, s.two_fa].some(field => normalizeText(field).includes(q))
        );
      })
      .sort((a, b) => {
        const nameA = normalizeText(a.services?.[0]?.category || a.category);
        const nameB = normalizeText(b.services?.[0]?.category || b.category);
        return nameA.localeCompare(nameB, "vi");
      });
  }, [items, search, productFilter]);

  const { currentItems, totalPages } = useMemo(
    () => getWarehousePaginated(filtered, currentPage, rowsPerPage),
    [filtered, currentPage, rowsPerPage]
  );

  const paginationPages = useMemo(
    () => buildPaginationPages(currentPage, totalPages),
    [currentPage, totalPages]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, productFilter, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="w-full min-w-0 max-w-none space-y-5 p-4 lg:p-6">
      <StorageHeader totalItems={items.length} />

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        productFilter={productFilter}
        onProductFilterChange={setProductFilter}
        productOptions={productOptions}
        loadingProducts={loadingProducts}
        onCreate={startCreate}
        loading={loading}
        error={error}
      />

      <StorageTable
        items={currentItems}
        filteredCount={filtered.length}
        productOptions={productOptions}
        draft={draft}
        editingId={editingId}
        expandedItemId={expandedItemId}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        rowsPerPage={rowsPerPage}
        paginationPages={paginationPages}
        setCurrentPage={setCurrentPage}
        setRowsPerPage={setRowsPerPage}
        onDraftChange={updateDraft}
        onSave={saveEdit}
        onDelete={requestDeleteRow}
        onCancel={cancelEdit}
        onStartEdit={startEdit}
        onStartCreate={startCreate}
        onToggleDetails={toggleDetails}
        onCreatePackage={handleCreatePackage}
        onExpireStock={handleExpireStock}
      />

      <ConfirmModal
        isOpen={warehouseIdPendingDelete !== null}
        onClose={() => {
          if (!warehouseDeleteSubmitting) setWarehouseIdPendingDelete(null);
        }}
        onConfirm={() => void confirmDeleteRow()}
        title="Xóa bản ghi?"
        message="Bạn có chắc muốn xóa bản ghi kho này? Hành động không thể hoàn tác."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        isSubmitting={warehouseDeleteSubmitting}
      />
    </div>
  );
}
