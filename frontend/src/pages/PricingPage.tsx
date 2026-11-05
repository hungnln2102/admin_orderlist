import React, { useState, useEffect, useCallback } from "react";
import { TablePagination } from "@/shared/components/TablePagination";
import { useNotification } from "@/shared/context/NotificationContext";
import { useUrlPagination } from "@/shared/hooks/useUrlPagination";
import {
  PricingItem,
  SupplierCostItem,
  Supplier,
  EditingSupplierCostState,
  ProductFormData,
  PricingFilterBar,
  PricingTable,
  PricingCreateEditModal,
  SupplierCostModal,
  PricingDeleteModal,
  PricingStatusTab,
  PricingCounts,
} from "../features/pricing";

export const PricingPage: React.FC = () => {
  const notify = useNotification();
  const [items, setItems] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [totalPages, setTotalPages] = useState<number>(1);
  const { page, setPage, resetPage } = useUrlPagination(totalPages);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(15);
  const [activeTab, setActiveTab] = useState<PricingStatusTab>("all");
  const [counts, setCounts] = useState<PricingCounts>({ total: 0, active: 0, inactive: 0 });

  // Expandable Row state for Supplier Prices
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [supplierCosts, setSupplierCosts] = useState<Record<number, SupplierCostItem[]>>({});
  const [loadingSuppliers, setLoadingSuppliers] = useState<Record<number, boolean>>({});

  // All suppliers list for adding new cost
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<PricingItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<PricingItem | null>(null);
  const [addSupplierProductId, setAddSupplierProductId] = useState<number | null>(null);
  const [editingSupplierCost, setEditingSupplierCost] = useState<EditingSupplierCostState | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Form States
  const [productForm, setProductForm] = useState<ProductFormData>({
    name: "",
    variant_name: "",
    base_price: 0,
    retail_price: 0,
    ctv_price: 0,
    student_price: 0,
    promo_price: 0,
    is_active: true,
  });

  const [supplierForm, setSupplierForm] = useState({
    supplier_id: 0,
    price: 0,
  });

  const [submitting, setSubmitting] = useState<boolean>(false);

  const formatCurrency = (val: number) => {
    if (!val || isNaN(val) || val <= 0) return "-";
    return new Intl.NumberFormat("vi-VN").format(val) + " ₫";
  };

  const fetchPricingData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/products/prices?page=${page}&limit=${pageSize}&search=${encodeURIComponent(search)}&status=${activeTab}`
      );
      const data = await res.json();
      if (res.ok) {
        setItems(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalItems(data.pagination?.total || 0);
        if (data.counts) {
          setCounts(data.counts);
        }
      } else {
        notify.error("Không thể tải danh sách bảng giá sản phẩm", "Lỗi Dữ Liệu");
      }
    } catch (err) {
      notify.error("Lỗi kết nối máy chủ", "Lỗi Hệ Thống");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, activeTab]);

  const handleTabChange = (tab: PricingStatusTab) => {
    setActiveTab(tab);
    resetPage();
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    resetPage();
  };

  const fetchAllSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/api/products/all-suppliers");
      const data = await res.json();
      if (res.ok) {
        setAllSuppliers(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách NCC:", err);
    }
  }, []);

  const fetchSupplierCosts = async (productId: number) => {
    setLoadingSuppliers((prev) => ({ ...prev, [productId]: true }));
    try {
      const res = await fetch(`/api/products/${productId}/suppliers`);
      const data = await res.json();
      if (res.ok) {
        setSupplierCosts((prev) => ({
          ...prev,
          [productId]: Array.isArray(data) ? data : data.data || [],
        }));
      }
    } catch (err) {
      console.error("Lỗi khi tải giá nhà cung cấp:", err);
    } finally {
      setLoadingSuppliers((prev) => ({ ...prev, [productId]: false }));
    }
  };

  useEffect(() => {
    fetchPricingData();
  }, [fetchPricingData]);

  useEffect(() => {
    fetchAllSuppliers();
  }, [fetchAllSuppliers]);

  const toggleExpandRow = (productId: number) => {
    if (expandedRowId === productId) {
      setExpandedRowId(null);
    } else {
      setExpandedRowId(productId);
      if (!supplierCosts[productId]) {
        fetchSupplierCosts(productId);
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    resetPage();
  };

  const handleExportExcel = () => {
    notify.info("Tính năng Xuất Excel cho Bảng giá đang được phát triển.", "Thông Báo Hệ Thống");
  };

  const handleOpenCreateModal = () => {
    setProductForm({
      name: "",
      variant_name: "",
      base_price: 0,
      retail_price: 0,
      ctv_price: 0,
      student_price: 0,
      promo_price: 0,
      is_active: true,
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      notify.warning("Vui lòng nhập tên sản phẩm!", "Thiếu Thông Tin");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...productForm, san_pham: productForm.name, package_product: productForm.variant_name }),
      });
      const data = await res.json();
      if (res.ok) {
        notify.success("Tạo sản phẩm thành công! Đã phát event PRODUCT_CREATED", "Thành Công");
        setIsCreateModalOpen(false);
        fetchPricingData();
      } else {
        notify.error(data.error || "Tạo sản phẩm thất bại", "Lỗi Sửa Dữ Liệu");
      }
    } catch (err) {
      notify.error("Lỗi khi kết nối máy chủ", "Lỗi Hệ Thống");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (item: PricingItem) => {
    setEditingItem(item);
    setProductForm({
      name: item.san_pham,
      variant_name: item.package_product || item.san_pham,
      base_price: item.base_price || 0,
      retail_price: item.retail_price || 0,
      ctv_price: item.ctv_price || 0,
      student_price: item.student_price || 0,
      promo_price: item.promo_price || 0,
      is_active: item.is_active ?? true,
    });
  };

  const handleToggleActive = async (item: PricingItem) => {
    setTogglingId(item.id);
    const newStatus = !item.is_active;
    try {
      const res = await fetch(`/api/products/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        notify.success(
          `Đã chuyển "${item.san_pham}" sang ${newStatus ? "Hoạt động" : "Ẩn"}!`,
          "Cập Nhật Thành Công"
        );
        setCounts((prev) => ({
          ...prev,
          active: newStatus ? prev.active + 1 : Math.max(0, prev.active - 1),
          inactive: newStatus ? Math.max(0, prev.inactive - 1) : prev.inactive + 1,
        }));
        if (activeTab === "active" && !newStatus) {
          setItems((prev) => prev.filter((it) => it.id !== item.id));
          setTotalItems((prev) => Math.max(0, prev - 1));
        } else if (activeTab === "inactive" && newStatus) {
          setItems((prev) => prev.filter((it) => it.id !== item.id));
          setTotalItems((prev) => Math.max(0, prev - 1));
        } else {
          setItems((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, is_active: newStatus } : it))
          );
        }
      } else {
        notify.error(data.error || "Không thể cập nhật trạng thái", "Lỗi Cập Nhật");
      }
    } catch (err) {
      notify.error("Lỗi khi kết nối máy chủ", "Lỗi Hệ Thống");
    } finally {
      setTogglingId(null);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...productForm, san_pham: productForm.name, package_product: productForm.variant_name }),
      });
      const data = await res.json();
      if (res.ok) {
        notify.success("Cập nhật sản phẩm thành công! Đã phát event PRODUCT_UPDATED", "Thành Công");
        setEditingItem(null);
        fetchPricingData();
      } else {
        notify.error(data.error || "Cập nhật sản phẩm thất bại", "Lỗi Sửa Dữ Liệu");
      }
    } catch (err) {
      notify.error("Lỗi khi kết nối máy chủ", "Lỗi Hệ Thống");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${deletingItem.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        notify.success(data.data?.summary || data.message || "Xóa sản phẩm thành công! Đã phát event PRODUCT_DELETED", "Thành Công");
        setDeletingItem(null);
        fetchPricingData();
      } else {
        notify.error(data.error || "Xóa sản phẩm thất bại", "Từ Chối Thao Tác");
      }
    } catch (err) {
      notify.error("Lỗi khi kết nối máy chủ", "Lỗi Hệ Thống");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addSupplierProductId) return;
    if (!supplierForm.supplier_id || supplierForm.price <= 0) {
      notify.warning("Vui lòng chọn NCC và nhập giá nhập hợp lệ!", "Thiếu Thông Tin");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${addSupplierProductId}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierForm),
      });
      const data = await res.json();
      if (res.ok) {
        notify.success("Thêm nguồn NCC thành công! Đã phát event SUPPLIER_COST_ADDED", "Thành Công");
        const prodId = addSupplierProductId;
        setAddSupplierProductId(null);
        setSupplierForm({ supplier_id: 0, price: 0 });
        fetchSupplierCosts(prodId);
      } else {
        notify.error(data.error || "Thêm nguồn NCC thất bại", "Lỗi Dữ Liệu");
      }
    } catch (err) {
      notify.error("Lỗi khi kết nối máy chủ", "Lỗi Hệ Thống");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSupplierCostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplierCost) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/suppliers/${editingSupplierCost.supplierCostId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: editingSupplierCost.price }),
      });
      const data = await res.json();
      if (res.ok) {
        notify.success("Cập nhật giá NCC thành công! Đã phát event SUPPLIER_COST_UPDATED", "Thành Công");
        const prodId = editingSupplierCost.productId;
        setEditingSupplierCost(null);
        fetchSupplierCosts(prodId);
      } else {
        notify.error(data.error || "Cập nhật giá NCC thất bại", "Lỗi Sửa Dữ Liệu");
      }
    } catch (err) {
      notify.error("Lỗi khi kết nối máy chủ", "Lỗi Hệ Thống");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSupplierCost = async (productId: number, supplierCostId: number) => {
    try {
      const res = await fetch(`/api/products/suppliers/${supplierCostId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        notify.success("Đã xóa nguồn NCC! Đã phát event SUPPLIER_COST_DELETED", "Thành Công");
        fetchSupplierCosts(productId);
      } else {
        notify.error(data.error || "Xóa nguồn NCC thất bại", "Lỗi Dữ Liệu");
      }
    } catch (err) {
      notify.error("Lỗi khi xóa NCC", "Lỗi Hệ Thống");
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1650px] mx-auto pb-12">
      {/* Header & Filter Toolbar */}
      <PricingFilterBar
        search={search}
        onSearchChange={handleSearchChange}
        loading={loading}
        onRefresh={fetchPricingData}
        onExportExcel={handleExportExcel}
        onOpenCreateModal={handleOpenCreateModal}
        displayCount={items.length}
        totalCount={totalItems}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={counts}
      />

      {/* Main Container */}
      <div className="bg-[#0b0f19]/90 border border-slate-800/80 rounded-2xl p-5 shadow-2xl backdrop-blur-xl space-y-4">
        {/* Pricing Data Table Component */}
        <PricingTable
          items={items}
          loading={loading}
          expandedRowId={expandedRowId}
          toggleExpandRow={toggleExpandRow}
          supplierCosts={supplierCosts}
          loadingSuppliers={loadingSuppliers}
          allSuppliers={allSuppliers}
          formatCurrency={formatCurrency}
          onOpenEditModal={handleOpenEditModal}
          onConfirmDelete={(item) => setDeletingItem(item)}
          onOpenAddSupplierModal={(prodId) => {
            setAddSupplierProductId(prodId);
            setSupplierForm({ supplier_id: allSuppliers[0]?.id || 0, price: 0 });
          }}
          onOpenEditSupplierCostModal={(costState) => setEditingSupplierCost(costState)}
          onDeleteSupplierCost={handleDeleteSupplierCost}
          onToggleActive={handleToggleActive}
          togglingId={togglingId}
        />

        {/* Pagination Footer Chuẩn Master */}
        {totalPages > 0 && totalItems > 0 && (
          <TablePagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            disabled={loading}
          />
        )}
      </div>

      {/* Modals */}
      <PricingCreateEditModal
        isOpen={isCreateModalOpen || editingItem !== null}
        editingItem={editingItem}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingItem(null);
        }}
        productForm={productForm}
        setProductForm={setProductForm}
        onSubmit={editingItem ? handleEditSubmit : handleCreateSubmit}
        submitting={submitting}
      />

      <PricingDeleteModal
        deletingItem={deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirmDelete={handleDeleteConfirm}
        submitting={submitting}
      />

      <SupplierCostModal
        addSupplierProductId={addSupplierProductId}
        onCloseAddModal={() => setAddSupplierProductId(null)}
        supplierForm={supplierForm}
        setSupplierForm={setSupplierForm}
        allSuppliers={allSuppliers}
        onAddSubmit={handleAddSupplierSubmit}
        editingSupplierCost={editingSupplierCost}
        onCloseEditModal={() => setEditingSupplierCost(null)}
        setEditingSupplierCost={setEditingSupplierCost}
        onEditSubmit={handleEditSupplierCostSubmit}
        submitting={submitting}
      />
    </div>
  );
};
