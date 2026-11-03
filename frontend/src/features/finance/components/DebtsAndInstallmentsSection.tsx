import React, { useState, useEffect } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { formatVND } from "@/shared/utils";
import { useNotification } from "@/shared/context/NotificationContext";
import { DebtPaymentLogItem, Installment, PersonalAsset } from "../types";
import {
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  Edit2,
  History,
  Plus,
  PlusCircle,
  RefreshCw,
  Trash2,
  Wallet,
} from "lucide-react";
import { InstallmentModal } from "./InstallmentModal";
import { PersonalAssetsModal } from "./PersonalAssetsModal";
import { DebtPaymentModal } from "./DebtPaymentModal";

interface Props {
  installments: Installment[];
  personalDebts: PersonalAsset[];
  supplierDebtTotal?: number;
  totalInstallmentsRemainingDebt: number;
  monthlyDebtBurden?: number;
  dailyBurden?: number;
  debtLogs?: DebtPaymentLogItem[];
  onRefresh?: () => Promise<void>;
  onAddInstallment: (payload: any) => Promise<void>;
  onEditInstallment: (id: number, payload: any) => Promise<void>;
  onDeleteInstallment: (id: number) => Promise<void>;
  onAddPersonalDebt: (payload: any) => Promise<void>;
  onEditPersonalDebt: (id: number, payload: any) => Promise<void>;
  onDeletePersonalDebt: (id: number) => Promise<void>;
}

const getDebtSchedule = (item: PersonalAsset) => {
  if (!item.debtEndDate) return null;
  const remainingDays = Math.max(
    1,
    Math.ceil((new Date(`${item.debtEndDate}T23:59:59`).getTime() - Date.now()) / 86400000)
  );
  const remainingMonths = Math.max(1, Math.floor(remainingDays / 30.4375) || 1);
  const rate = item.debtInterestEnabled ? Number(item.debtAnnualInterestRate || 0) : 0;
  const estimatedTotal = item.amount + ((item.amount * rate) / 100) * (remainingDays / 365);
  const dailyAmount = Math.ceil(estimatedTotal / remainingDays);
  // Nguyên tắc an toàn: Thà dôi dư chứ không để thiếu hụt nợ khi tới hạn
  const monthlyAmount = Math.max(
    Math.ceil(dailyAmount * 30.44),
    Math.ceil(estimatedTotal / remainingMonths)
  );
  return { remainingDays, remainingMonths, monthlyAmount };
};

const formatDateVN = (dateStr?: string | null) => {
  if (!dateStr) return "—";
  try {
    const parts = dateStr.slice(0, 10).split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

const isDisplayNote = (note?: string | null) => {
  if (!note || !note.trim()) return false;
  const trimmed = note.trim();
  if (trimmed.startsWith("Quẹt thẻ / Vay thanh toán hóa đơn")) return false;
  if (trimmed.startsWith("Trả bớt nợ")) return false;
  if (trimmed.startsWith("Thanh toán trả góp")) return false;
  if (trimmed.startsWith("Thanh toán kỳ")) return false;
  return true;
};

const formatTimeVN = (dateStr?: string | null) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return null;
  }
};

export const DebtsAndInstallmentsSection: React.FC<Props> = ({
  installments,
  personalDebts,
  totalInstallmentsRemainingDebt,
  monthlyDebtBurden = 0,
  dailyBurden = 0,
  debtLogs,
  onRefresh,
  onAddInstallment,
  onEditInstallment,
  onDeleteInstallment,
  onAddPersonalDebt,
  onEditPersonalDebt,
  onDeletePersonalDebt,
}) => {
  const notify = useNotification();

  const [installmentModalOpen, setInstallmentModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<Installment | null>(null);

  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<PersonalAsset | null>(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [payingInstallment, setPayingInstallment] = useState<Installment | null>(null);

  // --- Nhật Ký Biến Động Nợ State ---
  const [logs, setLogs] = useState<DebtPaymentLogItem[]>(debtLogs || []);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logFilter, setLogFilter] = useState<"ALL" | "BORROW" | "PAY" | "INSTALLMENT">("ALL");

  useEffect(() => {
    if (debtLogs) {
      setLogs(debtLogs);
    }
  }, [debtLogs]);

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await fetch("/api/finance/debt-payment-logs?limit=100");
      const json = await res.json();
      if (json.success && Array.isArray(json.logs)) {
        setLogs(json.logs);
      }
    } catch (err) {
      console.error("Lỗi tải nhật ký nợ:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  const openPaymentModal = (item: Installment) => {
    setPayingInstallment(item);
    setPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (_mode: string, payload: { financialAccountId?: number; amount: number; periodMonth?: string; note: string }) => {
    if (!payingInstallment) return;
    const res = await fetch(`/api/finance/installments/${payingInstallment.id}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Lỗi thanh toán");
    }
    notify.success(`Đã thanh toán thành công kỳ ${payload.periodMonth || ""} cho "${payingInstallment.name}"`);
    setPaymentModalOpen(false);
    if (onRefresh) {
      await onRefresh();
    }
    await fetchLogs();
  };

  const [debtActionModalOpen, setDebtActionModalOpen] = useState(false);
  const [activeDebtItem, setActiveDebtItem] = useState<PersonalAsset | null>(null);

  const openDebtAction = (item: PersonalAsset) => {
    setActiveDebtItem(item);
    setDebtActionModalOpen(true);
  };

  const handleConfirmDebtAction = async (
    mode: "INSTALLMENT" | "DEBT_PAY" | "DEBT_BORROW",
    payload: {
      financialAccountId?: number;
      receiptId?: number;
      amount: number;
      note: string;
      merchantName?: string;
      referenceCode?: string;
      directExpense?: boolean;
    }
  ) => {
    if (!activeDebtItem) return;
    const endpoint = mode === "DEBT_PAY"
      ? `/api/finance/personal-assets/${activeDebtItem.id}/pay`
      : `/api/finance/personal-assets/${activeDebtItem.id}/borrow`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Lỗi thao tác nợ cá nhân");
    }
    notify.success(mode === "DEBT_PAY" ? `Đã trả bớt nợ cho "${activeDebtItem.name}"` : `Đã ghi nhận phát sinh thêm nợ cho "${activeDebtItem.name}"`);
    setDebtActionModalOpen(false);
    if (onRefresh) {
      await onRefresh();
    }
    await fetchLogs();
  };

  const debtsPayableList = personalDebts.filter((item) => item.type === "DEBT_PAYABLE");
  const debtsReceivableList = personalDebts.filter((item) => item.type === "DEBT_RECEIVABLE");
  const totalPersonalDebt = debtsPayableList.reduce((sum, item) => sum + item.amount, 0);
  const totalAllLiabilities = totalInstallmentsRemainingDebt + totalPersonalDebt;

  const openInstallment = (item: Installment | null = null) => {
    setEditingInstallment(item);
    setInstallmentModalOpen(true);
  };

  const openDebt = (item: PersonalAsset | null = null) => {
    setEditingDebt(item);
    setDebtModalOpen(true);
  };

  const saveInstallment = async (payload: any) => {
    try {
      if (editingInstallment) {
        await onEditInstallment(editingInstallment.id, payload);
        notify.success(`Đã cập nhật khoản trả góp "${payload.name || editingInstallment.name}"`);
      } else {
        await onAddInstallment(payload);
        notify.success(`Đã thêm khoản trả góp "${payload.name}"`);
      }
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      notify.error(err.message || "Lỗi lưu khoản trả góp");
    }
  };

  const saveDebt = async (payload: any) => {
    try {
      if (editingDebt) {
        await onEditPersonalDebt(editingDebt.id, payload);
        notify.success(`Đã cập nhật mục nợ "${payload.name || editingDebt.name}"`);
      } else {
        await onAddPersonalDebt(payload);
        notify.success(`Đã thêm mục nợ "${payload.name}"`);
      }
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      notify.error(err.message || "Lỗi lưu mục nợ");
    }
  };

  const confirmDeleteInstallment = (item: Installment) => {
    notify.confirm({
      title: "Xác Nhận Xóa Khoản Trả Góp",
      message: `Bạn có chắc chắn muốn xóa hợp đồng trả góp "${item.name}"? Thao tác này sẽ cập nhật lại toàn bộ điểm hòa vốn tháng.`,
      confirmText: "Xóa Ngay",
      cancelText: "Giữ Lại",
      onConfirm: async () => {
        try {
          await onDeleteInstallment(item.id);
          notify.success(`Đã xóa khoản trả góp "${item.name}"`);
          if (onRefresh) await onRefresh();
        } catch (err: any) {
          notify.error(err.message || "Xóa thất bại");
        }
      },
    });
  };

  const confirmDeleteDebt = (item: PersonalAsset) => {
    notify.confirm({
      title: "Xác Nhận Xóa Mục Nợ",
      message: `Bạn có chắc chắn muốn xóa mục "${item.name}"?`,
      confirmText: "Xóa Ngay",
      cancelText: "Giữ Lại",
      onConfirm: async () => {
        try {
          await onDeletePersonalDebt(item.id);
          notify.success(`Đã xóa mục "${item.name}"`);
          if (onRefresh) await onRefresh();
        } catch (err: any) {
          notify.error(err.message || "Xóa thất bại");
        }
      },
    });
  };

  // Lọc nhật ký log
  const filteredLogs = logs.filter((item) => {
    if (logFilter === "ALL") return true;
    if (logFilter === "BORROW") return item.targetType === "PERSONAL_DEBT_BORROW";
    if (logFilter === "PAY") return item.targetType === "PERSONAL_DEBT";
    if (logFilter === "INSTALLMENT") return item.targetType === "INSTALLMENT";
    return true;
  });

  const borrowCount = logs.filter((l) => l.targetType === "PERSONAL_DEBT_BORROW").length;
  const payCount = logs.filter((l) => l.targetType === "PERSONAL_DEBT").length;
  const installmentCount = logs.filter((l) => l.targetType === "INSTALLMENT").length;

  return (
    <div className="space-y-6">
      {/* 1. Contextual Stat Cards for Debts & Installments */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <GlassCard className="!p-4 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/20 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Tiền Ngày Hôm Nay Cần Trả</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-amber-300 mt-1 block">{formatVND(dailyBurden)}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Định mức ngày + Nợ gối đầu từ hôm trước</span>
        </GlassCard>
        <GlassCard className="!p-4 bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/20 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Tiền Cần Trả Trong Tháng</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-rose-300 mt-1 block">{formatVND(monthlyDebtBurden)}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Định mức trả góp & nợ cá nhân tháng này</span>
        </GlassCard>
        <GlassCard className="!p-4 bg-gradient-to-br from-violet-950/40 via-slate-900 to-slate-950 border-violet-500/20 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Tiền Cần Trả (Tổng Dư Nợ)</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-violet-300 mt-1 block">{formatVND(totalAllLiabilities)}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Tổng dư nợ trả góp + Nợ cá nhân phải trả</span>
        </GlassCard>
      </div>

      {/* 2. Hàng Ngang Chứa Trả Góp (Trái) & Sổ Nợ Cá Nhân (Phải) - 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* CỘT TRÁI: 1. Hợp Đồng Trả Góp Theo Kỳ */}
        <GlassCard className="!p-5 bg-slate-900/90 border-slate-800 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock3 className="w-5 h-5 text-amber-400" />
              <h4 className="text-base font-bold text-white">
                1. Hợp Đồng Trả Góp Theo Kỳ ({installments.length})
              </h4>
            </div>

            <button
              type="button"
              onClick={() => openInstallment()}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Thêm Khoản Trả Góp
            </button>
          </div>

          {installments.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl space-y-2 bg-slate-950/40">
              <Clock3 className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-400">Chưa có khoản trả góp nào</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Bấm "Thêm Khoản Trả Góp" để khai báo các kỳ thanh toán điện thoại, laptop, xe máy nhằm tự động hạch toán vào điểm hòa vốn.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {installments.map((item) => {
                const isCompleted = item.status === "COMPLETED";
                const percent = Math.min(
                  100,
                  Math.round((item.currentPeriod / Math.max(1, item.totalPeriods)) * 100)
                );

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                      isCompleted
                        ? "bg-slate-950/40 border-slate-800/60 opacity-60"
                        : "bg-slate-950/80 border-slate-800 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5"
                    }`}
                  >
                    <div>
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className={`text-sm font-bold ${isCompleted ? "text-slate-400 line-through" : "text-white"}`}>
                            {item.name}
                          </h5>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isCompleted
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                            }`}>
                              {isCompleted ? "ĐÃ HOÀN THÀNH" : `KỲ ${item.currentPeriod}/${item.totalPeriods}`}
                            </span>
                            {item.dueDay && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                Hạn ngày {item.dueDay}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openInstallment(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmDeleteInstallment(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Monetary numbers */}
                      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Đóng mỗi tháng</span>
                          <span className="text-base font-bold font-mono text-amber-300">
                            {formatVND(item.monthlyAmount)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block uppercase">Dư nợ còn lại</span>
                          <span className="text-xs font-semibold font-mono text-slate-300">
                            {formatVND(item.remainingDebt)}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>Tiến độ thanh toán</span>
                          <span className="font-mono font-bold text-slate-300">{percent}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCompleted ? "bg-emerald-400" : "bg-gradient-to-r from-amber-500 to-amber-300"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => openPaymentModal(item)}
                          className="mt-3.5 w-full py-2 px-3 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Thanh Toán Kỳ Này
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* CỘT PHẢI: 2. Sổ Nợ Cá Nhân */}
        <GlassCard className="!p-5 bg-slate-900/90 border-slate-800 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-violet-400" />
              <div>
                <h4 className="text-base font-bold text-white">
                  2. Sổ Nợ Cá Nhân ({debtsPayableList.length + debtsReceivableList.length})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Phải trả: <span className="font-mono font-bold text-rose-300">{formatVND(totalPersonalDebt)}</span> · Phải thu: <span className="font-mono font-bold text-cyan-300">{formatVND(debtsReceivableList.reduce((sum, item) => sum + item.amount, 0))}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openDebt()}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 border border-violet-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm Nợ
            </button>
          </div>

          {debtsPayableList.length === 0 && debtsReceivableList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-1">
              <p className="font-semibold text-slate-400">Chưa có khoản nợ vay cá nhân nào ngoài shop.</p>
              <p>Bấm <strong className="text-violet-300">+ Thêm Nợ</strong> để ghi nhận các khoản vay mượn cá nhân cần theo dõi.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto pr-1 space-y-1">
              {[
                ...debtsPayableList.map((item) => ({ ...item, isPayable: true })),
                ...debtsReceivableList.map((item) => ({ ...item, isPayable: false })),
              ].map((item) => {
                const schedule = getDebtSchedule(item);

                return (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-800/20 px-2 rounded-lg transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white truncate">{item.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                          item.isPayable
                            ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                            : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                        }`}>
                          {item.isPayable ? "PHẢI TRẢ" : "PHẢI THU"}
                        </span>
                        {item.cardLastDigits && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800/80 text-cyan-300 border border-slate-700 flex items-center gap-1 shadow-sm">
                            <CreditCard className="w-3 h-3 text-cyan-400" />
                            <span>{item.bankName ? `${item.bankName} •••• ` : "•••• "}{item.cardLastDigits}</span>
                          </span>
                        )}
                      </div>
                      {schedule && (
                        <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          Trả/tháng: {formatVND(schedule.monthlyAmount)} · Còn {schedule.remainingMonths} tháng ({schedule.remainingDays} ngày)
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold font-mono ${
                          item.isPayable ? "text-rose-300" : "text-cyan-300"
                        }`}>
                          {formatVND(item.amount)}
                        </span>
                        <div className="flex items-center gap-1">
                          {item.isPayable && (
                            <button
                              type="button"
                              onClick={() => openDebtAction(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Giao dịch nợ (Trả nợ / Vay thêm)"
                            >
                              <Wallet className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openDebt(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmDeleteDebt(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>

      {/* 3. BẢNG FORM: NHẬT KÝ BIẾN ĐỘNG NỢ & TRẢ GÓP (DEBT TRANSACTION LOGS) */}
      <GlassCard className="!p-5 bg-slate-900/90 border-slate-800 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-cyan-400" />
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                3. Nhật Ký Biến Động Nợ & Trả Góp
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                  {filteredLogs.length} giao dịch
                </span>
              </h4>
              <p className="text-[11px] text-slate-400">
                Theo dõi chi tiết toàn bộ lịch sử quẹt thẻ, vay thêm, trả bớt nợ và đóng tiền trả góp theo kỳ.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setLogFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  logFilter === "ALL"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Tất Cả ({logs.length})
              </button>
              <button
                type="button"
                onClick={() => setLogFilter("BORROW")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  logFilter === "BORROW"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "text-slate-400 hover:text-amber-300"
                }`}
              >
                + Vay/Quẹt ({borrowCount})
              </button>
              <button
                type="button"
                onClick={() => setLogFilter("PAY")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  logFilter === "PAY"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-400 hover:text-emerald-300"
                }`}
              >
                – Trả Nợ ({payCount})
              </button>
              <button
                type="button"
                onClick={() => setLogFilter("INSTALLMENT")}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  logFilter === "INSTALLMENT"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:text-cyan-300"
                }`}
              >
                ⏱ Trả Góp ({installmentCount})
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchLogs}
              disabled={logsLoading}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors cursor-pointer"
              title="Làm mới danh sách nhật ký"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Table View */}
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl space-y-2 bg-slate-950/40">
            <History className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-400">Chưa có giao dịch nợ nào phù hợp bộ lọc</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Khi bạn thực hiện thao tác trả nợ, vay thêm hoặc thanh toán hợp đồng trả góp, toàn bộ log sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/50">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3.5 whitespace-nowrap">Ngày</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Vay / Trả</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-right">Số Tiền</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Khoản Nợ / Mục</th>
                  <th className="py-3 px-3.5">Ghi Chú & Chi Tiết Đối Chiếu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.map((item) => {
                  const isBorrow = item.targetType === "PERSONAL_DEBT_BORROW";
                  const isPay = item.targetType === "PERSONAL_DEBT";
                  const isInstallment = item.targetType === "INSTALLMENT";

                  const timeStr = formatTimeVN(item.createdAt);

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* Cột 1: Ngày */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-mono align-top">
                        <div className="font-bold text-slate-200">{formatDateVN(item.paymentDate)}</div>
                        {timeStr && <div className="text-[10px] text-slate-500">{timeStr}</div>}
                      </td>

                      {/* Cột 2: Vay / Trả */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap align-top">
                        {isBorrow && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1 shadow-sm">
                            <PlusCircle className="w-3 h-3 text-amber-400" />
                            + Vay Thêm / Quẹt Thẻ
                          </span>
                        )}
                        {isPay && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            – Trả Bớt Nợ
                          </span>
                        )}
                        {isInstallment && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 inline-flex items-center gap-1 shadow-sm">
                            <Clock3 className="w-3 h-3 text-cyan-400" />
                            ⏱ Trả Góp {item.periodMonth ? `(Kỳ ${item.periodMonth})` : ""}
                          </span>
                        )}
                      </td>

                      {/* Cột 3: Số Tiền */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-right font-mono font-bold align-top">
                        <span className={`text-sm ${
                          isBorrow ? "text-amber-300" : "text-emerald-400"
                        }`}>
                          {isBorrow ? `+ ${formatVND(item.amount)}` : `– ${formatVND(item.amount)}`}
                        </span>
                      </td>

                      {/* Cột 4: Khoản Nợ / Mục */}
                      <td className="py-2.5 px-3.5 align-top">
                        <div className="font-bold text-white text-xs">{item.targetName}</div>
                        {item.cardLastDigits && (
                          <div className="text-[10px] text-cyan-300 font-mono flex items-center gap-1 mt-0.5">
                            <CreditCard className="w-3 h-3 text-cyan-400" />
                            <span>{item.bankName ? `${item.bankName} •••• ` : "•••• "}{item.cardLastDigits}</span>
                          </div>
                        )}
                      </td>

                      {/* Cột 5: Ghi Chú & Chi Tiết Đối Chiếu */}
                      <td className="py-2.5 px-3.5 align-top">
                        {isDisplayNote(item.note) && (
                          <div className="text-xs text-slate-200 font-medium">{item.note}</div>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {item.merchantName && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                              🏪 {item.merchantName}
                            </span>
                          )}
                          {item.referenceCode && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                              Mã REF: {item.referenceCode}
                            </span>
                          )}
                          {item.financialAccountName && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-cyan-300 border border-slate-700 font-medium">
                              🏦 {item.financialAccountName}
                            </span>
                          )}
                          {!isDisplayNote(item.note) && !item.merchantName && !item.referenceCode && !item.financialAccountName && (
                            <span className="text-slate-500 text-xs italic">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Modals */}
      <InstallmentModal
        isOpen={installmentModalOpen}
        onClose={() => setInstallmentModalOpen(false)}
        onSave={saveInstallment}
        editingItem={editingInstallment}
      />
      <PersonalAssetsModal
        isOpen={debtModalOpen}
        onClose={() => setDebtModalOpen(false)}
        onSave={saveDebt}
        editingItem={editingDebt}
        defaultType="DEBT_PAYABLE"
      />
      <DebtPaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onConfirm={handleConfirmPayment}
        item={payingInstallment}
        defaultMode="INSTALLMENT"
      />
      <DebtPaymentModal
        isOpen={debtActionModalOpen}
        onClose={() => setDebtActionModalOpen(false)}
        onConfirm={handleConfirmDebtAction}
        item={activeDebtItem}
        defaultMode="DEBT_PAY"
      />
    </div>
  );
};
