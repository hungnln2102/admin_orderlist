import React, { useState } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { formatVND } from "@/shared/utils";
import { useNotification } from "@/shared/context/NotificationContext";
import { Installment, PersonalAsset } from "../types";
import {
  Calendar,
  CheckCircle2,
  Clock3,
  CreditCard,
  Edit2,
  Flame,
  Plus,
  PlusCircle,
  Trash2,
  TrendingUp,
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

export const DebtsAndInstallmentsSection: React.FC<Props> = ({
  installments,
  personalDebts,
  totalInstallmentsRemainingDebt,
  monthlyDebtBurden = 0,
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
    window.location.reload();
  };

  const [debtActionModalOpen, setDebtActionModalOpen] = useState(false);
  const [activeDebtItem, setActiveDebtItem] = useState<PersonalAsset | null>(null);

  const openDebtAction = (item: PersonalAsset) => {
    setActiveDebtItem(item);
    setDebtActionModalOpen(true);
  };

  const handleConfirmDebtAction = async (mode: "INSTALLMENT" | "DEBT_PAY" | "DEBT_BORROW", payload: { financialAccountId?: number; amount: number; note: string }) => {
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
    window.location.reload();
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
        } catch (err: any) {
          notify.error(err.message || "Xóa thất bại");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Contextual Stat Cards for Debts & Installments */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <GlassCard className="!p-4 bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 border-rose-500/20 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Áp Lực Đóng Nợ / Tháng</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-rose-300 mt-1 block">{formatVND(monthlyDebtBurden)}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Trả góp kỳ này + Nợ cá nhân</span>
        </GlassCard>
        <GlassCard className="!p-4 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-amber-500/20 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Dư Nợ Trả Góp</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-amber-300 mt-1 block">{formatVND(totalInstallmentsRemainingDebt)}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">{installments.length} hợp đồng mua sắm theo kỳ</span>
        </GlassCard>
        <GlassCard className="!p-4 bg-gradient-to-br from-violet-950/40 via-slate-900 to-slate-950 border-violet-500/20 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sổ Nợ Cá Nhân Phải Trả</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-violet-300 mt-1 block">{formatVND(totalPersonalDebt)}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">{debtsPayableList.length} khoản vay mượn ngoài</span>
        </GlassCard>
      </div>

      {/* 2. Section: Trả Góp Theo Kỳ */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
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

      {/* 2. Section: Sổ Nợ Cá Nhân */}
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
          <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto pr-1">
            {[
              ...debtsPayableList.map((item) => ({ ...item, isPayable: true })),
              ...debtsReceivableList.map((item) => ({ ...item, isPayable: false })),
            ].map((item) => {
              const schedule = getDebtSchedule(item);

              return (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-800/20 px-2 rounded-lg transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white truncate">{item.name}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                        item.isPayable
                          ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                      }`}>
                        {item.isPayable ? "PHẢI TRẢ" : "PHẢI THU"}
                      </span>
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
