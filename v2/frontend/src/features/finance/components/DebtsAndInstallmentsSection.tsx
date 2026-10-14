import React, { useState } from "react";
import { Installment, PersonalAsset } from "../types";
import { formatVND } from "@/shared/utils";
import { Building2, CheckCircle2, Clock3, CreditCard, Edit2, ExternalLink, Plus, Trash2 } from "lucide-react";
import { InstallmentModal } from "./InstallmentModal";
import { PersonalAssetsModal } from "./PersonalAssetsModal";
import { useNavigate } from "react-router-dom";

interface Props {
  installments: Installment[];
  personalDebts: PersonalAsset[];
  supplierDebtTotal: number;
  totalInstallmentsRemainingDebt: number;
  monthlyDebtBurden: number;
  onAddInstallment: (payload: any) => Promise<void>;
  onEditInstallment: (id: number, payload: any) => Promise<void>;
  onDeleteInstallment: (id: number) => Promise<void>;
  onAddPersonalDebt: (payload: any) => Promise<void>;
  onEditPersonalDebt: (id: number, payload: any) => Promise<void>;
  onDeletePersonalDebt: (id: number) => Promise<void>;
}

const getDebtSchedule = (item: PersonalAsset) => {
  if (!item.debtEndDate) return null;
  const remainingDays = Math.max(1, Math.ceil((new Date(`${item.debtEndDate}T23:59:59`).getTime() - Date.now()) / 86400000));
  const remainingMonths = Math.max(1, Math.ceil(remainingDays / 30.44));
  const rate = item.debtInterestEnabled ? Number(item.debtAnnualInterestRate || 0) : 0;
  const estimatedTotal = item.amount + (item.amount * rate / 100 * remainingDays / 365);
  const dailyAmount = estimatedTotal / remainingDays;
  const monthlyAmount = item.debtRepaymentFrequency === "DAILY" ? dailyAmount * 30.44 : estimatedTotal / remainingMonths;
  return { remainingDays, remainingMonths, monthlyAmount };
};

export const DebtsAndInstallmentsSection: React.FC<Props> = ({
  installments,
  personalDebts,
  supplierDebtTotal,
  totalInstallmentsRemainingDebt,
  monthlyDebtBurden,
  onAddInstallment,
  onEditInstallment,
  onDeleteInstallment,
  onAddPersonalDebt,
  onEditPersonalDebt,
  onDeletePersonalDebt,
}) => {
  const navigate = useNavigate();
  const [installmentModalOpen, setInstallmentModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<Installment | null>(null);
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<PersonalAsset | null>(null);
  const debtsPayableList = personalDebts.filter((item) => item.type === "DEBT_PAYABLE");
  const debtsReceivableList = personalDebts.filter((item) => item.type === "DEBT_RECEIVABLE");
  const totalPersonalDebt = debtsPayableList.reduce((sum, item) => sum + item.amount, 0);
  const totalAllLiabilities = totalInstallmentsRemainingDebt + supplierDebtTotal + totalPersonalDebt;
  const openInstallment = (item: Installment | null = null) => { setEditingInstallment(item); setInstallmentModalOpen(true); };
  const openDebt = (item: PersonalAsset | null = null) => { setEditingDebt(item); setDebtModalOpen(true); };
  const saveInstallment = async (payload: any) => editingInstallment ? onEditInstallment(editingInstallment.id, payload) : onAddInstallment(payload);
  const saveDebt = async (payload: any) => editingDebt ? onEditPersonalDebt(editingDebt.id, payload) : onAddPersonalDebt(payload);

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0b1422] px-4 py-3"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-400/10 text-rose-300"><CreditCard className="h-4 w-4" /></div><div><h3 className="text-sm font-semibold text-white">Nợ & nghĩa vụ tài chính</h3><p className="mt-0.5 text-[11px] text-slate-500">Các khoản cần theo dõi và thanh toán</p></div></div><div className="text-right"><div className="text-[10px] uppercase tracking-wider text-slate-500">Chi phí phải gánh / tháng</div><div className="font-mono text-sm font-semibold text-rose-300">{formatVND(monthlyDebtBurden)}</div><div className="text-[10px] text-slate-500">Tổng dư nợ: {formatVND(totalAllLiabilities)}</div></div></header>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b1422]"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3"><div className="flex items-center gap-2 text-sm font-medium text-white"><Clock3 className="h-4 w-4 text-amber-300" /> Trả góp theo kỳ <span className="text-xs font-normal text-slate-500">{installments.length} khoản</span></div><button type="button" onClick={() => openInstallment()} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-2.5 py-1.5 text-[11px] font-medium text-amber-200 transition-colors hover:bg-amber-400/[0.12]"><Plus className="h-3.5 w-3.5" /> Thêm khoản</button></div>{installments.length === 0 ? <div className="flex items-center gap-3 px-4 py-4 text-xs text-slate-500"><Clock3 className="h-5 w-5 text-slate-600" /><span>Chưa có khoản trả góp. Thêm một khoản để bắt đầu theo dõi.</span></div> : <div className="divide-y divide-slate-800/80">{installments.map((item) => { const completed = item.status === "COMPLETED"; const percent = Math.min(100, Math.round((item.currentPeriod / Math.max(1, item.totalPeriods)) * 100)); return <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-slate-900/70"><div className="min-w-[180px] flex-1"><div className="flex items-center gap-2"><span className={`text-sm font-medium ${completed ? "text-slate-500 line-through" : "text-slate-200"}`}>{item.name}</span>{completed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />}</div><div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500"><span>Đến kỳ {item.currentPeriod}/{item.totalPeriods}</span><span className="h-1 w-20 overflow-hidden rounded-full bg-slate-800"><span className="block h-full rounded-full bg-amber-300/70" style={{ width: `${percent}%` }} /></span></div></div><div className="font-mono text-sm text-amber-200">{formatVND(item.monthlyAmount)}<span className="ml-1 text-[10px] text-slate-500">/ tháng</span></div><div className="flex items-center gap-1"><button type="button" aria-label={`Sửa ${item.name}`} onClick={() => openInstallment(item)} className="cursor-pointer rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-cyan-300"><Edit2 className="h-3.5 w-3.5" /></button><button type="button" aria-label={`Xóa ${item.name}`} onClick={() => { if (confirm(`Xóa khoản trả góp "${item.name}"?`)) onDeleteInstallment(item.id); }} className="cursor-pointer rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button></div></div>; })}</div>}</section>

      <div className="grid gap-3"><section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0b1422]"><div className="flex items-center justify-between border-b border-slate-800 px-4 py-3"><div className="flex items-center gap-2 text-sm font-medium text-white"><CreditCard className="h-4 w-4 text-violet-300" /> Nợ cá nhân</div><button type="button" onClick={() => openDebt()} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-violet-400/25 bg-violet-400/[0.06] px-2.5 py-1.5 text-[11px] font-medium text-violet-200 transition-colors hover:bg-violet-400/[0.12]"><Plus className="h-3.5 w-3.5" /> Thêm nợ</button></div>{debtsPayableList.length === 0 && debtsReceivableList.length === 0 ? <div className="px-4 py-4 text-xs text-slate-500">Chưa có khoản nợ cá nhân ngoài shop.</div> : <div className="divide-y divide-slate-800/80">{[...debtsPayableList.map((item) => ({ ...item, tone: "rose", label: "Phải trả" })), ...debtsReceivableList.map((item) => ({ ...item, tone: "cyan", label: "Phải thu" }))].map((item) => { const schedule = getDebtSchedule(item); return <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5"><div className="min-w-0"><div className="truncate text-sm text-slate-200">{item.name}</div><div className={`text-[10px] ${item.tone === "rose" ? "text-rose-300" : "text-cyan-300"}`}>{item.label}</div>{schedule && <div className="mt-1 text-[10px] text-slate-500">Đóng/tháng {formatVND(schedule.monthlyAmount)} · Còn {schedule.remainingMonths} tháng</div>}</div><div className="flex items-center gap-1"><span className={`font-mono text-xs ${item.tone === "rose" ? "text-rose-300" : "text-cyan-300"}`}>{formatVND(item.amount)}</span><button type="button" aria-label={`Sửa ${item.name}`} onClick={() => openDebt(item)} className="cursor-pointer rounded-md p-1.5 text-slate-500 hover:bg-slate-800 hover:text-cyan-300"><Edit2 className="h-3.5 w-3.5" /></button><button type="button" aria-label={`Xóa ${item.name}`} onClick={() => { if (confirm(`Xóa mục "${item.name}"?`)) onDeletePersonalDebt(item.id); }} className="cursor-pointer rounded-md p-1.5 text-slate-500 hover:bg-slate-800 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button></div></div>; })}</div>}</section></div>

      <InstallmentModal isOpen={installmentModalOpen} onClose={() => setInstallmentModalOpen(false)} onSave={saveInstallment} editingItem={editingInstallment} />
      <PersonalAssetsModal isOpen={debtModalOpen} onClose={() => setDebtModalOpen(false)} onSave={saveDebt} editingItem={editingDebt} defaultType="DEBT_PAYABLE" />
    </div>
  );
};
