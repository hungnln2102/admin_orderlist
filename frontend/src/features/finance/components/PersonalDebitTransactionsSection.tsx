import React, { useCallback, useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { formatVND } from "@/shared/utils";
import { useNotification } from "@/shared/context/NotificationContext";
import {
  PersonalFinancialAccount,
  PersonalSpendingCategory,
  PersonalDebitTransactionLog,
} from "../types";
import {
  ArrowUpDown,
  Calendar,
  CreditCard,
  Filter,
  Plus,
  Search,
  Settings,
  TrendingDown,
  TrendingUp,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Inbox,
  ChevronDown,
} from "lucide-react";
import {
  PersonalCategoryManageModal,
  renderCategoryIcon,
  COLOR_OPTIONS,
} from "./PersonalCategoryManageModal";
import { PersonalTransactionCreateModal } from "./PersonalTransactionCreateModal";

interface Props {
  selectedDate: string | null;
  onClearDateFilter: () => void;
  isFrameless?: boolean;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(body?.message || body?.error || "Kh\u00f4ng th\u1ec3 t\u1ea3i d\u1eef li\u1ec7u giao d\u1ecbch c\u00e1 nh\u00e2n");
  }
  return body.data as T;
}

export const PersonalDebitTransactionsSection: React.FC<Props> = ({
  selectedDate,
  onClearDateFilter,
  isFrameless = false,
}) => {
  const notify = useNotification();

  const [categories, setCategories] = useState<PersonalSpendingCategory[]>([]);
  const [transactions, setTransactions] = useState<PersonalDebitTransactionLog[]>([]);
  const [accounts, setAccounts] = useState<PersonalFinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const month = selectedDate ? selectedDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
      const data = await request<{
        accounts: PersonalFinancialAccount[];
        categories: PersonalSpendingCategory[];
        transactions: PersonalDebitTransactionLog[];
      }>(`/api/finance/personal-debit-transactions?month=${encodeURIComponent(month)}`);
      setAccounts(data.accounts);
      setCategories(data.categories);
      setTransactions(data.transactions);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Không thể tải giao dịch cá nhân");
    } finally {
      setLoading(false);
    }
  }, [notify, selectedDate]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);
  // Modals state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Filter states
  const [accountFilter, setAccountFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [directionFilter, setDirectionFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Inline Category Switch state (txId -> open menu)
  const [openDropdownTxId, setOpenDropdownTxId] = useState<number | null>(null);

  const handleQuickChangeCategory = async (txId: number, targetCategory: PersonalSpendingCategory) => {
    try {
      const updated = await request<PersonalDebitTransactionLog>(`/api/finance/personal-debit-transactions/${txId}/category`, {
        method: "PATCH",
        body: JSON.stringify({ categoryId: targetCategory.id }),
      });
      setTransactions((previous) => previous.map((item) => (item.id === txId ? updated : item)));
      setOpenDropdownTxId(null);
      notify.success(`Đã đổi danh mục sang "${targetCategory.name}"`);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Không thể đổi danh mục");
    }
  };

  const handleAddTransaction = async (payload: {
    financialAccountId: number;
    direction: "INFLOW" | "OUTFLOW";
    amount: number;
    merchantNormalized: string;
    categoryId: number | null;
    occurredAt: string;
    note?: string;
  }) => {
    await request<{ transaction: PersonalDebitTransactionLog }>("/api/finance/personal-debit-transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await loadWorkspace();
  };

  const handleSaveCategories = async (updated: PersonalSpendingCategory[]) => {
    const currentById = new Map(categories.map((category) => [category.id, category]));
    const updatedIds = new Set(updated.map((category) => category.id));
    try {
      for (const category of updated) {
        const current = currentById.get(category.id);
        if (!current) {
          await request<PersonalSpendingCategory>("/api/finance/personal-spending-categories", {
            method: "POST",
            body: JSON.stringify(category),
          });
        } else if (JSON.stringify({ ...current, createdAt: undefined, updatedAt: undefined }) !== JSON.stringify({ ...category, createdAt: undefined, updatedAt: undefined })) {
          await request<PersonalSpendingCategory>(`/api/finance/personal-spending-categories/${category.id}`, {
            method: "PUT",
            body: JSON.stringify(category),
          });
        }
      }
      for (const category of categories) {
        if (!updatedIds.has(category.id)) {
          await request<PersonalSpendingCategory>(`/api/finance/personal-spending-categories/${category.id}`, { method: "DELETE" });
        }
      }
      await loadWorkspace();
      return true;
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Không thể lưu danh mục");
      return false;
    }
  };
  // Lọc giao dịch
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Lọc theo ngày chốt được click ở bảng bên trái
      if (selectedDate) {
        const txDate = tx.occurredAt.slice(0, 10);
        if (txDate !== selectedDate) return false;
      }

      // 2. Lọc theo thẻ/tài khoản
      if (accountFilter !== "ALL") {
        if (String(tx.financialAccountId) !== accountFilter && !tx.financialAccountName?.includes(accountFilter)) {
          return false;
        }
      }

      // 3. Lọc theo danh mục
      if (categoryFilter !== "ALL") {
        if (tx.categoryCode !== categoryFilter && String(tx.categoryId) !== categoryFilter) {
          return false;
        }
      }

      // 4. Lọc theo chiều thu/chi
      if (directionFilter !== "ALL") {
        if (tx.direction !== directionFilter) return false;
      }

      // 5. Tìm kiếm từ khóa merchant / note
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const m = (tx.merchantNormalized || "").toLowerCase();
        const n = (tx.note || "").toLowerCase();
        const cat = (tx.categoryName || "").toLowerCase();
        if (!m.includes(q) && !n.includes(q) && !cat.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, selectedDate, accountFilter, categoryFilter, directionFilter, searchQuery]);

  // Tính toán Mini-KPI
  const { totalInflow, totalOutflow, netCashflow } = useMemo(() => {
    let inSum = 0;
    let outSum = 0;
    for (const t of filteredTransactions) {
      if (t.direction === "INFLOW") inSum += t.amount;
      else outSum += t.amount;
    }
    return {
      totalInflow: inSum,
      totalOutflow: outSum,
      netCashflow: inSum - outSum,
    };
  }, [filteredTransactions]);

  const formatDateVN = (dateStr?: string) => {
    if (!dateStr) return "";
    const parts = dateStr.slice(0, 10).split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const formatTimeVN = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const Container = isFrameless ? "div" : GlassCard;
  const containerProps = isFrameless
    ? { className: "space-y-3.5 relative" }
    : { className: "!p-4 bg-slate-900/90 border-slate-800 rounded-2xl space-y-3.5 relative" };

  return (
    <Container {...(containerProps as any)}>
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-800 pb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <ArrowUpDown className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Sổ Biến Động Thu / Chi Cá Nhân
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {filteredTransactions.length} giao dịch
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Biến động chi tiêu VPBank Debit & Khoản thu chi đời sống
            </p>
          </div>
        </div>

        {/* Nút thao tác: Ghi thu chi & Quản lý danh mục */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setCategoryModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Quản lý danh mục chi tiêu động"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Danh Mục</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white flex items-center gap-1.5 shadow-md shadow-pink-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ghi Thu/Chi</span>
          </button>
        </div>
      </div>

      {/* 2. Banner Thông Báo Khi Đang Lọc Theo Ngày Click Từ Bảng Trái */}
      {selectedDate && (
        <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-between gap-2 text-xs text-cyan-300 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>
              Đang lọc theo ngày chốt: <strong>{formatDateVN(selectedDate)}</strong> (
              {filteredTransactions.length} giao dịch phát sinh)
            </span>
          </div>
          <button
            onClick={onClearDateFilter}
            className="px-2 py-0.5 rounded-lg bg-cyan-900/60 hover:bg-cyan-800 text-white text-[11px] font-bold flex items-center gap-1 border border-cyan-500/30 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>Xem tất cả</span>
          </button>
        </div>
      )}

      {/* 3. Mini-KPI Toolbar (Thu vào - Chi tiêu - Dòng tiền) */}
      <div className="grid grid-cols-3 gap-2 p-2 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs">
        {/* Thu vào */}
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>Thu vào</span>
          </span>
          <span className="text-xs sm:text-sm font-bold font-mono text-emerald-300 mt-0.5">
            +{formatVND(totalInflow)}
          </span>
        </div>

        {/* Chi tiêu */}
        <div className="flex flex-col border-x border-slate-800/80 px-2">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-rose-400" />
            <span>Chi tiêu</span>
          </span>
          <span className="text-xs sm:text-sm font-bold font-mono text-rose-300 mt-0.5">
            -{formatVND(totalOutflow)}
          </span>
        </div>

        {/* Dòng tiền ròng */}
        <div className="flex flex-col pl-1">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            Dòng tiền ròng
          </span>
          <span
            className={`text-xs sm:text-sm font-bold font-mono mt-0.5 ${
              netCashflow >= 0 ? "text-cyan-300" : "text-amber-300"
            }`}
          >
            {netCashflow >= 0 ? "+" : ""}
            {formatVND(netCashflow)}
          </span>
        </div>
      </div>

      {/* 4. Bộ Lọc Linh Hoạt (Dropdown thẻ, danh mục động, search) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        {/* Lọc Thẻ / Tài khoản */}
        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-cyan-500"
        >
          <option value="ALL">Tất cả tài khoản/thẻ</option>
          {accounts.map((account) => (
            <option key={account.id} value={String(account.id)}>
              {account.name} ({account.accountNumberMasked || "không có số TK"})
            </option>
          ))}
        </select>

        {/* Lọc Danh mục Động từ categories */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 focus:outline-none focus:border-cyan-500"
        >
          <option value="ALL">Tất cả danh mục ({categories.length})</option>
          {categories.map((c) => (
            <option key={c.id} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Ô Tìm Kiếm Merchant */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo Merchant / Ghi chú..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 5. Bảng Dòng Tiền Compact Feed Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[460px] overflow-y-auto">
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
            <Inbox className="w-8 h-8 text-slate-600" />
            <span className="text-xs">Không có giao dịch nào phù hợp với bộ lọc</span>
            {selectedDate && (
              <button
                onClick={onClearDateFilter}
                className="text-xs text-cyan-400 hover:underline cursor-pointer"
              >
                Xóa bộ lọc ngày chốt
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[10.5px]">
                <th className="py-2.5 px-3">Thời gian / Thẻ</th>
                <th className="py-2.5 px-3">Nơi GD & Danh Mục</th>
                <th className="py-2.5 px-3 text-right">Số Tiền</th>
                <th className="py-2.5 px-3 text-right">Số Dư & Đối Soát</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTransactions.map((tx) => {
                const isOut = tx.direction === "OUTFLOW";
                const colorObj =
                  COLOR_OPTIONS.find((c) => c.name === tx.categoryColor) || COLOR_OPTIONS[0];

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-800/40 transition-colors group relative"
                  >
                    {/* Cột 1: Thời gian & Thẻ */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-mono text-white font-semibold text-[11.5px]">
                          {formatTimeVN(tx.occurredAt)} · {formatDateVN(tx.occurredAt)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <CreditCard className="w-3 h-3 text-cyan-400" />
                          <span>{tx.instrumentMask || "VPBank Debit"}</span>
                        </span>
                      </div>
                    </td>

                    {/* Cột 2: Nơi giao dịch & Tag danh mục động */}
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-1 min-w-[170px]">
                        <span className="font-semibold text-slate-200 text-xs truncate max-w-[200px]" title={tx.merchantNormalized}>
                          {tx.merchantNormalized}
                        </span>

                        {/* Inline Category Chip with Dropdown Trigger */}
                        <div className="relative inline-block">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenDropdownTxId(openDropdownTxId === tx.id ? null : tx.id)
                            }
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold border transition-all cursor-pointer ${colorObj.bg} ${colorObj.text} ${colorObj.border} hover:opacity-90`}
                            title="Click để đổi danh mục nhanh"
                          >
                            {renderCategoryIcon(tx.categoryIcon, "w-3 h-3")}
                            <span className="truncate max-w-[120px]">{tx.categoryName || "Khác"}</span>
                            <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                          </button>

                          {/* Quick Inline Category Dropdown */}
                          {openDropdownTxId === tx.id && (
                            <div className="absolute left-0 top-full mt-1 z-30 w-52 p-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-100">
                              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 block">
                                Chọn danh mục:
                              </span>
                              <div className="max-h-48 overflow-y-auto space-y-0.5">
                                {categories.map((cat) => {
                                  const cColor =
                                    COLOR_OPTIONS.find((c) => c.name === cat.color) || COLOR_OPTIONS[0];
                                  return (
                                    <button
                                      key={cat.id}
                                      type="button"
                                      onClick={() => handleQuickChangeCategory(tx.id, cat)}
                                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                                        tx.categoryId === cat.id
                                          ? "bg-cyan-500/20 text-cyan-300"
                                          : "text-slate-300 hover:bg-slate-800"
                                      }`}
                                    >
                                      {renderCategoryIcon(cat.icon, `w-3.5 h-3.5 ${cColor.text}`)}
                                      <span className="truncate">{cat.name}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Cột 3: Số tiền (+ / -) */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span
                          className={`font-mono font-bold text-xs ${
                            isOut ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {isOut ? "-" : "+"}
                          {formatVND(tx.amount)}
                        </span>
                        <span className="text-[9.5px] text-slate-500 uppercase font-semibold">
                          {isOut ? "Chi ra" : "Thu vào"}
                        </span>
                      </div>
                    </td>

                    {/* Cột 4: Số dư & Đối soát */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        {tx.observedBalanceAfter ? (
                          <span className="font-mono text-slate-300 font-medium text-[11px]">
                            {formatVND(tx.observedBalanceAfter)}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono text-[11px]">-</span>
                        )}

                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 text-[9.5px] font-semibold mt-0.5 ${
                            tx.balanceProjectionStatus === "OBSERVED_APPLIED"
                              ? "text-emerald-400"
                              : tx.balanceProjectionStatus === "PROJECTED_APPLIED"
                              ? "text-cyan-400"
                              : tx.balanceProjectionStatus === "RECONCILIATION_ADJUSTED"
                              ? "text-amber-400"
                              : "text-slate-400"
                          }`}
                        >
                          {tx.balanceProjectionStatus === "OBSERVED_APPLIED" ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Đã khớp</span>
                            </>
                          ) : tx.balanceProjectionStatus === "PROJECTED_APPLIED" ? (
                            <>
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>{"\u0110\u00e3 d\u1ef1 ki\u1ebfn"}</span>
                            </>
                          ) : tx.balanceProjectionStatus === "RECONCILIATION_ADJUSTED" ? (
                            <>
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Lệch check</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-2.5 h-2.5" />
                              <span>Đến trễ</span>
                            </>
                          )}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {loading && <div className="text-center text-xs text-slate-500 py-3">Đang tải giao dịch cá nhân...</div>}

      {/* Modals */}
      <PersonalCategoryManageModal
        isOpen={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={categories}
        onSaveCategories={handleSaveCategories}
      />

      <PersonalTransactionCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        categories={categories}
        accounts={accounts}
        onSuccess={handleAddTransaction}
      />
    </Container>
  );
};


