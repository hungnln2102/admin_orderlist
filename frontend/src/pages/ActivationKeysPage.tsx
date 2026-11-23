import React, { useState, useEffect, useCallback } from "react";
import { KeyRound, ShieldCheck, Sparkles, Boxes, Sliders } from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";
import { TablePagination } from "@/shared/components/TablePagination";
import { useUrlPagination } from "@/shared/hooks/useUrlPagination";
import {
  ActivationKeyItem,
  ActivationKeyCounts,
  CatalogProductOption,
  CreateActivationKeyPayload,
  ActivationKeyStatsCards,
  ActivationKeyFilterBar,
  ActivationKeyTable,
  CreateActivationKeyModal,
  ActivationKeyRulesTab,
} from "@/features/activationKeys";

export const ActivationKeysPage: React.FC = () => {
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState<"keys" | "rules">("keys");
  const [items, setItems] = useState<ActivationKeyItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [totalPages, setTotalPages] = useState<number>(1);
  const { page, setPage, resetPage } = useUrlPagination(totalPages);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(20);
  const [counts, setCounts] = useState<ActivationKeyCounts>({
    total: 0,
    inactive: 0,
    activated: 0,
    revoked: 0,
    expired: 0,
  });

  const [products, setProducts] = useState<CatalogProductOption[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Dùng trực tiếp danh mục kho để ID và tag cùng thuộc warehouse.product_names.
  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/warehouse/catalog");
      const json = await res.json();
      if (res.ok && Array.isArray(json)) {
        setProducts(json.map((item: any) => ({
          id: Number(item.id),
          name: item.name,
          availableTags: Array.isArray(item.variants)
            ? item.variants
              .map((variant: any) => String(variant.tag || "").trim())
              .filter((tag: string) => tag && tag !== "Chưa gắn tag")
            : [],
        })));
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch danh sách mã kích hoạt
  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
        search: search.trim(),
        status: statusFilter,
      });
      if (selectedProductId) {
        params.append("productNameId", selectedProductId);
      }

      const res = await fetch(`/api/products/activation-keys?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setItems(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalItems(json.pagination?.total || 0);
        if (json.counts) {
          setCounts(json.counts);
        }
      } else {
        notify.error(json.message || "Không thể tải danh sách mã kích hoạt", "Lỗi Dữ Liệu");
      }
    } catch (err: any) {
      notify.error(err.message || "Lỗi kết nối máy chủ", "Lỗi Hệ Thống");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, selectedProductId]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    resetPage();
  };

  const handleProductChange = (id: string) => {
    setSelectedProductId(id);
    resetPage();
  };

  const handleStatusChange = (st: string) => {
    setStatusFilter(st);
    resetPage();
  };

  const handleCreateSubmit = async (payload: CreateActivationKeyPayload) => {
    const res = await fetch("/api/products/activation-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Không thể tạo mã kích hoạt.");
    }
    notify.success(json.message || "Đã tạo mã kích hoạt thành công!", "Thành Công");
    fetchKeys();
  };

  const handleRevoke = async (item: ActivationKeyItem) => {
    notify.confirm({
      title: "Xác Nhận Thu Hồi Mã Key",
      message: `Master có chắc muốn thu hồi mã key "${item.key_code}" không? Thao tác này sẽ vô hiệu hóa key.`,
      confirmText: "Thu Hồi Key",
      danger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/products/activation-keys/${item.id}/revoke`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "Admin thu hồi từ bảng quản lý" }),
          });
          const json = await res.json();
          if (res.ok && json.success) {
            notify.success(json.message || "Đã thu hồi mã key thành công!", "Thành Công");
            fetchKeys();
          } else {
            notify.error(json.message || "Thu hồi thất bại.", "Lỗi");
          }
        } catch (err: any) {
          notify.error(err.message || "Lỗi kết nối", "Lỗi");
        }
      },
    });
  };

  const handleDelete = async (item: ActivationKeyItem) => {
    notify.confirm({
      title: "Xác Nhận Xóa Vĩnh Viễn",
      message: `Xóa vĩnh viễn mã key "${item.key_code}" chưa kích hoạt này khỏi hệ thống?`,
      confirmText: "Xóa Vĩnh Viễn",
      danger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/products/activation-keys/${item.id}`, {
            method: "DELETE",
          });
          const json = await res.json();
          if (res.ok && json.success) {
            notify.success("Đã xóa mã key thành công!", "Thành Công");
            fetchKeys();
          } else {
            notify.error(json.message || "Xóa thất bại.", "Lỗi");
          }
        } catch (err: any) {
          notify.error(err.message || "Lỗi kết nối", "Lỗi");
        }
      },
    });
  };

  const handleCopyText = (text: string, label: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      notify.info(label, "Đã Sao Chép");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/10">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Quản Lý Mã Kích Hoạt (Activation Keys)
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Kho Slot Tự Động
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Hệ thống tự cấp phát slot trong Kho Gói Sản Phẩm khi khách hàng kích hoạt mã key trên Web Portal
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab("keys")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
            activeTab === "keys"
              ? "border-cyan-500 text-cyan-400 bg-cyan-500/10 rounded-t-xl"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-t-xl"
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Danh Sách Mã Key</span>
          <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {counts.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rules")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all ${
            activeTab === "rules"
              ? "border-cyan-500 text-cyan-400 bg-cyan-500/10 rounded-t-xl"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-t-xl"
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Cấu Hình Cấp Key (Variant + NCC)</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Tự Động
          </span>
        </button>
      </div>

      {activeTab === "keys" ? (
        <>
          {/* KPI Stats Cards */}
          <ActivationKeyStatsCards
            counts={counts}
            activeStatus={statusFilter}
            onSelectStatus={handleStatusChange}
          />

          {/* Filter Bar */}
          <ActivationKeyFilterBar
            search={search}
            onSearchChange={handleSearchChange}
            selectedProductId={selectedProductId}
            onProductChange={handleProductChange}
            products={products}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onRefresh={fetchKeys}
            loading={loading}
          />

          {/* Data Table */}
          <ActivationKeyTable
            items={items}
            loading={loading}
            onRevoke={handleRevoke}
            onDelete={handleDelete}
            onCopyText={handleCopyText}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4">
              <TablePagination
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  resetPage();
                }}
              />
            </div>
          )}

          {/* Modal Tạo Key Mới */}
          <CreateActivationKeyModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreateSubmit}
            products={products}
          />
        </>
      ) : (
        <ActivationKeyRulesTab warehouseProducts={products} />
      )}
    </div>
  );
};
