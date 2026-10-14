import React, { useState } from "react";
import { Installment, PersonalAsset } from "../types";
import { formatVND } from "@/shared/utils";
import {
  CreditCard,
  Clock,
  Building2,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { InstallmentModal } from "./InstallmentModal";
import { PersonalAssetsModal } from "./PersonalAssetsModal";
import { useNavigate } from "react-router-dom";

interface Props {
  installments: Installment[];
  personalDebts: PersonalAsset[];
  supplierDebtTotal: number;
  totalInstallmentsRemainingDebt: number;
  onAddInstallment: (payload: any) => Promise<void>;
  onEditInstallment: (id: number, payload: any) => Promise<void>;
  onDeleteInstallment: (id: number) => Promise<void>;
  onAddPersonalDebt: (payload: any) => Promise<void>;
  onEditPersonalDebt: (id: number, payload: any) => Promise<void>;
  onDeletePersonalDebt: (id: number) => Promise<void>;
}

export const DebtsAndInstallmentsSection: React.FC<Props> = ({
  installments,
  personalDebts,
  supplierDebtTotal,
  totalInstallmentsRemainingDebt,
  onAddInstallment,
  onEditInstallment,
  onDeleteInstallment,
  onAddPersonalDebt,
  onEditPersonalDebt,
  onDeletePersonalDebt,
}) => {
  const navigate = useNavigate();

  // Modal states for Installment
  const [installmentModalOpen, setInstallmentModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<Installment | null>(null);

  // Modal states for Personal Debt
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<PersonalAsset | null>(null);

  const debtsPayableList = personalDebts.filter((d) => d.type === "DEBT_PAYABLE");
  const debtsReceivableList = personalDebts.filter((d) => d.type === "DEBT_RECEIVABLE");

  const personalDebtTotal = debtsPayableList.reduce((sum, d) => sum + d.amount, 0);
  const totalAllLiabilities =
    totalInstallmentsRemainingDebt + supplierDebtTotal + personalDebtTotal;

  // Handlers for Installment Modal
  const handleOpenAddInstallment = () => {
    setEditingInstallment(null);
    setInstallmentModalOpen(true);
  };

  const handleOpenEditInstallment = (item: Installment) => {
    setEditingInstallment(item);
    setInstallmentModalOpen(true);
  };

  const handleSaveInstallment = async (payload: any) => {
    if (editingInstallment) {
      await onEditInstallment(editingInstallment.id, payload);
    } else {
      await onAddInstallment(payload);
    }
  };

  // Handlers for Personal Debt Modal
  const handleOpenAddDebt = () => {
    setEditingDebt(null);
    setDebtModalOpen(true);
  };

  const handleOpenEditDebt = (item: PersonalAsset) => {
    setEditingDebt(item);
    setDebtModalOpen(true);
  };

  const handleSaveDebt = async (payload: any) => {
    if (editingDebt) {
      await onEditPersonalDebt(editingDebt.id, payload);
    } else {
      await onAddPersonalDebt(payload);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Tổng Hợp Nghĩa Vụ Nợ */}
      <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-amber-950/30 p-4 sm:p-5 rounded-2xl border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <CreditCard className="w-5 h-5" />
          </span>
          <h3 className="text-base sm:text-lg font-black text-white">
            Toàn Bộ Khoản Nợ & Nghĩa Vụ Trả Góp
          </h3>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Tổng nợ & dư nợ còn lại
          </span>
          <span className="text-xl sm:text-2xl font-mono font-black text-rose-300">
            {formatVND(totalAllLiabilities)}
          </span>
        </div>
      </div>

      {/* KHỐI 1: CÁC KHOẢN TRẢ GÓP THEO KỲ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            1. Các Khoản Mua Sắm Trả Góp
          </h4>
          <button
            onClick={handleOpenAddInstallment}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm Khoản Trả Góp
          </button>
        </div>

        {installments.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl space-y-2 bg-slate-900/30">
            <Clock className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-xs font-semibold text-slate-400">
              Chưa có khoản mua trả góp nào
            </div>
            <p className="text-[11px] text-slate-500">
              Bấm "Thêm Khoản Trả Góp" để đưa các khoản mua xe, máy tính, điện thoại vào theo dõi.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {installments.map((item) => {
              const isCompleted = item.status === "COMPLETED";
              const percentPeriod = Math.min(
                100,
                Math.round((item.currentPeriod / item.totalPeriods) * 100)
              );

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                    isCompleted
                      ? "bg-slate-900/40 border-slate-800/60 opacity-60"
                      : "bg-slate-900/90 border-slate-800 hover:border-amber-500/40 shadow-lg"
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="font-bold text-white text-sm leading-tight truncate" title={item.name}>
                        {item.name}
                      </h5>
                      {isCompleted ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> ĐÃ HẾT KỲ
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
                          KỲ {item.currentPeriod} / {item.totalPeriods}
                        </span>
                      )}
                    </div>

                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Số tiền/tháng</span>
                        <span className="font-mono font-extrabold text-amber-300">{formatVND(item.monthlyAmount)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Đến hạn</span>
                        <span className="font-mono text-slate-300">Ngày {item.dueDay}/tháng</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Tiến độ: {percentPeriod}%</span>
                        <span>{isCompleted ? "Tất toán 100%" : `Còn ${item.remainingPeriods} kỳ`}</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? "bg-emerald-400" : "bg-amber-400"
                          }`}
                          style={{ width: `${percentPeriod}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Dư nợ còn lại:</span>
                      <span className="font-mono font-bold text-slate-200">{formatVND(item.remainingDebt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1 pt-3 mt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleOpenEditInstallment(item)}
                      className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Sửa thông tin"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn xóa khoản trả góp "${item.name}"?`)) {
                          onDeleteInstallment(item.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Xóa khoản trả góp"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* KHỐI 2 & 3: NỢ NHÀ CUNG CẤP & SỔ NỢ CÁ NHÂN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Khối 2: Nợ Nhà Cung Cấp */}
        <div className="space-y-3">
          <div className="border-b border-slate-800 pb-2">
            <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-rose-400" />
              2. Nợ Nhà Cung Cấp
            </h4>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Công Nợ NCC</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  ĐỒNG BỘ ĐƠN HÀNG
                </span>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className="font-mono font-black text-rose-400 text-lg">
                  {formatVND(supplierDebtTotal)}
                </span>
                <button
                  onClick={() => navigate("/sources")}
                  className="p-2 text-slate-400 hover:text-cyan-300 rounded-xl hover:bg-slate-800 transition-colors"
                  title="Mở trang Đối Soát Nhà Cung Cấp"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Khối 3: Sổ Nợ Cá Nhân */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-400" />
              3. Nợ Cá Nhân Ngoài Shop
            </h4>
            <button
              onClick={handleOpenAddDebt}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm Nợ Cá Nhân
            </button>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl divide-y divide-slate-800/70 overflow-hidden shadow-lg">
            {debtsPayableList.length === 0 && debtsReceivableList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Không có khoản nợ cá nhân nào ngoài shop. Bấm "Thêm Nợ Cá Nhân" để bổ sung.
              </div>
            ) : (
              <>
                {debtsPayableList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{item.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                          NỢ PHẢI TRẢ
                        </span>
                      </div>
                      {item.note && <p className="text-xs text-slate-400 italic">{item.note}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-400 text-sm">
                        {formatVND(item.amount)}
                      </span>
                      <button
                        onClick={() => handleOpenEditDebt(item)}
                        className="p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Xóa khoản nợ "${item.name}"?`)) onDeletePersonalDebt(item.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {debtsReceivableList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{item.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          CHO VAY (PHẢI THU)
                        </span>
                      </div>
                      {item.note && <p className="text-xs text-slate-400 italic">{item.note}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-300 text-sm">
                        {formatVND(item.amount)}
                      </span>
                      <button
                        onClick={() => handleOpenEditDebt(item)}
                        className="p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Xóa mục "${item.name}"?`)) onDeletePersonalDebt(item.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <InstallmentModal
        isOpen={installmentModalOpen}
        onClose={() => setInstallmentModalOpen(false)}
        onSave={handleSaveInstallment}
        editingItem={editingInstallment}
      />

      <PersonalAssetsModal
        isOpen={debtModalOpen}
        onClose={() => setDebtModalOpen(false)}
        onSave={handleSaveDebt}
        editingItem={editingDebt}
        defaultType="DEBT_PAYABLE"
      />
    </div>
  );
};
