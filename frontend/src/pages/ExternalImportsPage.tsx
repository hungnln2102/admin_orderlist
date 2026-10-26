import React, { useState, useEffect, useCallback } from "react";
import {
  PackagePlus,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  FileText,
  Eye,
  Trash2,
  Edit3,
  Coffee,
  Boxes,
  Receipt,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Tag,
  Landmark,
  ChevronDown,
} from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";

interface PaymentAccount {
  id: number;
  label: string;
  accountNumber: string;
  accountHolder?: string | null;
  bankBin?: string | null;
  bankShortCode?: string | null;
  bankDisplayName?: string | null;
  accountType: string;
  accountScope?: string;
  balance: number;
  isDefault?: boolean;
}

interface StoreExpenseItem {
  id: number;
  amount: number;
  reason: string;
  expenseType: "external_import" | "monthly_expense" | "mavn_import" | "withdraw_profit" | string;
  expenseDate: string;
  linkedOrderCode: string | null;
  expenseMeta: any;
  paymentReceiptId: number | null;
  shopBankAccountId: number | null;
  bankAccountLabel: string | null;
  bankAccountNumber: string | null;
  bankShortCode: string | null;
  bankDisplayName: string | null;
  bankAccountScope?: string | null;
  receiptReferenceCode: string | null;
  status: string;
  createdAt: string;
}

interface ExpenseStats {
  totalAmount: number;
  externalImportTotal: number;
  externalImportShopTotal?: number;
  monthlyExpenseTotal: number;
  totalCount: number;
}

export const ExternalImportsPage: React.FC = () => {
  const notify = useNotification();

  // Filter States
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [activeTab, setActiveTab] = useState<"all" | "external_import" | "monthly_expense">("all");
  const [search, setSearch] = useState<string>("");

  // Data States
  const [items, setItems] = useState<StoreExpenseItem[]>([]);
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [stats, setStats] = useState<ExpenseStats>({
    totalAmount: 0,
    externalImportTotal: 0,
    monthlyExpenseTotal: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [activeItem, setActiveItem] = useState<StoreExpenseItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    amount: "",
    expense_type: "external_import" as "external_import" | "monthly_expense",
    expense_date: new Date().toISOString().split("T")[0],
    reason: "",
    linked_order_code: "",
    shop_bank_account_id: "",
  });

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/store-profit-expenses/accounts");
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && json.items) {
        setAccounts(json.items);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách tài khoản:", err);
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: selectedMonth,
        type: activeTab,
        limit: "100",
      });
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(`/api/store-profit-expenses?${params.toString()}`);
      if (!res.ok) throw new Error("Không thể tải danh sách chi phí");
      const json = await res.json();
      if (json.success) {
        setItems(json.data || []);
        if (json.stats) setStats(json.stats);
      }
    } catch (err: any) {
      notify.error(err.message || "Lỗi khi tải dữ liệu chi phí", "Thất Bại");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, activeTab, search, notify]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleRefresh = () => {
    fetchAccounts();
    fetchExpenses();
    notify.success("Đã làm mới dữ liệu chi phí và tài khoản nguồn!", "Thành Công");
  };

  const openCreateModal = () => {
    // Ưu tiên chọn tài khoản mặc định nếu có
    const defaultAcc = accounts.find((a) => a.isDefault);
    setFormData({
      amount: "",
      expense_type: activeTab === "monthly_expense" ? "monthly_expense" : "external_import",
      expense_date: new Date().toISOString().split("T")[0],
      reason: "",
      linked_order_code: "",
      shop_bank_account_id: defaultAcc ? String(defaultAcc.id) : "",
    });
    setCreateModalOpen(true);
  };

  const openEditModal = (item: StoreExpenseItem) => {
    setActiveItem(item);
    setFormData({
      amount: item.amount.toLocaleString("vi-VN"),
      expense_type: ["external_import", "mavn_import"].includes(item.expenseType)
        ? "external_import"
        : "monthly_expense",
      expense_date: item.expenseDate,
      reason: item.reason || "",
      linked_order_code: item.linkedOrderCode || "",
      shop_bank_account_id: item.shopBankAccountId ? String(item.shopBankAccountId) : "",
    });
    setEditModalOpen(true);
  };

  const openDetailModal = (item: StoreExpenseItem) => {
    setActiveItem(item);
    setDetailModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(formData.amount.replace(/\D/g, "")) || 0;
    if (amountNum <= 0) {
      notify.error("Vui lòng nhập số tiền hợp lệ (> 0 ₫)", "Lỗi Form");
      return;
    }
    if (!formData.reason.trim()) {
      notify.error("Vui lòng nhập lý do / diễn giải chi phí", "Lỗi Form");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/store-profit-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          expense_type: formData.expense_type,
          expense_date: formData.expense_date,
          reason: formData.reason.trim(),
          linked_order_code: formData.linked_order_code.trim() || null,
          shop_bank_account_id: formData.shop_bank_account_id ? Number(formData.shop_bank_account_id) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Tạo bản ghi thất bại");

      const acc = accounts.find((a) => String(a.id) === formData.shop_bank_account_id);
      const accText = acc ? ` (Đã trừ ví ${acc.bankShortCode || acc.label})` : " (Tiền mặt)";

      notify.success(
        `Đã ghi nhận ${formData.expense_type === "external_import" ? "nhập ngoài luồng" : "chi phí tháng"}: ${amountNum.toLocaleString("vi-VN")} ₫${accText}`,
        "Ghi Nhận Thành Công"
      );
      setCreateModalOpen(false);
      fetchAccounts();
      fetchExpenses();
    } catch (err: any) {
      notify.error(err.message || "Lỗi khi tạo chi phí", "Thất Bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    const amountNum = Number(formData.amount.replace(/\D/g, "")) || 0;
    if (amountNum <= 0) {
      notify.error("Số tiền phải lớn hơn 0 ₫", "Lỗi Form");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/store-profit-expenses/${activeItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          expense_type: formData.expense_type,
          expense_date: formData.expense_date,
          reason: formData.reason.trim(),
          linked_order_code: formData.linked_order_code.trim() || null,
          shop_bank_account_id: formData.shop_bank_account_id ? Number(formData.shop_bank_account_id) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Cập nhật thất bại");

      notify.success("Đã cập nhật bản ghi thành công!", "Thành Công");
      setEditModalOpen(false);
      fetchExpenses();
    } catch (err: any) {
      notify.error(err.message || "Lỗi khi cập nhật chi phí", "Thất Bại");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: StoreExpenseItem) => {
    if (!window.confirm(`Xác nhận xóa bản ghi chi phí "${item.reason}" (${item.amount.toLocaleString("vi-VN")} ₫)?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/store-profit-expenses/${item.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Xóa thất bại");

      notify.success("Đã xóa bản ghi chi phí thành công!", "Đã Xóa");
      fetchExpenses();
    } catch (err: any) {
      notify.error(err.message || "Lỗi khi xóa chi phí", "Thất Bại");
    }
  };

  const formatVND = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  const selectedAccount = accounts.find((a) => String(a.id) === formData.shop_bank_account_id);

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1650px] mx-auto font-sans text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-amber-500/20 to-orange-500/10 text-amber-400 rounded-xl border border-amber-500/30 shadow-inner">
            <PackagePlus className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                Kế Toán & Chi Tiêu
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Khấu Trừ Số Dư Ngân Hàng
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide mt-1">
              Quản Trị Chi Phí & Nhập Ngoài Luồng
            </h1>
            <p className="text-xs text-slate-400">
              Ghi nhận chi phí ôm lô hàng (trừ vào LN ngày), chi tiêu tháng và chọn trừ trực tiếp tài khoản ngân hàng Shop
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bộ chọn Tháng */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/80 text-xs">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleRefresh}
            title="Làm mới"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Thêm Bản Ghi Mới</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Tổng Chi Tiêu Tháng */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800/80 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Tổng Chi Phí Tháng {selectedMonth.slice(5)}/{selectedMonth.slice(0, 4)}
            </span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-400 tracking-tight">
              {formatVND(stats.totalAmount)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span>Đã ghi nhận {stats.totalCount} khoản chi trong tháng</span>
            </div>
          </div>
        </div>

        {/* Card 2: Nhập ngoài luồng */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-cyan-500/20 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              Chi Phí Nhập Ngoài Luồng
            </span>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-cyan-400 tracking-tight">
              {formatVND(stats.externalImportTotal)}
            </div>
            <div className="text-[11px] text-slate-300 mt-1 flex flex-col gap-0.5">
              <span className="text-emerald-400 font-medium">
                🏦 TK Shop (Có BĐ Tháng): {formatVND(stats.externalImportShopTotal || 0)}
              </span>
              <span className="text-slate-400">
                💵 Ví Cá Nhân (Ko BĐ Tháng): {formatVND(Math.max(0, stats.externalImportTotal - (stats.externalImportShopTotal || 0)))}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Chi phí biến đổi & sinh hoạt */}
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-amber-500/20 backdrop-blur-md shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              Chi Phí Biến Đổi & Sinh Hoạt
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-400 tracking-tight">
              {formatVND(stats.monthlyExpenseTotal)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              <span>Ăn uống, cafe, sinh hoạt, vận hành ngẫu nhiên</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl border border-slate-800 w-fit">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "all"
                ? "bg-slate-800 text-white shadow-md border border-slate-700/80"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Tất Cả Khoản Chi</span>
            <span className="px-1.5 py-0.2 bg-slate-700/60 rounded text-[10px]">
              {stats.totalCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("external_import")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "external_import"
                ? "bg-cyan-500/20 text-cyan-300 shadow-md border border-cyan-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-cyan-400" />
            <span>Nhập Ngoài Luồng</span>
          </button>

          <button
            onClick={() => setActiveTab("monthly_expense")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "monthly_expense"
                ? "bg-amber-500/20 text-amber-300 shadow-md border border-amber-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Coffee className="w-3.5 h-3.5 text-amber-400" />
            <span>Chi Phí Biến Đổi Tháng</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo lý do, mã trace, tài khoản..."
            className="w-full bg-slate-900/80 pl-10 pr-4 py-2 rounded-xl border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <span className="text-xs text-slate-400">Đang tải dữ liệu chi phí...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-500">
              <PackagePlus className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Chưa Có Khoản Chi Phí Nào Trong Tháng {selectedMonth}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
              Bạn có thể ghi nhận đợt nhập hàng ngoài luồng mới hoặc ghi chi phí ăn uống, vận hành phát sinh trong tháng.
            </p>
            <button
              onClick={openCreateModal}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Ghi Nhận Khoản Chi Đầu Tiên</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Ngày Chi Phí</th>
                  <th className="py-3.5 px-4">Phân Loại</th>
                  <th className="py-3.5 px-4 text-right">Số Tiền</th>
                  <th className="py-3.5 px-4">Lý Do / Diễn Giải</th>
                  <th className="py-3.5 px-4">Mã Trace / Đơn Hàng</th>
                  <th className="py-3.5 px-4">Tài Khoản Chi / Nguồn Tiền</th>
                  <th className="py-3.5 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {items.map((item) => {
                  const isExternal = ["external_import", "mavn_import"].includes(item.expenseType);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Ngày Chi Phí */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{item.expenseDate}</span>
                        </div>
                      </td>

                      {/* Phân Loại */}
                      <td className="py-3.5 px-4">
                        {isExternal ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <Boxes className="w-3 h-3" />
                            Nhập Ngoài Luồng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Coffee className="w-3 h-3" />
                            Chi Phí Tháng
                          </span>
                        )}
                      </td>

                      {/* Số Tiền */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-400">
                        -{formatVND(item.amount)}
                      </td>

                      {/* Lý Do */}
                      <td className="py-3.5 px-4 max-w-[280px] truncate text-slate-300 font-medium" title={item.reason}>
                        {item.reason || "—"}
                      </td>

                      {/* Mã Trace / Đơn hàng */}
                      <td className="py-3.5 px-4">
                        {item.linkedOrderCode ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] font-semibold bg-slate-800 border border-slate-700 text-sky-400">
                            <Tag className="w-3 h-3" />
                            {item.linkedOrderCode}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Nguồn Chi / Tài khoản */}
                      <td className="py-3.5 px-4 text-slate-300 text-[11px]">
                        {item.shopBankAccountId && item.bankAccountNumber ? (
                          item.bankAccountScope === "SHOP" ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-medium">
                              <Landmark className="w-3.5 h-3.5 text-indigo-400" />
                              <span>{item.bankShortCode || item.bankAccountLabel || "Ngân hàng"}</span>
                              <span className="text-slate-400 font-mono text-[10px]">({item.bankAccountNumber})</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/30 text-indigo-200 font-semibold uppercase ml-1">
                                TK Shop: Có BĐ
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                              <Landmark className="w-3.5 h-3.5 text-slate-400" />
                              <span>{item.bankShortCode || item.bankAccountLabel || "Ví cá nhân"}</span>
                              <span className="text-slate-400 font-mono text-[10px]">({item.bankAccountNumber})</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-700 text-slate-400 font-semibold ml-1">
                                Ví Cá Nhân (Ko BĐ)
                              </span>
                            </div>
                          )
                        ) : item.paymentReceiptId ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-mono">
                            <Receipt className="w-3.5 h-3.5" />
                            Biên lai #{item.paymentReceiptId}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-400 italic text-[11px]">
                            💵 Tiền mặt / Ví cá nhân (Không BĐ)
                          </span>
                        )}
                      </td>

                      {/* Thao Tác */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openDetailModal(item)}
                            title="Xem chi tiết"
                            className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => openEditModal(item)}
                            title="Chỉnh sửa"
                            className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(item)}
                            title="Xóa bản ghi"
                            className="p-1.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tạo Mới */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                  <PackagePlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Ghi Nhận Khoản Chi Mới</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-4 space-y-4 text-xs">
              {/* Phân loại */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Phân Loại Chi Phí</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, expense_type: "external_import" })}
                    className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      formData.expense_type === "external_import"
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                        : "bg-slate-800/80 text-slate-400 border-slate-700/60"
                    }`}
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>Nhập Ngoài Luồng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, expense_type: "monthly_expense" })}
                    className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      formData.expense_type === "monthly_expense"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-slate-800/80 text-slate-400 border-slate-700/60"
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    <span>Chi Phí Tháng</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {formData.expense_type === "external_import"
                    ? "💡 Khoản chi này sẽ được trừ trực tiếp vào Lợi Nhuận của đúng ngày phát sinh."
                    : "💡 Khoản chi sinh hoạt, ăn uống, tiếp khách, sửa xe... trong tháng."}
                </p>
              </div>

              {/* TÀI KHOẢN CHI TIỀN (TRỪ SỐ DƯ) */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tài Khoản Chi Tiền (Khấu Trừ Số Dư)</span>
                  </span>
                  {selectedAccount && (
                    <span className="text-emerald-400 font-mono text-[11px] font-bold">
                      Số dư: {formatVND(selectedAccount.balance)}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <select
                    value={formData.shop_bank_account_id}
                    onChange={(e) => setFormData({ ...formData, shop_bank_account_id: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-cyan-500 cursor-pointer appearance-none pr-8"
                  >
                    <option value="">💵 Tiền mặt / Ví cá nhân (Không tính biến động tháng của Shop)</option>
                    {accounts.map((acc) => {
                      const isShop = acc.accountScope === "SHOP";
                      return (
                        <option key={acc.id} value={acc.id}>
                          {isShop ? "🏦" : "💼"} {acc.bankShortCode || acc.label} — {acc.accountNumber} ({formatVND(acc.balance)}) {isShop ? "[Tài Khoản Shop: Có Biến Động Tháng]" : "[Ví Cá Nhân: Không Biến Động]"}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>

                {/* Ghi chú trực quan về biến động tháng theo chỉ đạo Master */}
                <div className="mt-2 p-2 rounded-xl border text-[11px] space-y-1 bg-slate-950/60 border-slate-800">
                  {selectedAccount?.accountScope === "SHOP" ? (
                    <div className="flex items-start gap-1.5 text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>
                        Khoản chi này dùng <b>Tài Khoản Shop</b>: Trừ trực tiếp két tiền Shop, tính vào chi phí nhập tháng và phát thông báo <b>Biến Động Tháng</b>.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5 text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-400" />
                      <span>
                        Khoản chi này dùng <b>Ví cá nhân / Tiền mặt</b>: Két tiền của Shop không bị trừ, <b>không tính biến động tháng</b> của Shop.
                      </span>
                    </div>
                  )}
                </div>

                {selectedAccount && Number(formData.amount.replace(/\D/g, "")) > selectedAccount.balance && (
                  <div className="mt-1.5 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Cảnh báo: Số tiền chi vượt quá số dư khả dụng ({formatVND(selectedAccount.balance)})!</span>
                  </div>
                )}
              </div>

              {/* Số tiền */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Số Tiền (₫) *</label>
                <input
                  type="text"
                  required
                  value={formData.amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setFormData({
                      ...formData,
                      amount: raw ? Number(raw).toLocaleString("vi-VN") : "",
                    });
                  }}
                  placeholder="Ví dụ: 500.000"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Ngày chi phí */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Ngày Phát Sinh Chi Phí *</label>
                <input
                  type="date"
                  required
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Lý do */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Lý Do / Diễn Giải *</label>
                <input
                  type="text"
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Ví dụ: Nhập sỉ 10 acc Youtube MAVN, Ăn trưa tiếp khách..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Mã trace / Đơn hàng */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Mã Trace / Đơn Hàng (Nếu có)</label>
                <input
                  type="text"
                  value={formData.linked_order_code}
                  onChange={(e) => setFormData({ ...formData, linked_order_code: e.target.value })}
                  placeholder="Ví dụ: MAVNMB3ZK, IMP-101..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lưu Khoản Chi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chỉnh Sửa */}
      {editModalOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Chỉnh Sửa Bản Ghi #{activeItem.id}</h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 space-y-4 text-xs">
              {/* Phân loại */}
              <div>
                <label className="block text-slate-400 mb-1.5 font-semibold">Phân Loại Chi Phí</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, expense_type: "external_import" })}
                    className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      formData.expense_type === "external_import"
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                        : "bg-slate-800/80 text-slate-400 border-slate-700/60"
                    }`}
                  >
                    <Boxes className="w-3.5 h-3.5" />
                    <span>Nhập Ngoài Luồng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, expense_type: "monthly_expense" })}
                    className={`py-2 px-3 rounded-xl border text-center font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      formData.expense_type === "monthly_expense"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-slate-800/80 text-slate-400 border-slate-700/60"
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    <span>Chi Phí Tháng</span>
                  </button>
                </div>
              </div>

              {/* Tài khoản chi */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Tài Khoản Chi Tiền (Khấu Trừ Số Dư)</label>
                <select
                  value={formData.shop_bank_account_id}
                  onChange={(e) => setFormData({ ...formData, shop_bank_account_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="">💵 Tiền mặt / Ví cá nhân (Không tính biến động tháng của Shop)</option>
                  {accounts.map((acc) => {
                    const isShop = acc.accountScope === "SHOP";
                    return (
                      <option key={acc.id} value={acc.id}>
                        {isShop ? "🏦" : "💼"} {acc.bankShortCode || acc.label} — {acc.accountNumber} ({formatVND(acc.balance)}) {isShop ? "[Tài Khoản Shop: Có Biến Động Tháng]" : "[Ví Cá Nhân: Không Biến Động]"}
                      </option>
                    );
                  })}
                </select>

                <div className="mt-2 p-2 rounded-xl border text-[11px] space-y-1 bg-slate-950/60 border-slate-800">
                  {selectedAccount?.accountScope === "SHOP" ? (
                    <div className="flex items-start gap-1.5 text-amber-400">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>
                        Tài khoản này là <b>Tài Khoản Shop</b>: Có tính biến động tháng, trừ két tiền Shop và phát thông báo Telegram.
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5 text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-400" />
                      <span>
                        Tài khoản này là <b>Ví cá nhân / Tiền mặt</b>: Không trừ két tiền Shop và <b>không tính biến động tháng</b>.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Số tiền */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Số Tiền (₫) *</label>
                <input
                  type="text"
                  required
                  value={formData.amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setFormData({
                      ...formData,
                      amount: raw ? Number(raw).toLocaleString("vi-VN") : "",
                    });
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Ngày */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Ngày Phát Sinh *</label>
                <input
                  type="date"
                  required
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Lý do */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Lý Do / Diễn Giải *</label>
                <input
                  type="text"
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Mã trace */}
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Mã Trace / Đơn Hàng</label>
                <input
                  type="text"
                  value={formData.linked_order_code}
                  onChange={(e) => setFormData({ ...formData, linked_order_code: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-bold rounded-xl shadow-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lưu Thay Đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Chi Tiết */}
      {detailModalOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl text-xs">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-800 text-cyan-400 rounded-lg">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white">Chi Tiết Bản Ghi #{activeItem.id}</h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Phân Loại:</span>
                <span className="font-semibold text-white">
                  {["external_import", "mavn_import"].includes(activeItem.expenseType)
                    ? "Nhập Nguồn Hàng Ngoài Luồng"
                    : "Chi Phí Biến Đổi / Sinh Hoạt"}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Số Tiền:</span>
                <span className="font-mono font-bold text-rose-400 text-sm">
                  -{formatVND(activeItem.amount)}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Ngày Chi Phí:</span>
                <span className="font-mono text-slate-200">{activeItem.expenseDate}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Tài Khoản Chi / Nguồn Tiền:</span>
                <span className="font-semibold text-emerald-400">
                  {activeItem.shopBankAccountId && activeItem.bankAccountNumber ? (
                    activeItem.bankAccountScope === "SHOP" ? (
                      <span className="text-indigo-300">
                        🏦 {activeItem.bankShortCode || activeItem.bankAccountLabel} ({activeItem.bankAccountNumber}) — [TK Shop: Có BĐ Tháng]
                      </span>
                    ) : (
                      <span className="text-slate-300">
                        💼 {activeItem.bankShortCode || activeItem.bankAccountLabel} ({activeItem.bankAccountNumber}) — [Ví Cá Nhân: Ko BĐ Tháng]
                      </span>
                    )
                  ) : activeItem.paymentReceiptId ? (
                    `🧾 Biên lai #${activeItem.paymentReceiptId}`
                  ) : (
                    <span className="text-slate-400">💵 Tiền mặt / Ví cá nhân (Không BĐ Tháng)</span>
                  )}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Mã Trace / Đơn Hàng:</span>
                <span className="font-mono text-cyan-400">{activeItem.linkedOrderCode || "—"}</span>
              </div>

              <div className="py-1.5">
                <span className="text-slate-400 block mb-1">Lý Do / Diễn Giải:</span>
                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-200 font-medium">
                  {activeItem.reason || "—"}
                </div>
              </div>

              {activeItem.expenseMeta && (
                <div className="py-1.5">
                  <span className="text-slate-400 block mb-1">Metadata Kỹ Thuật:</span>
                  <pre className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[10px] text-cyan-300 overflow-x-auto">
                    {JSON.stringify(activeItem.expenseMeta, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalImportsPage;
