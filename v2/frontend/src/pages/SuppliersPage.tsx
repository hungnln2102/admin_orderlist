import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShoppingBag,
  DollarSign,
  RotateCcw,
  Clock,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Power,
  Eye,
  Loader2,
  FileText,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";

export interface SupplierItem {
  id: number;
  supplier_name: string;
  number_bank: string;
  bin_bank: string;
  account_holder: string;
  active_supply: boolean;
  total_orders: number;
  current_month_orders: number;
  current_month_cost: number;
  last_order_date: string | null;
  total_paid: number;
  total_debt: number;
}

export interface SupplierCostLogItem {
  id: string | number;
  order_list_id: number;
  supply_id: number;
  id_order: string;
  supplier_name: string;
  import_cost: number;
  refund_amount: number;
  ncc_payment_status: string;
  logged_at: string;
}

export interface SupplierDetailData {
  general_info: {
    id: number;
    supplier_name: string;
    bank_name: string;
    number_bank: string;
    bin_bank: string;
    account_holder: string;
    active_supply: boolean;
  };
  payment_overview: {
    total_paid: number;
    remaining_debt: number;
    refund_amount: number;
    unpaid_orders_count: number;
  };
  order_stats: {
    total_orders: number;
    paid_orders: number;
    unpaid_orders: number;
    canceled_orders: number;
  };
  unpaid_cycle: {
    amount_needed: number;
    refund_to_shop: number;
    debt_by_order: number;
    amount_paid: number;
    payment_status: string;
    shop_bank_accounts: { id: number; label: string }[];
    vietqr_url: string | null;
  };
  monthly_orders: { month: string; count: number }[];
}

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

  // Expandable Rows State & Cached Logs for each Supplier
  const [expandedSupplierIds, setExpandedSupplierIds] = useState<number[]>([]);
  const [supplierLogsMap, setSupplierLogsMap] = useState<
    Record<number, { loading: boolean; logs: SupplierCostLogItem[] }>
  >({});
  const [supplierPageMap, setSupplierPageMap] = useState<Record<number, number>>({});
  const [supplierPageSizeMap, setSupplierPageSizeMap] = useState<Record<number, number>>({});

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<SupplierItem | null>(null);

  // V1 Supplier Detail Modal State
  const [selectedSupplierDetailId, setSelectedSupplierDetailId] = useState<number | null>(null);
  const [supplierDetail, setSupplierDetail] = useState<SupplierDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    supplier_name: "",
    number_bank: "",
    bin_bank: "",
    account_holder: "",
    active_supply: true,
  });

  const [submitting, setSubmitting] = useState<boolean>(false);

  const formatCurrency = (val: number) => {
    if (!val || isNaN(val) || val <= 0) return "0 ₫";
    return new Intl.NumberFormat("vi-VN").format(val) + " ₫";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleDateString("vi-VN");
    } catch (e) {
      return "-";
    }
  };

  // Fetch Suppliers Data
  const fetchOverviewData = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await fetch(
        `/api/suppliers/overview?search=${encodeURIComponent(
          searchOverview
        )}&activeFilter=${encodeURIComponent(activeFilter)}&sortBy=${encodeURIComponent(sortBy)}`
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
      notify.error("Lỗi kết nối máy chủ backend", "Kết Nối Thất Bại");
    } finally {
      setLoadingOverview(false);
    }
  }, [searchOverview, activeFilter, sortBy, notify]);

  // Fetch V1 Supplier Detail Modal Data
  const fetchSupplierDetail = useCallback(async (supplierId: number) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}/details`);
      const data = await res.json();
      if (res.ok) {
        setSupplierDetail(data);
      } else {
        notify.error("Không thể tải chi tiết Nhà cung cấp", "Lỗi Dữ Liệu");
      }
    } catch (err) {
      notify.error("Lỗi khi tải thông tin chi tiết NCC", "Lỗi Kết Nối");
    } finally {
      setLoadingDetail(false);
    }
  }, [notify]);

  useEffect(() => {
    if (selectedSupplierDetailId !== null) {
      fetchSupplierDetail(selectedSupplierDetailId);
    }
  }, [selectedSupplierDetailId, fetchSupplierDetail]);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  // Toggle Row Expansion & Lazy Load Cost Logs for that Supplier
  const toggleExpandSupplier = async (supplierId: number) => {
    if (expandedSupplierIds.includes(supplierId)) {
      setExpandedSupplierIds(expandedSupplierIds.filter((id) => id !== supplierId));
    } else {
      setExpandedSupplierIds([...expandedSupplierIds, supplierId]);
      if (!supplierLogsMap[supplierId]) {
        setSupplierLogsMap((prev) => ({ ...prev, [supplierId]: { loading: true, logs: [] } }));
        try {
          const res = await fetch(`/api/suppliers/cost-logs?supplierId=${supplierId}&limit=100`);
          const data = await res.json();
          setSupplierLogsMap((prev) => ({
            ...prev,
            [supplierId]: { loading: false, logs: data.data || [] },
          }));
        } catch (e) {
          setSupplierLogsMap((prev) => ({
            ...prev,
            [supplierId]: { loading: false, logs: [] },
          }));
        }
      }
    }
  };

  // Toggle Supplier Power Status
  const handleToggleStatus = async (supplier: SupplierItem) => {
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/toggle-status`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (res.ok) {
        const nextStatus = data.data.active_supply;
        notify.success(
          `Đã ${nextStatus ? "kích hoạt" : "ngưng"} hợp tác với ${supplier.supplier_name}`,
          "Cập Nhật Trạng Thái"
        );
        fetchOverviewData();
      } else {
        notify.error(data.error || "Không thể đổi trạng thái", "Lỗi Dữ Liệu");
      }
    } catch (err) {
      notify.error("Lỗi khi kết nối máy chủ", "Lỗi Hệ Thống");
    }
  };

  // Pay Debt Action inside V1 Modal
  const handlePayDebtSubmit = async () => {
    if (!selectedSupplierDetailId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/suppliers/${selectedSupplierDetailId}/pay-debt`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        notify.success("Thanh toán công nợ thành công!", "Thành Công");
        fetchSupplierDetail(selectedSupplierDetailId);
        fetchOverviewData();

        // Invalidate expanded logs cache for this supplier
        setSupplierLogsMap((prev) => {
          const nextMap = { ...prev };
          delete nextMap[selectedSupplierDetailId];
          return nextMap;
        });
      } else {
        notify.error(data.error || "Thanh toán thất bại", "Lỗi Thao Tác");
      }
    } catch (err) {
      notify.error("Lỗi khi xử lý thanh toán", "Lỗi Hệ Thống");
    } finally {
      setSubmitting(false);
    }
  };

  // Create Supplier Submit
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
        notify.success("Thêm nhà cung cấp mới thành công!", "Thành Công");
        setIsCreateModalOpen(false);
        fetchOverviewData();
      } else {
        notify.error(data.error || "Thêm nhà cung cấp thất bại", "Lỗi Dữ Liệu");
      }
    } catch (err) {
      notify.error("Lỗi khi kết nối máy chủ", "Lỗi Hệ Thống");
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Supplier Submit
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
        notify.success("Cập nhật thông tin Nhà cung cấp thành công!", "Thành Công");
        setEditingSupplier(null);
        fetchOverviewData();
      } else {
        notify.error(data.error || "Cập nhật nhà cung cấp thất bại", "Lỗi Dữ Liệu");
      }
    } catch (err) {
      notify.error("Lỗi khi kết nối máy chủ", "Lỗi Hệ Thống");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Supplier Confirm
  const handleDeleteConfirm = async () => {
    if (!deletingSupplier) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/suppliers/${deletingSupplier.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        notify.success(`Đã xóa nhà cung cấp "${deletingSupplier.supplier_name}"!`, "Thành Công");
        setDeletingSupplier(null);
        fetchOverviewData();
      } else {
        notify.error(data.error || "Xóa nhà cung cấp thất bại", "Lỗi Thao Tác");
      }
    } catch (err) {
      notify.error("Lỗi khi kết nối máy chủ", "Lỗi Hệ Thống");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            Quản Lý Nguồn Hàng
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Theo dõi công nợ, chi phí nhập hàng và chu kỳ thanh toán từ các đối tác cung cấp.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchOverviewData()}
            disabled={loadingOverview}
            className="p-2.5 text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loadingOverview ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          <button
            onClick={() => {
              setFormData({
                supplier_name: "",
                number_bank: "",
                bin_bank: "",
                account_holder: "",
                active_supply: true,
              });
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-xl transition-all shadow-md shadow-cyan-600/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm NCC</span>
          </button>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: TỔNG ĐƠN */}
        <div className="bg-[#0b0f19]/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              TỔNG ĐƠN
            </div>
            <div className="text-2xl font-black text-white">{stats.totalOrders}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: TỔNG NHẬP */}
        <div className="bg-[#0b0f19]/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              TỔNG NHẬP
            </div>
            <div className="text-xl font-black text-emerald-400">
              {formatCurrency(stats.totalImportCost)}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: TỔNG HOÀN */}
        <div className="bg-[#0b0f19]/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              TỔNG HOÀN
            </div>
            <div className="text-xl font-black text-amber-400">
              {formatCurrency(stats.totalRefund)}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <RotateCcw className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: TỔNG CHƯA THANH TOÁN */}
        <div className="bg-[#0b0f19]/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              TỔNG CHƯA THANH TOÁN
            </div>
            <div className="text-xl font-black text-rose-400">
              {formatCurrency(stats.totalUnpaidCost)}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* MAIN UNIFIED MASTER-DETAIL TABLE */}
      <div className="bg-[#0b0f19]/90 border border-slate-800/80 rounded-2xl p-5 shadow-2xl backdrop-blur-xl space-y-4">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm theo nhà cung cấp..."
              value={searchOverview}
              onChange={(e) => setSearchOverview(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Sort Priority Selector */}
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-slate-300">Sắp xếp:</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-950/80 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
            >
              <option value="priority">🔥 Tất cả</option>
              <option value="active">🟢 NCC đang hoạt động</option>
              <option value="debt">🔴 NCC đang còn dư nợ</option>
              <option value="paid">💰 NCC có đã trả nhiều</option>
            </select>

            {/* Active Status Filter Selector */}
            <div className="flex items-center gap-1.5 text-slate-400 text-xs ml-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Trạng thái:</span>
            </div>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang hợp tác</option>
              <option value="inactive">Ngưng hợp tác</option>
            </select>
          </div>
        </div>

        {/* Master-Detail Expandable Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10.5px] border-b border-slate-800/80">
              <tr>
                <th className="py-3.5 px-3 w-8 text-center"></th>
                <th className="py-3.5 px-4">Nhà Cung Cấp</th>
                <th className="py-3.5 px-4">Tài Khoản</th>
                <th className="py-3.5 px-4 text-center">Tháng Này</th>
                <th className="py-3.5 px-3 text-center">Lần Cuối</th>
                <th className="py-3.5 px-3 text-right">Đã Trả</th>
                <th className="py-3.5 px-3 text-right">Còn Nợ</th>
                <th className="py-3.5 px-3 text-center">T/Thái</th>
                <th className="py-3.5 px-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300 font-medium">
              {loadingOverview ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 text-cyan-400 animate-spin inline mr-2" />
                    Đang tải dữ liệu Nhà cung cấp...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 italic">
                    Không tìm thấy nhà cung cấp nào
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => {
                  const isExpanded = expandedSupplierIds.includes(s.id);
                  const logsInfo = supplierLogsMap[s.id];

                  return (
                    <React.Fragment key={s.id}>
                      {/* Supplier Master Row */}
                      <tr
                        onClick={() => toggleExpandSupplier(s.id)}
                        className={`hover:bg-slate-900/60 transition-colors group cursor-pointer ${
                          isExpanded ? "bg-slate-900/40" : ""
                        }`}
                      >
                        {/* Expand Chevron Icon */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandSupplier(s.id);
                            }}
                            className={`p-1 rounded-md transition-all ${
                              isExpanded
                                ? "bg-indigo-500/20 text-indigo-400"
                                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                            }`}
                            title={isExpanded ? "Thu gọn danh sách đơn" : "Mở rộng danh sách đơn"}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* NCC Name */}
                        <td className="py-3.5 px-4">
                          <div>
                            <div className="font-bold text-slate-100 group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                              <span>{s.supplier_name}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Tổng đơn: {s.total_orders}
                            </div>
                          </div>
                        </td>

                        {/* Tài Khoản */}
                        <td className="py-3.5 px-4">
                          <div>
                            <div className="font-semibold text-slate-200">
                              {s.number_bank || "Chưa cập nhật"}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {s.account_holder || "Chưa cập nhật"}
                            </div>
                          </div>
                        </td>

                        {/* Tháng Này */}
                        <td className="py-3.5 px-4 text-center">
                          <div>
                            <div className="font-bold text-slate-200">{s.current_month_orders} Đơn</div>
                            <div className="text-[11px] font-semibold text-emerald-400 mt-0.5">
                              {formatCurrency(s.current_month_cost)}
                            </div>
                          </div>
                        </td>

                        {/* Lần Cuối */}
                        <td className="py-3.5 px-3 text-center text-slate-300">
                          {formatDate(s.last_order_date)}
                        </td>

                        {/* Đã Trả */}
                        <td className="py-3.5 px-3 text-right font-bold text-emerald-400">
                          {formatCurrency(s.total_paid)}
                        </td>

                        {/* Còn Nợ */}
                        <td className="py-3.5 px-3 text-right">
                          {s.total_debt > 0 ? (
                            <span className="inline-block px-2.5 py-1 rounded-md text-xs font-black bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              {formatCurrency(s.total_debt)}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-bold">-</span>
                          )}
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3.5 px-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(s);
                            }}
                            className={`p-1.5 rounded-lg border transition-all ${
                              s.active_supply
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                                : "bg-slate-800/60 border-slate-700/60 text-slate-500 hover:bg-slate-800"
                            }`}
                            title={s.active_supply ? "Đang hoạt động (Bấm để ngưng)" : "Đã ngưng (Bấm để kích hoạt)"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </td>

                        {/* Thao Tác */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSupplierDetailId(s.id);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-all"
                              title="Xem chi tiết V1"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSupplier(s);
                                setFormData({
                                  supplier_name: s.supplier_name,
                                  number_bank: s.number_bank,
                                  bin_bank: s.bin_bank,
                                  account_holder: s.account_holder,
                                  active_supply: s.active_supply,
                                });
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-all"
                              title="Chỉnh sửa thông tin"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingSupplier(s);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all"
                              title="Xóa nhà cung cấp"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* EXPANDED ACCORDION ROW: COST LOGS */}
                      {isExpanded && (() => {
                        const currentPage = supplierPageMap[s.id] || 1;
                        const pageSize = supplierPageSizeMap[s.id] || 10;
                        const totalLogs = logsInfo?.logs ? logsInfo.logs.length : 0;
                        const totalPages = Math.ceil(totalLogs / pageSize) || 1;
                        const startIndex = (currentPage - 1) * pageSize;
                        const paginatedLogs = logsInfo?.logs
                          ? logsInfo.logs.slice(startIndex, startIndex + pageSize)
                          : [];

                        return (
                          <tr className="bg-slate-950/80">
                            <td colSpan={9} className="p-4 border-l-4 border-indigo-500">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="font-bold text-slate-200 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-indigo-400" />
                                    <span>LỊCH SỬ ĐƠN HÀNG & CHI PHÍ: {s.supplier_name}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                      <span>Hiển thị:</span>
                                      <select
                                        value={pageSize}
                                        onChange={(e) => {
                                          const newSize = Number(e.target.value);
                                          setSupplierPageSizeMap((prev) => ({ ...prev, [s.id]: newSize }));
                                          setSupplierPageMap((prev) => ({ ...prev, [s.id]: 1 }));
                                        }}
                                        className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500"
                                      >
                                        <option value={5}>5 đơn / trang</option>
                                        <option value={10}>10 đơn / trang</option>
                                        <option value={20}>20 đơn / trang</option>
                                      </select>
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-semibold">
                                      Tổng {totalLogs} bản ghi
                                    </span>
                                  </div>
                                </div>

                                {logsInfo?.loading ? (
                                  <div className="py-6 text-center text-slate-400 text-xs">
                                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin inline mr-2" />
                                    Đang tải lịch sử đơn hàng của nhà cung cấp...
                                  </div>
                                ) : !logsInfo?.logs || logsInfo.logs.length === 0 ? (
                                  <div className="py-6 text-center text-slate-500 italic text-xs">
                                    Chưa có lịch sử đơn hàng phát sinh cho nhà cung cấp này
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-[#080b13]">
                                      <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-900/90 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                                          <tr>
                                            <th className="py-2.5 px-3 text-center">STT</th>
                                            <th className="py-2.5 px-4">MÃ ĐƠN HÀNG</th>
                                            <th className="py-2.5 px-4 text-right">TIỀN NHẬP</th>
                                            <th className="py-2.5 px-4 text-right">TIỀN HOÀN</th>
                                            <th className="py-2.5 px-4 text-center">TRẠNG THÁI TT</th>
                                            <th className="py-2.5 px-4 text-center">NGÀY GHI NHẬN</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/40 text-slate-300 font-medium">
                                          {paginatedLogs.map((log, idx) => (
                                            <tr
                                              key={log.id}
                                              className="hover:bg-slate-900/40 transition-colors"
                                            >
                                              <td className="py-2.5 px-3 text-center text-slate-500 text-[11px]">
                                                {startIndex + idx + 1}
                                              </td>
                                              <td className="py-2.5 px-4 font-mono font-bold text-cyan-400">
                                                {log.id_order}
                                              </td>
                                              <td className="py-2.5 px-4 text-right font-bold text-slate-200">
                                                {formatCurrency(log.import_cost)}
                                              </td>
                                              <td className="py-2.5 px-4 text-right font-semibold text-amber-400">
                                                {formatCurrency(log.refund_amount)}
                                              </td>
                                              <td className="py-2.5 px-4 text-center">
                                                {log.ncc_payment_status === "Đã Thanh Toán" ? (
                                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                                                    Đã Thanh Toán
                                                  </span>
                                                ) : (
                                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20">
                                                    Chưa Thanh Toán
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-2.5 px-4 text-center text-slate-400 text-[11px]">
                                                {formatDate(log.logged_at)}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>

                                    {/* Pagination Controls Footer for Expanded Log Table */}
                                    {totalPages > 1 && (
                                      <div className="flex items-center justify-between px-2 pt-2 text-[11px] text-slate-400">
                                        <div>
                                          Hiển thị <strong>{startIndex + 1} - {Math.min(startIndex + pageSize, totalLogs)}</strong> trên {totalLogs} đơn
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <button
                                            onClick={() =>
                                              setSupplierPageMap((prev) => ({
                                                ...prev,
                                                [s.id]: Math.max(1, currentPage - 1),
                                              }))
                                            }
                                            disabled={currentPage <= 1}
                                            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 font-semibold"
                                          >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                            <span>Trước</span>
                                          </button>

                                          <span className="text-slate-300 font-bold px-1">
                                            {currentPage} / {totalPages}
                                          </span>

                                          <button
                                            onClick={() =>
                                              setSupplierPageMap((prev) => ({
                                                ...prev,
                                                [s.id]: Math.min(totalPages, currentPage + 1),
                                              }))
                                            }
                                            disabled={currentPage >= totalPages}
                                            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1 font-semibold"
                                          >
                                            <span>Sau</span>
                                            <ChevronRight className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* V1 MODAL: CHI TIẾT NHÀ CUNG CẤP */}
      {selectedSupplierDetailId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl bg-[#0e1320] border border-slate-800/90 rounded-2xl p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Chi tiết Nhà Cung Cấp
              </h2>
              <button
                onClick={() => setSelectedSupplierDetailId(null)}
                className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail || !supplierDetail ? (
              <div className="py-16 text-center text-slate-400">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin inline mr-2" />
                Đang tải dữ liệu chi tiết Nhà cung cấp V1...
              </div>
            ) : (
              <div className="space-y-5 text-xs">
                {/* Top Grid: Thông Tin Chung & Tổng Quan Thanh Toán */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card Left: THÔNG TIN CHUNG */}
                  <div className="bg-[#121829]/90 border border-slate-800/80 rounded-xl p-4 space-y-3 shadow-inner">
                    <div className="text-[10.5px] font-bold text-indigo-400 uppercase tracking-wider mb-2">
                      THÔNG TIN CHUNG
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Tên NCC</span>
                      <span className="font-bold text-white text-sm">{supplierDetail.general_info.supplier_name}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Ngân hàng</span>
                      <span className="font-semibold text-slate-200">{supplierDetail.general_info.bank_name}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Số tài khoản</span>
                      <span className="font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-md">
                        {supplierDetail.general_info.number_bank || "Chưa cập nhật"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-400">Trạng thái</span>
                      <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md uppercase">
                        {supplierDetail.general_info.active_supply ? "ĐANG HOẠT ĐỘNG" : "NGƯNG HỢP TÁC"}
                      </span>
                    </div>
                  </div>

                  {/* Card Right: TỔNG QUAN THANH TOÁN */}
                  <div className="bg-[#121829]/90 border border-slate-800/80 rounded-xl p-4 shadow-inner space-y-3">
                    <div className="text-[10.5px] font-bold text-purple-400 uppercase tracking-wider mb-2">
                      TỔNG QUAN THANH TOÁN
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">ĐÃ TRẢ</div>
                        <div className="text-sm font-black text-slate-100 mt-1">
                          {formatCurrency(supplierDetail.payment_overview.total_paid)}
                        </div>
                      </div>

                      <div className="bg-slate-950/70 border border-amber-500/30 rounded-xl p-3">
                        <div className="text-[10px] font-bold text-amber-400 uppercase">CÒN NỢ</div>
                        <div className="text-sm font-black text-amber-300 mt-1">
                          {formatCurrency(supplierDetail.payment_overview.remaining_debt)}
                        </div>
                      </div>

                      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">HOÀN TIỀN</div>
                        <div className="text-sm font-black text-rose-400 mt-1">
                          {formatCurrency(supplierDetail.payment_overview.refund_amount)}
                        </div>
                      </div>

                      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">NỢ ĐƠN</div>
                        <div className="text-sm font-black text-slate-100 mt-1">
                          {supplierDetail.payment_overview.unpaid_orders_count}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle Row: 4 Mini Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#121829]/90 border border-slate-800/80 rounded-xl p-3.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Tổng đơn</div>
                    <div className="text-xl font-black text-white mt-1">
                      {supplierDetail.order_stats.total_orders}
                    </div>
                  </div>

                  <div className="bg-[#121829]/90 border border-slate-800/80 rounded-xl p-3.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Đã thanh toán</div>
                    <div className="text-xl font-black text-emerald-400 mt-1">
                      {supplierDetail.order_stats.paid_orders}
                    </div>
                  </div>

                  <div className="bg-[#121829]/90 border border-slate-800/80 rounded-xl p-3.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Chưa thanh toán</div>
                    <div className="text-xl font-black text-amber-400 mt-1">
                      {supplierDetail.order_stats.unpaid_orders}
                    </div>
                  </div>

                  <div className="bg-[#121829]/90 border border-slate-800/80 rounded-xl p-3.5">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Đã hủy</div>
                    <div className="text-xl font-black text-rose-400 mt-1">
                      {supplierDetail.order_stats.canceled_orders}
                    </div>
                  </div>
                </div>

                {/* Bottom Grid: Chu kỳ chưa thanh toán & Đơn theo tháng */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Bottom Left Panel: CHU KỲ CHƯA THANH TOÁN */}
                  <div className="bg-[#121829]/90 border border-slate-800/80 rounded-xl p-4 shadow-inner space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[10.5px] font-bold text-cyan-400 uppercase tracking-wider">
                        CHU KỲ CHƯA THANH TOÁN
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Cần chi <strong className="text-amber-400">{formatCurrency(supplierDetail.unpaid_cycle.amount_needed)}</strong> | Hoàn về shop <strong className="text-emerald-400">{formatCurrency(supplierDetail.unpaid_cycle.refund_to_shop)}</strong>
                    </div>

                    {/* Payment Box */}
                    <div className="bg-[#0b0f19] border border-indigo-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-md">
                      <div>
                        <div className="font-bold text-slate-200">
                          Công nợ theo đơn: <strong className="text-amber-300">{formatCurrency(supplierDetail.unpaid_cycle.debt_by_order)}</strong>
                        </div>
                        <div className="text-[10.5px] text-slate-400 mt-1 flex items-center gap-2">
                          <span className="text-rose-400 font-bold uppercase">{supplierDetail.unpaid_cycle.payment_status}</span>
                          <span>•</span>
                          <span>ĐÃ TRẢ: {formatCurrency(supplierDetail.unpaid_cycle.amount_paid)}</span>
                        </div>
                      </div>

                      {supplierDetail.unpaid_cycle.amount_needed > 0 && (
                        <button
                          onClick={handlePayDebtSubmit}
                          disabled={submitting}
                          className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 shrink-0"
                        >
                          {submitting ? "Đang xử lý..." : "Thanh toán"}
                        </button>
                      )}
                    </div>

                    {/* STK CHI TRẢ Dropdown */}
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-400 uppercase mb-1">STK CHI TRẢ</label>
                      <select className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
                        {supplierDetail.unpaid_cycle.shop_bank_accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* VietQR Image */}
                    {supplierDetail.unpaid_cycle.vietqr_url && (
                      <div className="pt-2 text-center">
                        <div className="bg-white p-3 rounded-xl inline-block shadow-lg border border-slate-700 max-w-[220px]">
                          <img
                            src={supplierDetail.unpaid_cycle.vietqr_url}
                            alt="VietQR Payment"
                            className="w-full h-auto object-contain rounded-lg"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Right Panel: ĐƠN THEO THÁNG */}
                  <div className="bg-[#121829]/90 border border-slate-800/80 rounded-xl p-4 shadow-inner space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[10.5px] font-bold text-indigo-400 uppercase tracking-wider">
                        ĐƠN THEO THÁNG
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {supplierDetail.monthly_orders.length} tháng
                      </span>
                    </div>

                    <div className="space-y-2">
                      {supplierDetail.monthly_orders.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 italic">
                          Chưa có đơn phát sinh theo tháng
                        </div>
                      ) : (
                        supplierDetail.monthly_orders.map((m, i) => (
                          <div
                            key={i}
                            className="bg-slate-950/70 border border-slate-800/60 rounded-xl p-3 flex items-center justify-between hover:bg-slate-900/60 transition-colors"
                          >
                            <span className="font-bold text-slate-200">{m.month}</span>
                            <span className="font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-lg">
                              {m.count} đơn
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-800 text-xs">
              <button
                onClick={() => setSelectedSupplierDetailId(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE SUPPLIER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                Thêm Nhà Cung Cấp Mới
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
                <label className="block text-slate-400 mb-1 font-semibold">Tên Nhà Cung Cấp *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: @rocky_VIVA"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Số Tài Khoản / Liên Hệ</label>
                <input
                  type="text"
                  placeholder="VD: 0966754017"
                  value={formData.number_bank}
                  onChange={(e) => setFormData({ ...formData, number_bank: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Mã Ngân Hàng (Bin Bank)</label>
                  <input
                    type="text"
                    placeholder="VD: 970422"
                    value={formData.bin_bank}
                    onChange={(e) => setFormData({ ...formData, bin_bank: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Tên Chủ Tài Khoản</label>
                  <input
                    type="text"
                    placeholder="VD: LA VAN HOP"
                    value={formData.account_holder}
                    onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
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

      {/* EDIT SUPPLIER MODAL */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-400" />
                Cập Nhật Nhà Cung Cấp
              </h2>
              <button
                onClick={() => setEditingSupplier(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Tên Nhà Cung Cấp *</label>
                <input
                  type="text"
                  required
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Số Tài Khoản / Liên Hệ</label>
                <input
                  type="text"
                  value={formData.number_bank}
                  onChange={(e) => setFormData({ ...formData, number_bank: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Mã Ngân Hàng (Bin Bank)</label>
                  <input
                    type="text"
                    value={formData.bin_bank}
                    onChange={(e) => setFormData({ ...formData, bin_bank: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Tên Chủ Tài Khoản</label>
                  <input
                    type="text"
                    value={formData.account_holder}
                    onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
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
      {deletingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-bold text-white">Xác Nhận Xóa Nhà Cung Cấp</h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa nhà cung cấp <strong className="text-white">{deletingSupplier.supplier_name}</strong>? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setDeletingSupplier(null)}
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
                {submitting ? "Đang xóa..." : "Xóa Nhà Cung Cấp"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
