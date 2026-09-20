import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Download,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  Tag,
  Loader2,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  ChevronDown,
  Building2,
  PlusCircle,
  X,
  AlertTriangle,
} from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";

export interface PricingItem {
  id: number;
  san_pham: string;
  package_product: string;
  base_price: number;
  retail_price: number;
  ctv_price: number;
  student_price: number;
  promo_price: number;
  margin: string;
  is_active: boolean;
  updated_at: string;
}

export interface SupplierCostItem {
  id: number;
  product_variant_id: number;
  supplier_id: number;
  price: number;
  supplier_name: string;
  number_bank?: string;
}

export interface Supplier {
  id: number;
  supplier_name: string;
  number_bank?: string;
}

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
  const [editingSupplierCost, setEditingSupplierCost] = useState<{
    productId: number;
    supplierCostId: number;
    supplierName: string;
    price: number;
  } | null>(null);

  // Form States
  const [productForm, setProductForm] = useState({
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
        `/api/products/prices?page=${page}&limit=15&search=${encodeURIComponent(
          search
        )}`
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
      notify.error("Lỗi kết nối máy chủ backend", "Kết Nối Thất Bại");
    } finally {
      setLoading(false);
    }
  }, [page, search, notify]);

  useEffect(() => {
    fetchPricingData();
  }, [fetchPricingData]);

  // Load all suppliers list once
  useEffect(() => {
    fetch("/api/products/all-suppliers")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data || [];
        setAllSuppliers(list);
      })
      .catch((err) => console.error("Lỗi tải danh sách NCC:", err));
  }, []);

  const fetchSupplierCosts = async (productId: number) => {
    setLoadingSuppliers((prev) => ({ ...prev, [productId]: true }));
    try {
      const res = await fetch(`/api/products/${productId}/suppliers`);
      const data = await res.json();
      if (res.ok) {
        const list = Array.isArray(data) ? data : data.data || [];
        setSupplierCosts((prev) => ({ ...prev, [productId]: list }));
      }
    } catch (err) {
      notify.error("Lỗi khi tải giá NCC của sản phẩm", "Lỗi Kết Nối");
    } finally {
      setLoadingSuppliers((prev) => ({ ...prev, [productId]: false }));
    }
  };

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
    notify.info(
      "Tính năng Xuất Excel cho Bảng giá đang được phát triển.",
      "Thông Báo Hệ Thống"
    );
  };

  // Open Create Modal
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

  // Submit Create Product
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

  // Open Edit Modal
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

  // Submit Edit Product
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

  // Delete Product
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

  // Add Supplier Cost
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

  // Edit Supplier Cost
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
        notify.success(
          "Cập nhật giá NCC thành công! Đã phát event SUPPLIER_COST_UPDATED",
          "Thành Công"
        );
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

  // Delete Supplier Cost
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
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-md">
              DANH MỤC SẢN PHẨM & GIÁ
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Đang Hoạt Động
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-cyan-400" />
            Bảng Giá Niêm Yết
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Điều chỉnh giá bán lẻ, giá CTV, giá Sinh Viên, giá Khuyến Mãi và giá gốc theo dữ liệu thực tế hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchPricingData}
            disabled={loading}
            className="p-2.5 text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Làm mới bảng giá"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 hover:brightness-110 rounded-xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Mới</span>
          </button>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-[#0b0f19]/90 border border-slate-800/80 rounded-2xl p-5 shadow-2xl backdrop-blur-xl space-y-4">
        {/* Search & Stats Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm, tên gói..."
              value={search}
              onChange={handleSearchChange}
              className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800/60">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hiển thị: <strong className="text-cyan-300 font-semibold">{items.length}</strong> / {totalItems} kết quả</span>
            </span>
          </div>
        </div>

        {/* Pricing Data Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10.5px] border-b border-slate-800/80">
              <tr>
                <th className="py-3.5 px-3 w-8 text-center"></th>
                <th className="py-3.5 px-4">Sản Phẩm</th>
                <th className="py-3.5 px-3 text-right">Giá Gốc</th>
                <th className="py-3.5 px-3 text-right">Giá Bán Lẻ</th>
                <th className="py-3.5 px-3 text-right">Giá CTV</th>
                <th className="py-3.5 px-3 text-right">Giá Sinh Viên</th>
                <th className="py-3.5 px-3 text-right">Giá KM</th>
                <th className="py-3.5 px-3 text-center">Lợi Nhuận</th>
                <th className="py-3.5 px-3 text-center">Trạng Thái</th>
                <th className="py-3.5 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                      <span className="text-xs">Đang tải dữ liệu bảng giá thực tế...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Tag className="w-8 h-8 text-slate-600" />
                      <span className="text-xs font-semibold">Không tìm thấy sản phẩm nào</span>
                      <span className="text-[11px] text-slate-500">Thử thay đổi từ khóa tìm kiếm</span>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isExpanded = expandedRowId === item.id;
                  const costs = supplierCosts[item.id] || [];
                  const isLoadingCosts = loadingSuppliers[item.id];
                  const lowestSupplierCost = costs.length > 0
                    ? Math.min(...costs.map((c) => Number(c.price)))
                    : null;
                  const lowestSupplierObj = lowestSupplierCost !== null
                    ? costs.find((c) => Number(c.price) === lowestSupplierCost)
                    : null;

                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        onClick={() => toggleExpandRow(item.id)}
                        className={`transition-colors group cursor-pointer ${
                          isExpanded ? "bg-slate-900/80" : "hover:bg-slate-900/60"
                        }`}
                      >
                        {/* Chevron Expand Icon */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandRow(item.id);
                            }}
                            className={`p-1 rounded-md transition-all ${
                              isExpanded
                                ? "bg-indigo-500/20 text-indigo-400"
                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                            }`}
                            title={isExpanded ? "Thu gọn danh sách giá NCC" : "Mở rộng danh sách giá NCC"}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Product Name & Variant Name */}
                        <td className="py-3.5 px-4 max-w-[220px]">
                          <div>
                            <div className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors truncate" title={item.san_pham}>
                              {item.san_pham}
                            </div>
                            {item.package_product && item.package_product !== item.san_pham && (
                              <div className="text-[11px] text-slate-400 mt-0.5 truncate" title={item.package_product}>
                                {item.package_product}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Base Price (Giá Gốc) */}
                        <td className="py-3.5 px-3 text-right font-medium text-slate-400">
                          {formatCurrency(item.base_price)}
                        </td>

                        {/* Retail Price (Giá Bán Lẻ) */}
                        <td className="py-3.5 px-3 text-right font-bold text-cyan-300">
                          {formatCurrency(item.retail_price)}
                        </td>

                        {/* CTV Price (Giá CTV) */}
                        <td className="py-3.5 px-3 text-right font-semibold text-emerald-400">
                          {formatCurrency(item.ctv_price)}
                        </td>

                        {/* Student Price (Giá Sinh Viên) */}
                        <td className="py-3.5 px-3 text-right font-semibold text-amber-400">
                          {formatCurrency(item.student_price)}
                        </td>

                        {/* Promo Price (Giá Khuyến Mãi) */}
                        <td className="py-3.5 px-3 text-right font-semibold text-rose-400">
                          {formatCurrency(item.promo_price)}
                        </td>

                        {/* Margin */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            {item.margin}
                          </span>
                        </td>

                        {/* Active Status */}
                        <td className="py-3.5 px-3 text-center">
                          {item.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-400 bg-slate-800/60 border border-slate-700/60">
                              <XCircle className="w-3 h-3" />
                              Ẩn
                            </span>
                          )}
                        </td>

                        {/* Action Buttons: Edit, Delete */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit Product Icon */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(item);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800/80 border border-slate-800 transition-all"
                              title="Sửa sản phẩm & Giá"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* Delete Product Icon */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingItem(item);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 border border-slate-800 transition-all"
                              title="Xóa sản phẩm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Supplier Cost Panel */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} className="p-4 bg-slate-950/70 border-b border-slate-800/80">
                            <div className="bg-[#0f172a]/90 border border-indigo-500/20 rounded-xl p-5 shadow-2xl space-y-4">
                              <h3 className="text-center text-xs font-bold text-slate-200 tracking-wide uppercase">
                                Chi tiết giá sản phẩm
                              </h3>

                              {/* 4 Stat Cards */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                {/* Card 1: Giá Nguồn Thấp Nhất */}
                                <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 text-center shadow-sm">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    GIÁ NGUỒN THẤP NHẤT
                                  </div>
                                  <div className="text-lg font-black text-cyan-400">
                                    {lowestSupplierCost !== null ? formatCurrency(lowestSupplierCost) : "-"}
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    {lowestSupplierObj ? lowestSupplierObj.supplier_name : "Chưa có NCC"}
                                  </div>
                                </div>

                                {/* Card 2: Giá Sỉ Hiện Tại */}
                                <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 text-center shadow-sm">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    GIÁ SỈ HIỆN TẠI
                                  </div>
                                  <div className="text-lg font-black text-emerald-400">
                                    {formatCurrency(item.ctv_price)}
                                  </div>
                                </div>

                                {/* Card 3: Giá Khách Hiện Tại */}
                                <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 text-center shadow-sm">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    GIÁ KHÁCH HIỆN TẠI
                                  </div>
                                  <div className="text-lg font-black text-sky-400">
                                    {formatCurrency(item.retail_price)}
                                  </div>
                                </div>

                                {/* Card 4: Giá Sinh Viên */}
                                <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 text-center shadow-sm">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    GIÁ SINH VIÊN
                                  </div>
                                  <div className="text-lg font-black text-amber-400">
                                    {formatCurrency(item.student_price)}
                                  </div>
                                </div>
                              </div>

                              {/* Supplier Sub-Table Header & Add Button */}
                              <div className="flex items-center justify-between pt-2">
                                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                  <Building2 className="w-4 h-4 text-cyan-400" />
                                  Danh Sách Nhà Cung Cấp ({costs.length})
                                </span>
                                <button
                                  onClick={() => {
                                    setAddSupplierProductId(item.id);
                                    setSupplierForm({ supplier_id: allSuppliers[0]?.id || 0, price: 0 });
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all active:scale-95"
                                >
                                  <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Thêm nguồn</span>
                                </button>
                              </div>

                              {/* Supplier Sub-Table */}
                              <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-950/60">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800/80">
                                    <tr>
                                      <th className="py-2.5 px-4">NCC</th>
                                      <th className="py-2.5 px-3 text-center">GIÁ NHẬP</th>
                                      <th className="py-2.5 px-3 text-center">LỢI NHUẬN</th>
                                      <th className="py-2.5 px-4 text-center">THAO TÁC</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/40">
                                    {isLoadingCosts ? (
                                      <tr>
                                        <td colSpan={4} className="py-4 text-center text-slate-400">
                                          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin inline mr-2" />
                                          Đang tải giá nguồn từ các NCC...
                                        </td>
                                      </tr>
                                    ) : costs.length === 0 ? (
                                      <tr>
                                        <td colSpan={4} className="py-4 text-center text-slate-500 italic">
                                          Chưa có dữ liệu giá từ Nhà cung cấp nào
                                        </td>
                                      </tr>
                                    ) : (
                                      costs.map((c) => {
                                        const ctvMargin = item.ctv_price > 0 ? item.ctv_price - c.price : 0;
                                        const retailMargin = item.retail_price > 0 ? item.retail_price - c.price : 0;
                                        const marginText = `${formatCurrency(ctvMargin)} - ${formatCurrency(retailMargin)}`;

                                        return (
                                          <tr key={c.id} className="hover:bg-slate-900/40">
                                            <td className="py-3 px-4 font-bold text-slate-200">
                                              {c.supplier_name}
                                            </td>
                                            <td className="py-3 px-3 text-center">
                                              <span className="px-3 py-1 rounded-md text-xs font-bold bg-slate-900 border border-slate-800 text-cyan-300">
                                                {formatCurrency(c.price)}
                                              </span>
                                            </td>
                                            <td className="py-3 px-3 text-center font-semibold text-emerald-400">
                                              {marginText}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                              <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                  onClick={() =>
                                                    setEditingSupplierCost({
                                                      productId: item.id,
                                                      supplierCostId: c.id,
                                                      supplierName: c.supplier_name,
                                                      price: c.price,
                                                    })
                                                  }
                                                  className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-all"
                                                  title="Sửa giá nhập này"
                                                >
                                                  <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteSupplierCost(item.id, c.id)}
                                                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all"
                                                  title="Xóa nguồn này"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
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
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

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

      {/* CREATE PRODUCT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                Tạo Sản Phẩm & Bảng Giá Mới
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Tên Sản Phẩm *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Adobe Creative Cloud"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Tên Gói / Biến Thể</label>
                <input
                  type="text"
                  placeholder="VD: Adobe 1PC --1m"
                  value={productForm.variant_name}
                  onChange={(e) => setProductForm({ ...productForm, variant_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Giá Gốc (₫)</label>
                  <input
                    type="number"
                    value={productForm.base_price}
                    onChange={(e) => setProductForm({ ...productForm, base_price: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Giá Bán Lẻ (₫)</label>
                  <input
                    type="number"
                    value={productForm.retail_price}
                    onChange={(e) => setProductForm({ ...productForm, retail_price: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Giá CTV (₫)</label>
                  <input
                    type="number"
                    value={productForm.ctv_price}
                    onChange={(e) => setProductForm({ ...productForm, ctv_price: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Giá Sinh Viên (₫)</label>
                  <input
                    type="number"
                    value={productForm.student_price}
                    onChange={(e) => setProductForm({ ...productForm, student_price: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? "Đang tạo..." : "Xác Nhận Tạo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-400" />
                Sửa Bảng Giá Sản Phẩm
              </h2>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Tên Sản Phẩm *</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Tên Gói / Biến Thể</label>
                <input
                  type="text"
                  value={productForm.variant_name}
                  onChange={(e) => setProductForm({ ...productForm, variant_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Giá Gốc (₫)</label>
                  <input
                    type="number"
                    value={productForm.base_price}
                    onChange={(e) => setProductForm({ ...productForm, base_price: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Giá Bán Lẻ (₫)</label>
                  <input
                    type="number"
                    value={productForm.retail_price}
                    onChange={(e) => setProductForm({ ...productForm, retail_price: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Giá CTV (₫)</label>
                  <input
                    type="number"
                    value={productForm.ctv_price}
                    onChange={(e) => setProductForm({ ...productForm, ctv_price: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Giá Sinh Viên (₫)</label>
                  <input
                    type="number"
                    value={productForm.student_price}
                    onChange={(e) => setProductForm({ ...productForm, student_price: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-bold text-white">Xác Nhận Xóa Sản Phẩm</h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa sản phẩm <strong className="text-white">{deletingItem.san_pham}</strong> ({deletingItem.package_product})? Event <code className="text-rose-400 font-mono">PRODUCT_DELETED</code> sẽ được gửi tới Event Bus.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 disabled:opacity-50"
              >
                {submitting ? "Đang xóa..." : "Xóa Sản Phẩm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD SUPPLIER COST MODAL */}
      {addSupplierProductId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-cyan-400" />
                Thêm Nguồn Giá NCC
              </h2>
              <button
                onClick={() => setAddSupplierProductId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSupplierSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Chọn Nhà Cung Cấp *</label>
                <select
                  value={supplierForm.supplier_id}
                  onChange={(e) => setSupplierForm({ ...supplierForm, supplier_id: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value={0}>-- Chọn nhà cung cấp --</option>
                  {allSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.supplier_name} {s.number_bank ? `(${s.number_bank})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Giá Nhập Nguồn (₫) *</label>
                <input
                  type="number"
                  required
                  placeholder="VD: 200000"
                  value={supplierForm.price || ""}
                  onChange={(e) => setSupplierForm({ ...supplierForm, price: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAddSupplierProductId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : "Thêm Nguồn"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SUPPLIER COST MODAL */}
      {editingSupplierCost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-400" />
                Sửa Giá Nhập NCC
              </h2>
              <button
                onClick={() => setEditingSupplierCost(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSupplierCostSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Nhà Cung Cấp</label>
                <input
                  type="text"
                  disabled
                  value={editingSupplierCost.supplierName}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Giá Nhập Nguồn Mới (₫) *</label>
                <input
                  type="number"
                  required
                  placeholder="VD: 250000"
                  value={editingSupplierCost.price || ""}
                  onChange={(e) =>
                    setEditingSupplierCost({
                      ...editingSupplierCost,
                      price: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSupplierCost(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? "Đang lưu..." : "Lưu Thay Đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

