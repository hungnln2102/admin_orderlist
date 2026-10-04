import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";
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
} from "../features/pricing";

export const PricingPage: React.FC = () => {
  const notify = useNotification();
  const [items, setItems] = useState<PricingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

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

  // Form States
  const [productForm, setProductForm] = useState<ProductFormData>({
    name: "",
    variant_name: "",
    base_price: 0,
    retail_price: 0,
    ctv_price: 0,
    student_price: 0,
    promo_price: 0,
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
        `/api/products/prices?page=${page}&limit=15&search=${encodeURIComponent(search)}`
      );
      const data = await res.json();
      if (res.ok) {
        setItems(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalItems(data.pagination?.total || 0);
      } else {
        notify.error("Không thể tải danh sách bảng giá sản phẩm", "Lỗi Dữ Liệu");
      }
    } catch (err) {
      notify.error("Lỗi kết nối máy chủ", "Lỗi Hệ Thống");
    } finally {
      setLoading(false);
    }
  }, [page, search, notify]);

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
    setPage(1);
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
        body: JSON.stringify(productForm),
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
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productForm),
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
        notify.success("Xóa sản phẩm thành công! Đã phát event PRODUCT_DELETED", "Thành Công");
        setDeletingItem(null);
        fetchPricingData();
      } else {
        notify.error(data.error || "Xóa sản phẩm thất bại", "Lỗi Thao Tác");
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
        />

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/60 text-xs text-slate-400">
            <div>
              Trang <strong className="text-slate-200">{page}</strong> / {totalPages} (Tổng {totalItems} sản phẩm)
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Trước</span>
              </button>

              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pNum = page;
                  if (page <= 3) {
                    pNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pNum = totalPages - 4 + i;
                  } else {
                    pNum = page - 2 + i;
                  }
                  if (pNum < 1 || pNum > totalPages) return null;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        pNum === page
                          ? "bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20"
                          : "bg-slate-900/60 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <span>Sau</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
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
