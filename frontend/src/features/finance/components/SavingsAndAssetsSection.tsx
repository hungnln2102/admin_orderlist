import React, { useState } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { formatVND } from "@/shared/utils";
import { useNotification } from "@/shared/context/NotificationContext";
import { PersonalAsset, PersonalAssetType } from "../types";
import {
  Building2,
  Coins,
  CreditCard,
  Edit2,
  ExternalLink,
  Landmark,
  PiggyBank,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PersonalAssetsModal } from "./PersonalAssetsModal";
import { PersonalBankAccountModal } from "./PersonalBankAccountModal";
import { useNavigate } from "react-router-dom";

interface Props {
  assets: PersonalAsset[];
  shopBalanceTotal: number;
  shopBankAccounts?: any[];
  usdtWallets?: any[];
  onAdd: (payload: any) => Promise<void>;
  onEdit: (id: number, payload: any) => Promise<void>;
  onDelete: (item: any) => Promise<void>;
}

export const SavingsAndAssetsSection: React.FC<Props> = ({
  assets,
  shopBalanceTotal,
  shopBankAccounts = [],
  usdtWallets = [],
  onAdd,
  onEdit,
  onDelete,
}) => {
  const navigate = useNavigate();
  const notify = useNotification();
  const [modalOpen, setModalOpen] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PersonalAsset | null>(null);
  const [editingBankItem, setEditingBankItem] = useState<any | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<PersonalAssetType>("SAVINGS");
  const [assetFilter, setAssetFilter] = useState<"ALL" | "CASH_BANK" | "SAVINGS_INVEST">("ALL");

  const savingsList = assets.filter(
    (a) => a.type === "SAVINGS" || a.type === "CASH_BANK" || a.type === "GOLD_INVESTMENT"
  );

  const walletItems = savingsList.filter((a) => a.type === "CASH_BANK");
  const savingsItems = savingsList.filter((a) => a.type === "SAVINGS" || a.type === "GOLD_INVESTMENT");

  const walletTotal = walletItems.reduce((sum, a) => sum + a.amount, 0);
  const savingsTotal = savingsItems.reduce((sum, a) => sum + a.amount, 0);
  const personalSavingsTotal = savingsList.reduce((sum, a) => sum + a.amount, 0);
  const totalAllAssets = shopBalanceTotal + personalSavingsTotal;

  const displayedList =
    assetFilter === "CASH_BANK"
      ? walletItems
      : assetFilter === "SAVINGS_INVEST"
      ? savingsItems
      : savingsList;

  const handleOpenAdd = (type: PersonalAssetType) => {
    setEditingItem(null);
    setModalDefaultType(type);
    setModalOpen(true);
  };

  const handleOpenAddBank = () => {
    setEditingBankItem(null);
    setBankModalOpen(true);
  };

  const handleOpenEdit = (item: PersonalAsset) => {
    if (item.type === "CASH_BANK") {
      setEditingBankItem(item);
      setBankModalOpen(true);
    } else {
      setEditingItem(item);
      setModalDefaultType(item.type);
      setModalOpen(true);
    }
  };

  const handleSave = async (payload: any) => {
    try {
      if (editingItem) {
        await onEdit(editingItem.id, payload);
        notify.success(`Đã cập nhật mục "${payload.name || editingItem.name}"`);
      } else {
        await onAdd(payload);
        notify.success(`Đã thêm mục "${payload.name}"`);
      }
    } catch (err: any) {
      notify.error(err.message || "Lỗi lưu tài sản");
    }
  };

  const confirmDelete = (item: PersonalAsset) => {
    const isWallet = item.type === "CASH_BANK";
    notify.confirm({
      title: isWallet ? "Xác Nhận Xóa Tài Khoản Cá Nhân" : "Xác Nhận Xóa Quỹ Tích Lũy",
      message: `Bạn có chắc muốn xóa "${item.name}" (${formatVND(item.amount)})?`,
      confirmText: "Xóa Ngay",
      cancelText: "Hủy",
      onConfirm: async () => {
        try {
          await onDelete(item);
          notify.success(`Đã xóa "${item.name}"`);
        } catch (err: any) {
          notify.error(err.message || "Xóa thất bại");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Contextual Stat Cards for Savings & Assets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <GlassCard className="!p-4 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/20 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng Tài Sản Tích Lũy</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-emerald-300 mt-1 block">{formatVND(totalAllAssets)}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Ví Shop + Tiết kiệm & tài khoản cá nhân</span>
        </GlassCard>
        <GlassCard className="!p-4 bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-950 border-cyan-500/20 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Số Dư Ví Shop (Bank & USDT)</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-cyan-300 mt-1 block">{formatVND(shopBalanceTotal)}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">Đồng bộ tự động từ hệ thống</span>
        </GlassCard>
        <GlassCard className="!p-4 bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 border-blue-500/20 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tích Lũy & Tiết Kiệm Cá Nhân</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-teal-300 mt-1 block">{formatVND(personalSavingsTotal)}</span>
          <span className="text-[11px] text-slate-500 mt-1 block">{savingsList.length} tài khoản / sổ tích lũy</span>
        </GlassCard>
      </div>

      {/* 2. Grid: 2 Cột - Ví Shop & Tích Lũy Cá Nhân */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Khối 1: Số Dư Các Ví Shop Bank & USDT */}
        <GlassCard className="!p-5 bg-slate-900/90 border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-cyan-400" />
              <h4 className="text-base font-bold text-white">1. Ví Shop Bank & USDT ({shopBankAccounts.length + usdtWallets.length})</h4>
            </div>

            <button
              onClick={() => navigate("/shop-bank-accounts")}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Quản lý ví Shop</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Tổng Số Dư Shop</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  TỰ ĐỘNG SHOP
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {shopBankAccounts.length} ngân hàng kinh doanh · {usdtWallets.length} ví USDT
              </p>
            </div>

            <div className="text-right">
              <span className="font-mono font-black text-cyan-300 text-lg block">
                {formatVND(shopBalanceTotal)}
              </span>
            </div>
          </div>

          {/* List of Shop Bank Accounts & USDT Wallets */}
          <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto pr-1 space-y-1">
            {shopBankAccounts.map((acc) => (
              <div key={`shop_bank_${acc.id}`} className="py-2.5 flex items-center justify-between hover:bg-slate-800/20 transition-colors rounded-lg px-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{acc.bankDisplayName || acc.label}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">Shop Bank</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{acc.accountNumber} {acc.accountHolder ? `· ${acc.accountHolder}` : ""}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-cyan-300 text-sm block">{formatVND(acc.balance)}</span>
                </div>
              </div>
            ))}

            {usdtWallets.map((wallet) => (
              <div key={`shop_usdt_${wallet.id}`} className="py-2.5 flex items-center justify-between hover:bg-slate-800/20 transition-colors rounded-lg px-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{wallet.label || "Ví USDT"}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">{wallet.network || "USDT"}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono truncate max-w-[200px] sm:max-w-[280px] block" title={wallet.walletAddress}>{wallet.walletAddress}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-purple-300 text-sm block">{Number(wallet.balance || 0).toLocaleString("en-US")} USDT</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Khối 2: Ví & Tích Lũy Cá Nhân */}
        <GlassCard className="!p-5 bg-slate-900/90 border-slate-800 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <div>
                <h4 className="text-base font-bold text-white">
                  2. Tài Khoản & Tích Lũy Cá Nhân ({savingsList.length})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Tài khoản cá nhân: <span className="font-mono font-bold text-cyan-300">{formatVND(walletTotal)}</span> · Tiết kiệm: <span className="font-mono font-bold text-emerald-300">{formatVND(savingsTotal)}</span>
                </p>
              </div>
            </div>

            {/* Cặp nút hành động: Thêm Ví Cá Nhân vs Thêm Sổ Tiết Kiệm */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAddBank}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Thêm tài khoản ngân hàng cá nhân"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>+ Tài Khoản Cá Nhân</span>
              </button>

              <button
                onClick={() => handleOpenAdd("SAVINGS")}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Thêm sổ tiết kiệm hoặc tài sản đầu tư có sinh lời"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Sổ Tiết Kiệm</span>
              </button>
            </div>
          </div>

          {/* Sub-tabs / Bộ lọc phân loại */}
          {savingsList.length > 0 && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
              <button
                type="button"
                onClick={() => setAssetFilter("ALL")}
                className={`flex-1 py-1 px-2 rounded-lg font-medium transition-colors cursor-pointer text-center ${
                  assetFilter === "ALL"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Tất cả ({savingsList.length})
              </button>
              <button
                type="button"
                onClick={() => setAssetFilter("CASH_BANK")}
                className={`flex-1 py-1 px-2 rounded-lg font-medium transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  assetFilter === "CASH_BANK"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:text-cyan-300"
                }`}
              >
                <CreditCard className="w-3 h-3" />
                <span>Tài Khoản Cá Nhân ({walletItems.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setAssetFilter("SAVINGS_INVEST")}
                className={`flex-1 py-1 px-2 rounded-lg font-medium transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  assetFilter === "SAVINGS_INVEST"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-400 hover:text-emerald-300"
                }`}
              >
                <PiggyBank className="w-3 h-3" />
                <span>Sổ Tiết Kiệm ({savingsItems.length})</span>
              </button>
            </div>
          )}

          {displayedList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-1">
              {savingsList.length === 0 ? (
                <>
                  <p className="font-semibold text-slate-400">Chưa có tài khoản cá nhân hay sổ tiết kiệm nào.</p>
                  <p>Bấm <strong className="text-cyan-300">+ Tài Khoản Cá Nhân</strong> để ghi nhận tài khoản riêng, hoặc <strong className="text-emerald-300">+ Sổ Tiết Kiệm</strong> để tạo hũ để dành.</p>
                </>
              ) : assetFilter === "CASH_BANK" ? (
                <>
                  <p className="font-semibold text-slate-400">Chưa có tài khoản cá nhân nào.</p>
                  <p>Bấm <strong className="text-cyan-300">+ Tài Khoản Cá Nhân</strong> để thêm tài khoản ngân hàng của bạn.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-slate-400">Chưa có sổ tiết kiệm hay tài sản đầu tư nào.</p>
                  <p>Bấm <strong className="text-emerald-300">+ Sổ Tiết Kiệm</strong> để thêm sổ tích lũy.</p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 max-h-80 overflow-y-auto pr-1">
              {displayedList.map((item) => {
                const isWallet = item.type === "CASH_BANK";
                const isSavings = item.type === "SAVINGS";
                return (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between hover:bg-slate-800/20 transition-colors rounded-lg px-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        {isWallet ? (
                          <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-400">
                            <CreditCard className="w-3.5 h-3.5" />
                          </div>
                        ) : isSavings ? (
                          <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">
                            <PiggyBank className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="p-1 rounded-md bg-amber-500/10 text-amber-400">
                            <Coins className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="text-sm font-bold text-white truncate max-w-[280px] sm:max-w-[420px]" title={item.name}>{item.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isWallet
                              ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                              : isSavings
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                          }`}
                        >
                          {isWallet
                            ? "Tài Khoản Cá Nhân"
                            : isSavings
                            ? "Sổ Tiết Kiệm"
                            : "Vàng / Đầu Tư"}
                        </span>
                      </div>
                      {item.note && <p className="text-xs text-slate-400 italic">{item.note}</p>}
                      {item.profitEnabled && (
                        <p className="text-[11px] text-purple-300 font-mono">
                          Sinh lời {item.annualInterestRate || 0}%/năm ·{" "}
                          {item.profitFrequency === "DAILY"
                            ? "Theo ngày"
                            : item.profitFrequency === "YEARLY"
                            ? "Theo năm"
                            : "Theo tháng"}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono font-bold text-sm ${
                          isWallet ? "text-cyan-300" : "text-emerald-300"
                        }`}
                      >
                        {formatVND(item.amount)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => confirmDelete(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Modals */}
      <PersonalAssetsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editingItem={editingItem}
        defaultType={modalDefaultType}
      />

      <PersonalBankAccountModal
        isOpen={bankModalOpen}
        onClose={() => {
          setBankModalOpen(false);
          setEditingBankItem(null);
        }}
        onSuccess={() => window.location.reload()}
        editingItem={editingBankItem}
      />
    </div>
  );
};
