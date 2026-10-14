import React, { useState } from "react";
import { PersonalAsset } from "../types";
import { formatVND } from "@/shared/utils";
import { Wallet, Landmark, Plus, Edit2, Trash2, ExternalLink, Sparkles } from "lucide-react";
import { PersonalAssetsModal } from "./PersonalAssetsModal";
import { useNavigate } from "react-router-dom";

interface Props {
  assets: PersonalAsset[];
  shopBalanceTotal: number;
  onAdd: (payload: any) => Promise<void>;
  onEdit: (id: number, payload: any) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export const SavingsAndAssetsSection: React.FC<Props> = ({
  assets,
  shopBalanceTotal,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PersonalAsset | null>(null);

  const savingsList = assets.filter(
    (a) => a.type === "SAVINGS" || a.type === "CASH_BANK" || a.type === "GOLD_INVESTMENT"
  );

  const personalSavingsTotal = savingsList.reduce((sum, a) => sum + a.amount, 0);
  const totalAllAssets = shopBalanceTotal + personalSavingsTotal;

  const handleOpenAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: PersonalAsset) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleSave = async (payload: any) => {
    if (editingItem) {
      await onEdit(editingItem.id, payload);
    } else {
      await onAdd(payload);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Tổng Hợp Tài Sản & Tích Lũy */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/30 p-4 sm:p-5 rounded-2xl border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Wallet className="w-5 h-5" />
          </span>
          <h3 className="text-base sm:text-lg font-black text-white">
            Quỹ Tích Lũy & Tài Sản
          </h3>
        </div>
        <div className="text-left sm:text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Tổng tài sản tích lũy
          </span>
          <span className="text-xl sm:text-2xl font-mono font-black text-emerald-300">
            {formatVND(totalAllAssets)}
          </span>
        </div>
      </div>

      {/* Grid: 2 Cột - Ví Shop & Tích Lũy Cá Nhân */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Khối 1: Số Dư Các Ví Shop Bank & USDT */}
        <div className="space-y-3">
          <div className="border-b border-slate-800 pb-2">
            <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Landmark className="w-4 h-4 text-cyan-400" />
              1. Ví Shop Bank & USDT
            </h4>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Số Dư Toàn Shop</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  TỰ ĐỘNG SHOP
                </span>
              </div>
              <div className="text-right flex items-center gap-2">
                <span className="font-mono font-black text-cyan-300 text-lg">
                  {formatVND(shopBalanceTotal)}
                </span>
                <button
                  onClick={() => navigate("/payment-wallets")}
                  className="p-2 text-slate-400 hover:text-cyan-300 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Quản lý tài khoản Shop Bank"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Khối 2: Quỹ Tích Lũy Cá Nhân */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              2. Sổ Tiết Kiệm & Quỹ Tích Lũy Cá Nhân
            </h4>
            <button
              onClick={handleOpenAdd}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm Quỹ Tích Lũy
            </button>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl divide-y divide-slate-800/70 overflow-hidden shadow-lg">
            {savingsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Chưa có sổ tiết kiệm hay quỹ tích lũy cá nhân nào. Bấm "Thêm Quỹ Tích Lũy" để tạo hũ để dành.
              </div>
            ) : (
              savingsList.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{item.name}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {item.type === "SAVINGS"
                          ? "Tiết Kiệm"
                          : item.type === "CASH_BANK"
                          ? "Tiền Mặt/Bank"
                          : "Vàng/Đầu tư"}
                      </span>
                    </div>
                    {item.note && <p className="text-xs text-slate-400 italic">{item.note}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-300 text-sm">
                      {formatVND(item.amount)}
                    </span>
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Xóa mục tích lũy "${item.name}"?`)) onDelete(item.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <PersonalAssetsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editingItem={editingItem}
        defaultType="SAVINGS"
      />
    </div>
  );
};
