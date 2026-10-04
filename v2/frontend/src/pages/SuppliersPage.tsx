import React, { useState, useEffect, useCallback } from "react";
import { useNotification } from "@/shared/context/NotificationContext";
import {
  SupplierItem,
  SupplierCostLogItem,
  SupplierDetailData,
  SupplierFormData,
  SupplierFilterBar,
  SupplierOverviewTable,
  SupplierDetailModal,
  SupplierCreateEditModal,
  SupplierDeleteModal,
} from "../features/suppliers";

export const SuppliersPage: React.FC = () => {
  const notify = useNotification();

  // Suppliers Overview Data
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [searchOverview, setSearchOverview] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("priority");

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalImportCost: 0,
    totalRefund: 0,
    totalUnpaidCost: 0,
  });

  // Expandable Master-Detail Log State
  const [expandedSupplierIds, setExpandedSupplierIds] = useState<number[]>([]);
  const [supplierLogsMap, setSupplierLogsMap] = useState<
    Record<number, { logs: SupplierCostLogItem[]; loading: boolean }>
  >({});
  const [supplierPageMap, setSupplierPageMap] = useState<Record<number, number>>({});
  const [supplierPageSizeMap, setSupplierPageSizeMap] = useState<Record<number, number>>({});

  // Modal Detail V1 state
  const [selectedSupplierDetailId, setSelectedSupplierDetailId] = useState<number | null>(null);
  const [supplierDetail, setSupplierDetail] = useState<SupplierDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Modals state (Create, Edit, Delete)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<SupplierItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<SupplierFormData>({
    supplier_name: "",
    number_bank: "",
    bin_bank: "",
    account_holder: "",
    active_supply: true,
  });

  const [submitting, setSubmitting] = useState<boolean>(false);

  const formatCurrency = (val: number) => {
    if (!val || isNaN(val)) return "0 ₫";
    return new Intl.NumberFormat("vi-VN").format(val) + " ₫";
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const fetchSuppliersOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await fetch(
        `/api/suppliers/overview?search=${encodeURIComponent(
          searchOverview
        )}&activeFilter=${activeFilter}&sortBy=${sortBy}`
      );
      const data = await res.json();
      if (res.ok) {
        setSuppliers(data.data || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        notify.error("Không thể tải danh sách Nhà cung cấp", "Lỗi Dữ Liệu");
      }
    } catch (err) {
      notify.error("Lỗi khi kết nối máy chủ", "Lỗi Hệ Thống");
    } finally {
      setLoadingOverview(false);
    }
  }, [searchOverview, activeFilter, sortBy, notify]);

  const fetchSupplierLogs = async (supplierId: number) => {
    setSupplierLogsMap((prev) => ({
      ...prev,
      [supplierId]: { logs: prev[supplierId]?.logs || [], loading: true },
    }));
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/logs`);
      const data = await res.json();
      if (res.ok) {
        setSupplierLogsMap((prev) => ({
          ...prev,
          [supplierId]: { logs: data.data || [], loading: false },
        }));
      }
    } catch (err) {
      console.error("Lỗi khi tải lịch sử đơn NCC:", err);
      setSupplierLogsMap((prev) => ({
        ...prev,
        [supplierId]: { logs: [], loading: false },
      }));
    }
  };

  const fetchSupplierDetail = async (supplierId: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/detail`);
      const data = await res.json();
      if (res.ok) {
        setSupplierDetail(data.data || null);
      } else {
        notify.error(data.error || "Không thể tải chi tiết Nhà cung cấp", "Lỗi Dữ Liệu");
      }
    } catch (err) {
      notify.error("Lỗi khi kết nối máy chủ", "Lỗi Hệ Thống");
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchSuppliersOverview();
  }, [fetchSuppliersOverview]);

  useEffect(() => {
    if (selectedSupplierDetailId !== null) {
      fetchSupplierDetail(selectedSupplierDetailId);
    } else {
      setSupplierDetail(null);
    }
  }, [selectedSupplierDetailId]);

  const toggleExpandSupplier = (supplierId: number) => {
    if (expandedSupplierIds.includes(supplierId)) {
      setExpandedSupplierIds((prev) => prev.filter((id) => id !== supplierId));
    } else {
      setExpandedSupplierIds((prev) => [...prev, supplierId]);
      if (!supplierLogsMap[supplierId]?.logs) {
        fetchSupplierLogs(supplierId);
      }
    }
  };

  const handleOpenCreateModal = () => {
    setFormData({
      supplier_name: "",
      number_bank: "",
      bin_bank: "",
      account_holder: "",
      active_supply: true,
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier_name.trim()) {
      notify.warning("Vui lòng nhập tên nhà cung cấp!", "Thiếu Thông Tin");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        notify.success("Thêm nhà cung cấp thành công!", "Thành Công");
        setIsCreateModalOpen(false);
        fetchSuppliersOverview();
      } else {
        notify.error(data.error || "Thêm nhà cung cấp thất bại", "Lỗi Dữ Liệu");
      }
    } catch (err) {
      notify.error("Lỗi khi kết nối máy chủ", "Lỗi Hệ Thống");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/suppliers/${editingSupplier.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        notify.success("Cập nhật thông tin NCC thành công!", "Thành Công");
        setEditingSupplier(null);
        fetchSuppliersOverview();
      } else {
        notify.error(data.error || "Cập nhật NCC thất bại", "Lỗi Sửa Dữ Liệu");
      }
    } catch (err) {
      notify.error("Lỗi khi kết nối máy chủ", "Lỗi Hệ Thống");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (supplier: SupplierItem) => {
    const updatedStatus = !supplier.active_supply;
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_name: supplier.supplier_name,
          number_bank: supplier.number_bank,
          bin_bank: supplier.bin_bank,
          account_holder: supplier.account_holder,
          active_supply: updatedStatus,
        }),
      });
      if (res.ok) {
        notify.success(
          `Đã ${updatedStatus ? "kích hoạt" : "ngưng"} hợp tác với ${supplier.supplier_name}!`,
          "Cập Nhật Trạng Thái"
        );
        fetchSuppliersOverview();
      }
    } catch (err) {
      notify.error("Lỗi khi cập nhật trạng thái NCC", "Lỗi Hệ Thống");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSupplier) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/suppliers/${deletingSupplier.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        notify.success("Xóa nhà cung cấp thành công!", "Thành Công");
        setDeletingSupplier(null);
        fetchSuppliersOverview();
      } else {
        notify.error(data.error || "Xóa nhà cung cấp thất bại", "Lỗi Thao Tác");
      }
    } catch (err) {
      notify.error("Lỗi khi kết nối máy chủ", "Lỗi Hệ Thống");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayDebtSubmit = async () => {
    if (!selectedSupplierDetailId) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/suppliers/${selectedSupplierDetailId}/pay-debt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        notify.success("Thanh toán công nợ NCC thành công!", "Thành Công");
        fetchSupplierDetail(selectedSupplierDetailId);
        fetchSuppliersOverview();
      } else {
        notify.error(data.error || "Thanh toán công nợ thất bại", "Lỗi Dữ Liệu");
      }
    } catch (err) {
      notify.error("Lỗi khi thanh toán công nợ", "Lỗi Hệ Thống");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1650px] mx-auto pb-12">
      {/* Filter & Stat Bar */}
      <SupplierFilterBar
        stats={stats}
        searchOverview={searchOverview}
        onSearchChange={(e) => setSearchOverview(e.target.value)}
        activeFilter={activeFilter}
        onFilterChange={(e) => setActiveFilter(e.target.value)}
        sortBy={sortBy}
        onSortChange={(e) => setSortBy(e.target.value)}
        loadingOverview={loadingOverview}
        onRefresh={fetchSuppliersOverview}
        onOpenCreateModal={handleOpenCreateModal}
        formatCurrency={formatCurrency}
      />

      {/* Main Container: Master-Detail Table */}
      <div className="bg-[#0b0f19]/90 border border-slate-800/80 rounded-2xl p-5 shadow-2xl backdrop-blur-xl space-y-4">
        <SupplierOverviewTable
          suppliers={suppliers}
          loadingOverview={loadingOverview}
          expandedSupplierIds={expandedSupplierIds}
          toggleExpandSupplier={toggleExpandSupplier}
          supplierLogsMap={supplierLogsMap}
          supplierPageMap={supplierPageMap}
          setSupplierPageMap={setSupplierPageMap}
          supplierPageSizeMap={supplierPageSizeMap}
          setSupplierPageSizeMap={setSupplierPageSizeMap}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          onToggleStatus={handleToggleStatus}
          onSelectDetail={(id) => setSelectedSupplierDetailId(id)}
          onOpenEditModal={(s) => {
            setEditingSupplier(s);
            setFormData({
              supplier_name: s.supplier_name,
              number_bank: s.number_bank,
              bin_bank: s.bin_bank,
              account_holder: s.account_holder,
              active_supply: s.active_supply,
            });
          }}
          onConfirmDelete={(s) => setDeletingSupplier(s)}
        />
      </div>

      {/* Modals */}
      <SupplierDetailModal
        selectedSupplierDetailId={selectedSupplierDetailId}
        onClose={() => setSelectedSupplierDetailId(null)}
        loadingDetail={loadingDetail}
        supplierDetail={supplierDetail}
        formatCurrency={formatCurrency}
        onPayDebtSubmit={handlePayDebtSubmit}
        submitting={submitting}
      />

      <SupplierCreateEditModal
        isOpen={isCreateModalOpen || editingSupplier !== null}
        editingSupplier={editingSupplier}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingSupplier(null);
        }}
        formData={formData}
        setFormData={setFormData}
        onSubmit={editingSupplier ? handleEditSubmit : handleCreateSubmit}
        submitting={submitting}
      />

      <SupplierDeleteModal
        deletingSupplier={deletingSupplier}
        onClose={() => setDeletingSupplier(null)}
        onConfirmDelete={handleDeleteConfirm}
        submitting={submitting}
      />
    </div>
  );
};
