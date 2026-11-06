import React, { useState, useMemo } from "react";
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
import { PersonalFinanceBalanceLogSection } from "./PersonalFinanceBalanceLogSection";
import { useNavigate } from "react-router-dom";

interface Props {
  assets: PersonalAsset[];
  shopBalanceTotal: number;
  shopBankAccounts?: any[];
  usdtWallets?: any[];
  onAdd: (payload: any) => Promise<void>;
  onEdit: (id: number, payload: any) => Promise<void>;
  onDelete: (item: any) => Promise<void>;
  onRefresh?: () => void;
}

export const SavingsAndAssetsSection: React.FC<Props> = ({
  assets,
  shopBalanceTotal,
  shopBankAccounts = [],
  usdtWallets = [],
  onAdd,
  onEdit,
  onDelete,
  onRefresh,
}) => {

  const navigate = useNavigate();
  const notify = useNotification();
  const [modalOpen, setModalOpen] = useState(false);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PersonalAsset | null>(null);
  const [editingBankItem, setEditingBankItem] = useState<any | null>(null);
  const [modalDefaultType, setModalDefaultType] = useState<PersonalAssetType>("SAVINGS");
  const [accountFilter, setAccountFilter] = useState<"ALL" | "SHOP" | "PERSONAL">("ALL");

  const savingsList = assets.filter(
    (a) => a.type === "SAVINGS" || a.type === "CASH_BANK" || a.type === "GOLD_INVESTMENT"
  );

  const walletItems = savingsList.filter((a) => a.type === "CASH_BANK");
  const savingsItems = savingsList.filter((a) => a.type === "SAVINGS" || a.type === "GOLD_INVESTMENT");

  const walletTotal = walletItems.reduce((sum, a) => sum + a.amount, 0);
  const savingsTotal = savingsItems.reduce((sum, a) => sum + a.amount, 0);
  const personalSavingsTotal = savingsList.reduce((sum, a) => sum + a.amount, 0);
  const totalAllAssets = shopBalanceTotal + personalSavingsTotal;

  interface UnifiedAccountItem {
    id: string;
    scope: "SHOP" | "PERSONAL";
    subType: "SHOP_BANK" | "SHOP_USDT" | "PERSONAL_BANK" | "PERSONAL_SAVINGS" | "PERSONAL_INVEST";
    scopeLabel: string;
    bankName: string;
    accountNumber: string;
    accountHolder?: string;
    amount: number;
    isUSDT?: boolean;
    usdtAmount?: number;
    note?: string;
    profitRate?: number;
    cardLastDigits?: string | null;
    rawItem: any;
  }

  const unifiedAccounts: UnifiedAccountItem[] = useMemo(() => {
    const list: UnifiedAccountItem[] = [];

    // 1. Shop Bank Accounts
    shopBankAccounts.forEach((acc) => {
      list.push({
        id: `shop_bank_${acc.id}`,
        scope: "SHOP",
        subType: "SHOP_BANK",
        scopeLabel: "Shop Bank",
        bankName: acc.bankDisplayName || acc.label || "Shop Bank",
        accountNumber: acc.accountNumber || "-",
        accountHolder: acc.accountHolder || "",
        amount: Number(acc.balance || 0),
        cardLastDigits: acc.cardLastDigits || null,
        rawItem: acc,
      });
    });

    // 2. Shop USDT Wallets
    usdtWallets.forEach((wallet) => {
      list.push({
        id: `shop_usdt_${wallet.id}`,
        scope: "SHOP",
        subType: "SHOP_USDT",
        scopeLabel: "Shop USDT",
        bankName: wallet.label || "Ví USDT",
        accountNumber: wallet.walletAddress || "-",
        accountHolder: wallet.network || "USDT",
        amount: 0,
        isUSDT: true,
        usdtAmount: Number(wallet.balance || 0),
        rawItem: wallet,
      });
    });

    // 3. Personal Savings / Bank / Gold
    savingsList.forEach((item) => {
      const isWallet = item.type === "CASH_BANK";
      const isSavings = item.type === "SAVINGS";

      let stk = (item as any).accountNumber || (item as any).account_number || "";
      if (!stk && isWallet) {
        const match = String(item.name || "").match(/\(([0-9a-zA-Z]+)\)/);
        if (match) stk = match[1];
      }

      let bankName = (item as any).bankDisplayName || (item as any).bank_display_name || (item as any).bankShortCode || "";
      if (!bankName) {
        if (isWallet) {
          bankName = String(item.name || "")
            .replace(/\s*[-–—]\s*Tài khoản cá nhân/gi, "")
            .replace(/\s*\([0-9a-zA-Z]{5,}\)/g, "")
            .trim();
        } else {
          bankName = item.name;
        }
      }
      if (!bankName) bankName = isWallet ? "Ngân hàng cá nhân" : item.name;
      bankName = String(bankName).replace(/\s*\([A-Za-z0-9]{2,6}\)/g, "").trim();

      let accountHolder = (item as any).accountHolder || (item as any).account_holder || "";
      if (!accountHolder && item.note && item.note.includes("Chủ TK:")) {
        accountHolder = item.note.replace("Chủ TK:", "").trim();
      }

      list.push({
        id: `personal_${item.id}`,
        scope: "PERSONAL",
        subType: isWallet ? "PERSONAL_BANK" : isSavings ? "PERSONAL_SAVINGS" : "PERSONAL_INVEST",
        scopeLabel: isWallet ? "Cá Nhân" : isSavings ? "Tiết Kiệm" : "Đầu Tư",
        bankName,
        accountNumber: stk || (isWallet ? "-" : "Sổ tích lũy"),
        accountHolder,
        amount: item.amount,
        note: item.note && !item.note.startsWith("Chủ TK:") ? item.note : undefined,
        profitRate: item.profitEnabled ? item.annualInterestRate : undefined,
        cardLastDigits: (item as any).cardLastDigits || (item as any).card_last_digits || null,
        rawItem: item,
      });
    });

    return list;
  }, [shopBankAccounts, usdtWallets, savingsList]);

  const shopAccountsCount = shopBankAccounts.length + usdtWallets.length;
  const personalAccountsCount = savingsList.length;

  const filteredAccounts = useMemo(() => {
    if (accountFilter === "SHOP") return unifiedAccounts.filter((a) => a.scope === "SHOP");
    if (accountFilter === "PERSONAL") return unifiedAccounts.filter((a) => a.scope === "PERSONAL");
    return unifiedAccounts;
  }, [unifiedAccounts, accountFilter]);

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

      {/* 2. BẢNG 1: BẢNG HỢP NHẤT TÀI KHOẢN & VÍ (SHOP & CÁ NHÂN) - 1 BẢNG DUY NHẤT */}
      <GlassCard className="!p-4 sm:!p-5 bg-slate-900/90 border-slate-800 rounded-2xl space-y-4">
        {/* Header Bảng Hợp Nhất */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800 pb-3.5 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                1. Danh Mục Tài Khoản & Ví (Shop & Cá Nhân)
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {unifiedAccounts.length} tài khoản
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Ví Shop: <span className="font-mono font-bold text-cyan-300">{formatVND(shopBalanceTotal)}</span> ({shopAccountsCount} ví) · 
                Cá nhân: <span className="font-mono font-bold text-emerald-300">{formatVND(personalSavingsTotal)}</span> ({personalAccountsCount} tài khoản/sổ)
              </p>
            </div>
          </div>

          {/* Nhóm Bộ Lọc & Nút Hành Động */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Bộ lọc phân loại */}
            <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setAccountFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  accountFilter === "ALL"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Tất cả ({unifiedAccounts.length})
              </button>
              <button
                type="button"
                onClick={() => setAccountFilter("SHOP")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  accountFilter === "SHOP"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:text-cyan-300"
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Ví Shop ({shopAccountsCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setAccountFilter("PERSONAL")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  accountFilter === "PERSONAL"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-400 hover:text-emerald-300"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Cá Nhân ({personalAccountsCount})</span>
              </button>
            </div>

            {/* Các nút thêm mới & Quản lý */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleOpenAddBank}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Thêm tài khoản ngân hàng cá nhân"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+ TK Cá Nhân</span>
                <span className="sm:hidden">+ TK</span>
              </button>

              <button
                onClick={() => handleOpenAdd("SAVINGS")}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Thêm sổ tiết kiệm hoặc tài sản đầu tư có sinh lời"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+ Sổ Tiết Kiệm</span>
                <span className="sm:hidden">+ Sổ</span>
              </button>

              <button
                onClick={() => navigate("/shop-bank-accounts")}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                title="Đến trang quản lý cấu hình các tài khoản ngân hàng shop"
              >
                <span>Ví Shop</span>
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Bảng Hiển Thị Hợp Nhất 1 Bảng Duy Nhất */}
        {filteredAccounts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl space-y-1">
            <p className="font-semibold text-slate-400">Không tìm thấy tài khoản hoặc ví nào phù hợp.</p>
            <p>Bấm các nút phía trên để tạo tài khoản cá nhân, sổ tiết kiệm hoặc quản lý ví shop.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full rounded-xl border border-slate-800 max-h-[460px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-800 whitespace-nowrap">
                  <th className="py-3 px-4 w-28 sm:w-32">Phân Loại</th>
                  <th className="py-3 px-4 min-w-[160px] sm:min-w-[200px]">Ngân Hàng / Ví</th>
                  <th className="py-3 px-4 min-w-[180px]">STK / Địa Chỉ</th>
                  <th className="py-3 px-4 text-right min-w-[140px]">Số Tiền</th>
                  <th className="py-3 px-4 text-center w-24 sm:w-28">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredAccounts.map((acc) => {
                  const isShop = acc.scope === "SHOP";
                  const isUSDT = !!acc.isUSDT;
                  const isWallet = acc.subType === "PERSONAL_BANK";
                  const isSavings = acc.subType === "PERSONAL_SAVINGS";
                  const isInvest = acc.subType === "PERSONAL_INVEST";

                  // Badge Phân Loại
                  const badgeColor = isShop
                    ? isUSDT
                      ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                      : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                    : isWallet
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : isSavings
                    ? "bg-teal-500/15 text-teal-300 border-teal-500/30"
                    : "bg-amber-500/15 text-amber-300 border-amber-500/30";

                  // Icon
                  const IconComp = isShop
                    ? isUSDT
                      ? Wallet
                      : Building2
                    : isWallet
                    ? CreditCard
                    : isSavings
                    ? PiggyBank
                    : Coins;

                  return (
                    <tr
                      key={acc.id}
                      className="hover:bg-slate-800/25 transition-colors whitespace-nowrap"
                    >
                      {/* Cột 1: Phân Loại */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                            {acc.scopeLabel}
                          </span>
                        </div>
                      </td>

                      {/* Cột 2: Ngân Hàng / Ví */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg shrink-0 ${
                            isShop ? (isUSDT ? "bg-purple-500/10 text-purple-400" : "bg-cyan-500/10 text-cyan-400") : "bg-emerald-500/10 text-emerald-400"
                          }`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-200 text-xs block truncate max-w-[200px] sm:max-w-[280px]" title={acc.bankName}>
                              {acc.bankName}
                            </span>
                            {acc.note && (
                              <p className="text-[11px] text-slate-400 italic truncate max-w-[200px]" title={acc.note}>
                                {acc.note}
                              </p>
                            )}
                            {acc.profitRate ? (
                              <span className="text-[10px] font-mono text-purple-300">
                                Sinh lời {acc.profitRate}%/năm
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Cột 3: STK / Địa Chỉ */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-white text-xs block truncate max-w-[220px]" title={acc.accountNumber}>
                              {acc.accountNumber}
                            </span>
                            {acc.cardLastDigits && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700 whitespace-nowrap" title="4 số cuối thẻ ATM / Debit">
                                Thẻ: •••• {acc.cardLastDigits}
                              </span>
                            )}
                          </div>
                          {acc.accountHolder && (
                            <span className="text-[11px] text-slate-400 font-mono block truncate max-w-[220px]" title={acc.accountHolder}>
                              {acc.accountHolder.startsWith("Chủ TK:") ? acc.accountHolder : `Chủ TK: ${acc.accountHolder}`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cột 4: Số Tiền */}
                      <td className="py-3 px-4 text-right">
                        {isUSDT ? (
                          <span className="font-mono font-bold text-purple-300 text-sm block">
                            {acc.usdtAmount?.toLocaleString("en-US")} USDT
                          </span>
                        ) : (
                          <span className={`font-mono font-bold text-sm block ${
                            isShop ? "text-cyan-300" : "text-emerald-300"
                          }`}>
                            {formatVND(acc.amount)}
                          </span>
                        )}
                      </td>

                      {/* Cột 5: Thao Tác */}
                      <td className="py-3 px-4 text-center">
                        {isShop ? (
                          <button
                            onClick={() => navigate("/shop-bank-accounts")}
                            className="p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold"
                            title="Quản lý cấu hình tại Ví Shop"
                          >
                            <span>Ví Shop</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit(acc.rawItem)}
                              className="p-1.5 text-slate-400 hover:text-cyan-300 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Chỉnh sửa tài khoản"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => confirmDelete(acc.rawItem)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Xóa tài khoản"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* 3. Nhật Ký Chốt Tài Chính & Stat Tròn Biến Động */}
      <PersonalFinanceBalanceLogSection
        assets={assets}
        shopBalanceTotal={shopBalanceTotal}
        onSyncComplete={onRefresh}
      />


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
