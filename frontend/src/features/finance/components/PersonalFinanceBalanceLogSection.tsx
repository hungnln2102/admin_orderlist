import React, { useState, useEffect, useCallback, useMemo } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { formatVND } from "@/shared/utils";
import { useNotification } from "@/shared/context/NotificationContext";
import { PersonalAsset } from "../types";
import { PersonalDebitTransactionsSection } from "./PersonalDebitTransactionsSection";
import { BalanceSnapshotModal, BalanceSnapshotFormItem } from "./BalanceSnapshotModal";
import {
  Calendar,
  History,
  Landmark,
  Loader2,
  PiggyBank,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
  Trash2,
  CreditCard,
  Coins,
  ArrowUpDown,
} from "lucide-react";

export interface DynamicAssetColumn {
  key: string;
  name: string;
  type?: string;
  assetId?: number;
  bankAccountId?: number;
}

export interface SnapshotItem {
  name: string;
  amount: number;
  type?: string;
  accountId?: number;
  bankAccountId?: number;
  assetId?: number;
}

export interface PersonalBalanceSnapshot {
  id: number;
  snapshotDate: string;
  totalBalance: number;
  personalBalance: number;
  shopBalance: number;
  previousBalance: number;
  deltaAmount: number;
  deltaPercent: number;
  balancesDetail: SnapshotItem[];
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LatestComparison {
  latest: PersonalBalanceSnapshot;
  previous: PersonalBalanceSnapshot | null;
  deltaAmount: number;
  deltaPercent: number;
  isIncrease: boolean;
}

interface Props {
  assets: PersonalAsset[];
  shopBalanceTotal?: number;
  onSyncComplete?: () => void;
}

const formatAmountInput = (value: string | number) => {
  const digits = String(value).replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("vi-VN") : "";
};

const parseAmountInput = (value: string) => Number(value.replace(/\D/g, "")) || 0;

const formatDateVN = (dateStr?: string) => {
  if (!dateStr) return "";
  const parts = dateStr.slice(0, 10).split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const getTodayVNDateString = () => {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
};

export const PersonalFinanceBalanceLogSection: React.FC<Props> = ({
  assets,
  shopBalanceTotal = 0,
  onSyncComplete,
}) => {
  const notify = useNotification();
  const [snapshots, setSnapshots] = useState<PersonalBalanceSnapshot[]>([]);
  const [latestComparison, setLatestComparison] = useState<LatestComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"SNAPSHOT_HISTORY" | "DEBIT_TRANSACTIONS">("SNAPSHOT_HISTORY");

  // Form State in Modal (điền 1 lần rồi thôi)
  // Ngày hiện tại theo múi giờ Việt Nam (UTC+7) - tự động nhảy sang ngày kế tiếp khi qua 0h
  const [currentDateVN, setCurrentDateVN] = useState<string>(getTodayVNDateString);

  useEffect(() => {
    const timer = setInterval(() => {
      const nowVN = getTodayVNDateString();
      if (nowVN !== currentDateVN) {
        setCurrentDateVN(nowVN);
      }
    }, 15000); // Mỗi 15s kiểm tra 1 lần để phát hiện khi qua 0h
    return () => clearInterval(timer);
  }, [currentDateVN]);

  // Kiểm tra xem ngày hôm nay đã được chốt sổ chưa
  const isTodayFinalized = useMemo(() => {
    return snapshots.some((s) => s.snapshotDate && s.snapshotDate.slice(0, 10) === currentDateVN);
  }, [snapshots, currentDateVN]);

  // Form State in Modal
  const [formDate, setFormDate] = useState<string>(() => getTodayVNDateString());
  const [formItems, setFormItems] = useState<BalanceSnapshotFormItem[]>([]);
  const [formAutoSync, setFormAutoSync] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  // Danh sách các cột tài sản cá nhân động (ĐỒNG BỘ 100% THEO NGUỒN CHÍNH: 2. Tài Khoản & Tích Lũy Cá Nhân)
  const dynamicColumns = useMemo<DynamicAssetColumn[]>(() => {
    const list: DynamicAssetColumn[] = [];
    const seenKeys = new Set<string>();

    // 1. Nạp từ danh sách assets hiện tại (Tài khoản cá nhân, Sổ tiết kiệm, Vàng...) - NGUỒN CHÍNH
    const validAssets = (assets || []).filter(
      (a) => a.type === "CASH_BANK" || a.type === "SAVINGS" || a.type === "GOLD_INVESTMENT"
    );

    for (const a of validAssets) {
      const key = (a as any).assetId ? `asset_${(a as any).assetId}` : `asset_${a.id}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        list.push({
          key,
          name: a.name,
          type: a.type,
          assetId: (a as any).assetId || a.id,
          bankAccountId: (a as any).bankAccountId,
        });
      }
    }

    // 2. Chỉ bổ sung cột từ snapshot quá khứ nếu có bản ghi lịch sử thật
    for (const snap of snapshots) {
      if (Array.isArray(snap.balancesDetail)) {
        for (const it of snap.balancesDetail) {
          if (!it || !it.name) continue;
          const key = it.assetId ? `asset_${it.assetId}` : it.bankAccountId ? `bank_${it.bankAccountId}` : `name_${it.name.trim().toLowerCase()}`;
          const exists = list.some(
            (c) =>
              c.key === key ||
              (it.assetId && c.assetId === it.assetId) ||
              (it.bankAccountId && c.bankAccountId === it.bankAccountId) ||
              c.name.trim().toLowerCase() === it.name.trim().toLowerCase()
          );
          if (!exists) {
            seenKeys.add(key);
            list.push({
              key,
              name: it.name,
              type: it.type || "SAVINGS",
              assetId: it.assetId,
              bankAccountId: it.bankAccountId,
            });
          }
        }
      }
    }

    return list;
  }, [assets, snapshots]);

  // Hàm trích xuất số tiền của 1 tài khoản trong 1 snapshot
  const getCellData = (
    snap: PersonalBalanceSnapshot,
    col: DynamicAssetColumn
  ): number | null => {
    if (!snap.balancesDetail || !Array.isArray(snap.balancesDetail)) return null;
    if (col.assetId) {
      const found = snap.balancesDetail.find((it) => it.assetId === col.assetId);
      if (found) return Number(found.amount) || 0;
    }
    if (col.bankAccountId) {
      const found = snap.balancesDetail.find((it) => it.bankAccountId === col.bankAccountId);
      if (found) return Number(found.amount) || 0;
    }
    const normName = col.name.trim().toLowerCase();
    const foundByName = snap.balancesDetail.find(
      (it) => it.name && it.name.trim().toLowerCase() === normName
    );
    if (foundByName) return Number(foundByName.amount) || 0;
    return null;
  };

  // Trích xuất số tiền realtime của 1 cột tài sản cho dòng Live Chưa Chốt (CHỈ LẤY TỪ NGUỒN CHÍNH assets)
  const getLiveColumnValue = useCallback(
    (col: DynamicAssetColumn): number => {
      // Tìm trong danh sách assets hiện tại (Nguồn chính)
      if (col.assetId) {
        const found = (assets || []).find(
          (a) => (a as any).assetId === col.assetId || a.id === col.assetId
        );
        if (found) return Number(found.amount) || 0;
      }
      if (col.bankAccountId) {
        const found = (assets || []).find(
          (a) => (a as any).bankAccountId === col.bankAccountId
        );
        if (found) return Number(found.amount) || 0;
      }
      const normName = col.name.trim().toLowerCase();
      const foundByName = (assets || []).find(
        (a) => a.name && a.name.trim().toLowerCase() === normName
      );
      if (foundByName) return Number(foundByName.amount) || 0;

      // Nếu không tồn tại trong Nguồn chính thì số dư live là 0, tuyệt đối không tự bịa số liệu
      return 0;
    },
    [assets]
  );

  // Tổng tài sản cá nhân realtime cho dòng Live
  const livePersonalTotal = useMemo(() => {
    return dynamicColumns.reduce((sum, col) => sum + getLiveColumnValue(col), 0);
  }, [dynamicColumns, getLiveColumnValue]);

  // Tổng tài sản toàn diện realtime cho dòng Live (Cá nhân Live + Shop Live)
  const liveGrandTotal = livePersonalTotal + (shopBalanceTotal || 0);

  // Render số tiền trong ô kèm icon TrendingUp/TrendingDown so sánh với log cũ gần nhất
  const renderCellAmount = (
    currVal: number | null,
    diff: number,
    colorClass = "text-emerald-300"
  ) => {
    if (currVal === null) {
      return <span className="text-slate-600 font-mono">-</span>;
    }

    return (
      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
        <span className={`font-mono font-bold text-xs ${colorClass}`}>
          {formatVND(currVal)}
        </span>
        {diff > 0 && (
          <span
            className="inline-flex items-center text-emerald-400"
            title={`Tăng +${formatVND(diff)} so với lần chốt trước`}
          >
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
          </span>
        )}
        {diff < 0 && (
          <span
            className="inline-flex items-center text-rose-400"
            title={`Giảm ${formatVND(diff)} so với lần chốt trước`}
          >
            <TrendingDown className="w-3.5 h-3.5 shrink-0" />
          </span>
        )}
      </div>
    );
  };

  const fetchSnapshots = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/finance/personal-balance-snapshots");
      const json = await res.json();
      if (json.success && json.data) {
        setSnapshots(json.data.snapshots || []);
        setLatestComparison(json.data.latestComparison || null);
      }
    } catch (err: any) {
      console.error("Error fetching personal balance snapshots:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  // Chuẩn bị form khi mở Modal Chốt Tài Chính (LUÔN LẤY 100% TỪ NGUỒN CHÍNH: 2. Tài Khoản & Tích Lũy Cá Nhân)
  const handleOpenCreateModal = (targetDate?: string) => {
    setFormDate(targetDate || currentDateVN || getTodayVNDateString());
    setFormAutoSync(true);

    // Lấy danh sách tài sản cá nhân hợp lệ từ NGUỒN CHÍNH
    const currentValidAssets = (assets || []).filter(
      (a) => a.type === "CASH_BANK" || a.type === "SAVINGS" || a.type === "GOLD_INVESTMENT"
    );

    const items = currentValidAssets.map((a, idx) => ({
      id: `item_${idx}`,
      name: a.name,
      amountStr: formatAmountInput(a.amount),
      type: a.type,
      bankAccountId: (a as any).bankAccountId,
      assetId: (a as any).assetId || a.id,
    }));

    setFormItems(items);
    setModalOpen(true);
  };

  const handleAddItemRow = () => {
    setFormItems((prev) => [
      ...prev,
      { id: `new_${Date.now()}`, name: "", amountStr: "" },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: "name" | "amountStr", value: string) => {
    setFormItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          if (field === "amountStr") {
            return { ...item, amountStr: formatAmountInput(value) };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const formLivePersonalTotal = useMemo(() => {
    return formItems.reduce((sum, it) => sum + parseAmountInput(it.amountStr), 0);
  }, [formItems]);

  const formGrandTotal = formLivePersonalTotal + (shopBalanceTotal || 0);

  const handleSubmitSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate) {
      notify.error("Vui lòng chọn ngày chốt tài chính");
      return;
    }
    const cleanItems = formItems
      .filter((it) => it.name.trim() !== "")
      .map((it) => ({
        name: it.name.trim(),
        amount: parseAmountInput(it.amountStr),
        type: it.type,
        bankAccountId: it.bankAccountId,
        assetId: it.assetId,
      }));

    if (cleanItems.length === 0) {
      notify.error("Vui lòng nhập ít nhất 1 tài khoản/hũ tài chính cá nhân");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/finance/personal-balance-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snapshotDate: formDate,
          items: cleanItems,
          personalBalance: formLivePersonalTotal,
          shopBalance: shopBalanceTotal || 0,
          autoSyncCurrentBalance: formAutoSync,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Không thể lưu chốt tài chính");
      }

      notify.success(`Đã chốt tài chính thành công ngày ${formatDateVN(formDate)}!`);
      setModalOpen(false);
      await fetchSnapshots();
      if (onSyncComplete && formAutoSync) {
        onSyncComplete();
      }
    } catch (err: any) {
      notify.error(err.message || "Lỗi khi lưu chốt tài chính");
    } finally {
      setSubmitting(false);
    }
  };

  // Tính toán vòng tròn Stat Tròn SVG (đo % biến động Tổng Tài Sản)
  const circularMetrics = useMemo(() => {
    if (!latestComparison || !latestComparison.previous) {
      return {
        percent: 0,
        absPercent: 0,
        isIncrease: true,
        deltaAmount: 0,
        strokeDashoffset: 0,
        hasComparison: false,
      };
    }
    const deltaAmount = latestComparison.deltaAmount;
    const percent = latestComparison.deltaPercent;
    const isIncrease = deltaAmount >= 0;
    const absPercent = Math.abs(percent);

    // Chu vi vòng tròn bán kính 48 = 2 * PI * 48 = ~301.6
    const circumference = 2 * Math.PI * 48;
    const fillRatio = Math.min(100, Math.max(0, absPercent)) / 100;
    const strokeDashoffset = circumference * (1 - fillRatio);

    return {
      percent,
      absPercent,
      isIncrease,
      deltaAmount,
      circumference,
      strokeDashoffset,
      hasComparison: true,
      latestDate: latestComparison.latest.snapshotDate,
      previousDate: latestComparison.previous.snapshotDate,
      latestTotal: latestComparison.latest.totalBalance,
      latestPersonal: latestComparison.latest.personalBalance,
      latestShop: latestComparison.latest.shopBalance,
      previousTotal: latestComparison.previous.totalBalance,
    };
  }, [latestComparison]);

  return (
    <div className="space-y-4 pt-1">
      {/* 2. BẢNG ĐỐI SOÁT & DÒNG TIỀN VỚI 2 TABS CHUYỂN ĐỔI FULL-WIDTH */}
      <GlassCard className="!p-4 sm:!p-5 bg-slate-900/90 border-slate-800 rounded-2xl space-y-4">
        {/* Header với 2 Tab Chuyển Đổi Ở Đầu Form */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800 pb-3.5 gap-3">
          {/* Sub-tabs chuyển đổi giữa 2 bảng */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("SNAPSHOT_HISTORY")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "SNAPSHOT_HISTORY"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <History className="w-4 h-4 text-cyan-400" />
              <span>Lịch Sử Chốt Số Dư</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                {snapshots.length}
              </span>
              {!isTodayFinalized && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  +1 live
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("DEBIT_TRANSACTIONS")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "DEBIT_TRANSACTIONS"
                  ? "bg-pink-500/20 text-pink-300 border border-pink-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ArrowUpDown className="w-4 h-4 text-pink-400" />
              <span>Sổ Biến Động Thu / Chi Cá Nhân</span>
              {selectedDateFilter && (
                <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Ngày {formatDateVN(selectedDateFilter)}
                </span>
              )}
            </button>
          </div>

          {/* Action buttons góc phải */}
          <div className="flex items-center gap-2 shrink-0">
            {activeTab === "SNAPSHOT_HISTORY" && (
              <>
                {circularMetrics.hasComparison && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono border ${
                      circularMetrics.isIncrease
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    }`}
                    title={`So với lần chốt trước: ${formatVND(circularMetrics.deltaAmount)}`}
                  >
                    {circularMetrics.isIncrease ? (
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span>
                      {circularMetrics.isIncrease ? "+" : "-"}
                      {circularMetrics.absPercent.toFixed(1)}% so với lần trước
                    </span>
                  </span>
                )}

                <button
                  onClick={fetchSnapshots}
                  disabled={loading}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
                  title="Làm mới lịch sử"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
                </button>
                <button
                  onClick={() => handleOpenCreateModal()}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Chốt Số Dư</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Nội Dung Tương Ứng Với Tab */}
        {activeTab === "SNAPSHOT_HISTORY" ? (
          <div>
            {loading && snapshots.length === 0 ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            <span className="text-xs">Đang tải lịch sử số dư...</span>
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full rounded-xl border border-slate-800 max-h-[520px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-300 uppercase tracking-wider font-semibold border-b border-slate-800 whitespace-nowrap">
                  <th className="py-3 px-4 sticky left-0 bg-slate-950 z-10">Ngày Chốt</th>

                  {/* Render từng cột tài sản cá nhân & sổ tiết kiệm riêng biệt */}
                  {dynamicColumns.length === 0 ? (
                    <th className="py-3 px-4 text-right min-w-[140px]">
                      <div className="flex items-center justify-end gap-1.5 text-emerald-400">
                        <PiggyBank className="w-4 h-4" />
                        <span>Tài Sản Cá Nhân</span>
                      </div>
                    </th>
                  ) : (
                    dynamicColumns.map((col) => {
                      const isBank = col.type === "CASH_BANK";
                      const isGold = col.type === "GOLD_INVESTMENT";
                      const IconComp = isBank ? CreditCard : isGold ? Coins : PiggyBank;
                      const colorClass = isBank
                        ? "text-cyan-400"
                        : isGold
                        ? "text-yellow-400"
                        : "text-emerald-400";

                      return (
                        <th key={col.key} className="py-3 px-4 text-right min-w-[140px]">
                          <div className={`flex items-center justify-end gap-1.5 ${colorClass}`}>
                            <IconComp className="w-3.5 h-3.5 shrink-0" />
                            {(() => {
                            const cleanName = col.name
                              .replace(/\s*[-–—]\s*Tài khoản cá nhân/gi, "")
                              .replace(/\s*\([A-Za-z0-9]{2,6}\)/g, "")
                              .trim();
                            return (
                              <span className="truncate max-w-[160px]" title={cleanName}>
                                {cleanName}
                              </span>
                            );
                          })()}
  
                          </div>
                        </th>
                      );
                    })
                  )}

                  {/* Cột Tài Sản Shop */}
                  <th className="py-3 px-4 text-right min-w-[140px]">
                    <div className="flex items-center justify-end gap-1.5 text-cyan-400">
                      <Landmark className="w-4 h-4 shrink-0" />
                      <span>Tài Sản Shop</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        TỰ ĐỘNG
                      </span>
                    </div>
                  </th>

                  {/* Cột Tổng Tài Sản Toàn Diện */}
                  <th className="py-3 px-4 text-right min-w-[140px] text-white">Tổng Tài Sản</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {/* DÒNG SỐ DƯ CHƯA CHỐT (LIVE REALTIME CHO NGÀY HÔM NAY - TỰ ĐỔI NGÀY QUA 0H) */}
                {!isTodayFinalized && (
                  <tr onClick={() => { setSelectedDateFilter(currentDateVN); setActiveTab("DEBIT_TRANSACTIONS"); notify.info(`Đang xem giao dịch ngày ${formatDateVN(currentDateVN)}`); }} title="Click để xem chi tiết các khoản thu/chi của ngày hôm nay" className={`border-b-2 transition-all whitespace-nowrap shadow-inner group cursor-pointer ${selectedDateFilter === currentDateVN ? "bg-amber-500/25 border-amber-400 ring-1 ring-inset ring-amber-400/50" : "bg-gradient-to-r from-amber-500/15 via-slate-900/80 to-amber-500/10 border-amber-500/40 hover:bg-amber-500/20"}`}>

                    {/* Ngày chốt Live (Sticky Left) */}
                    <td className="py-3.5 px-4 font-mono font-bold text-white sticky left-0 bg-slate-900/95 z-10 border-r border-amber-500/25 shadow-md">
                      <div className="flex items-center gap-2">
                        <div className="relative flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-amber-400" />
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        </div>
                        <span className="text-amber-300 font-extrabold text-sm">{formatDateVN(currentDateVN)}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 tracking-wider shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Chưa Chốt
                        </span>
                        <button
                          onClick={() => handleOpenCreateModal(currentDateVN)}
                          className="ml-1 px-2 py-0.5 text-[10px] font-extrabold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 rounded-md shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                          title={`Chốt số dư cho ngày ${formatDateVN(currentDateVN)}`}
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                          <span>Chốt Ngay</span>
                        </button>
                      </div>
                    </td>

                    {/* Các cột tài sản cá nhân riêng biệt (Live) */}
                    {dynamicColumns.length === 0 ? (
                      <td className="py-3.5 px-4 text-right">
                        {renderCellAmount(
                          livePersonalTotal,
                          snapshots.length > 0 ? livePersonalTotal - snapshots[0].personalBalance : 0,
                          "text-emerald-300 font-extrabold"
                        )}
                      </td>
                    ) : (
                      dynamicColumns.map((col) => {
                        const currVal = getLiveColumnValue(col);
                        const prevVal = snapshots.length > 0 ? getCellData(snapshots[0], col) : null;
                        const diff = prevVal !== null ? currVal - prevVal : 0;

                        return (
                          <td key={col.key} className="py-3.5 px-4 text-right">
                            {renderCellAmount(currVal, diff, "text-emerald-300 font-semibold")}
                          </td>
                        );
                      })
                    )}

                    {/* Cột 2: Tài sản shop (tổng các ví shop tự động realtime) */}
                    <td className="py-3.5 px-4 text-right">
                      {renderCellAmount(
                        shopBalanceTotal || 0,
                        snapshots.length > 0 ? (shopBalanceTotal || 0) - snapshots[0].shopBalance : 0,
                        "text-cyan-300 font-extrabold"
                      )}
                    </td>

                    {/* Cột 3: Tổng tài sản (Cá nhân Live + Shop Live) */}
                    <td className="py-3.5 px-4 text-right">
                      {renderCellAmount(
                        liveGrandTotal,
                        snapshots.length > 0 ? liveGrandTotal - snapshots[0].totalBalance : 0,
                        "text-white font-extrabold text-sm"
                      )}
                    </td>
                  </tr>
                )}

                {/* CÁC DÒNG ĐÃ CHỐT TRONG LỊCH SỬ */}
                {snapshots.length === 0 && isTodayFinalized ? (
                  <tr>
                    <td
                      colSpan={(dynamicColumns.length || 1) + 3}
                      className="py-10 text-center text-slate-500 space-y-1"
                    >
                      <p className="font-semibold text-slate-400 text-sm">Chưa có lịch sử chốt tài chính nào.</p>
                      <p className="text-xs">
                        Bấm <strong className="text-emerald-300 font-bold">+ Chốt Tài Chính</strong> ở góc trên bên phải để ghi nhận mốc đầu tiên.
                      </p>
                    </td>
                  </tr>
                ) : (
                  snapshots.map((snap, rowIndex) => {
                    const prevSnap = snapshots[rowIndex + 1] || null;

                    return (
                      <tr
                        key={snap.id}
                        onClick={() => { setSelectedDateFilter(snap.snapshotDate); setActiveTab("DEBIT_TRANSACTIONS"); notify.info(`Đang xem giao dịch ngày ${formatDateVN(snap.snapshotDate)}`); }}
                        title="Click để xem chi tiết các khoản thu/chi của ngày này"
                        className={`transition-colors whitespace-nowrap cursor-pointer ${selectedDateFilter === snap.snapshotDate ? "bg-cyan-950/60 ring-1 ring-inset ring-cyan-500/50" : "hover:bg-slate-800/25"}`}
                      >
                        {/* Ngày chốt (Sticky Left) */}
                        <td className="py-3 px-4 font-mono font-bold text-white sticky left-0 bg-slate-900/90 z-10 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-cyan-400" />
                          <span>{formatDateVN(snap.snapshotDate)}</span>
                        </td>

                        {/* Các cột tài sản cá nhân riêng biệt */}
                        {dynamicColumns.length === 0 ? (
                          <td className="py-3 px-4 text-right">
                            {renderCellAmount(
                              snap.personalBalance,
                              prevSnap ? snap.personalBalance - prevSnap.personalBalance : 0,
                              "text-emerald-300"
                            )}
                          </td>
                        ) : (
                          dynamicColumns.map((col) => {
                            const currVal = getCellData(snap, col);
                            const prevVal = prevSnap ? getCellData(prevSnap, col) : null;
                            const diff =
                              prevVal !== null && currVal !== null ? currVal - prevVal : 0;

                            return (
                              <td key={col.key} className="py-3 px-4 text-right">
                                {renderCellAmount(currVal, diff, "text-emerald-300")}
                              </td>
                            );
                          })
                        )}

                        {/* Cột 2: Tài sản shop (tổng các ví shop tự động) */}
                        <td className="py-3 px-4 text-right">
                          {renderCellAmount(
                            snap.shopBalance,
                            prevSnap ? snap.shopBalance - prevSnap.shopBalance : 0,
                            "text-cyan-300"
                          )}
                        </td>

                        {/* Cột 3: Tổng tài sản (Cá nhân + Shop) */}
                        <td className="py-3 px-4 text-right">
                          {renderCellAmount(
                            snap.totalBalance,
                            prevSnap ? snap.totalBalance - prevSnap.totalBalance : 0,
                            "text-white"
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

          </div>
        ) : (
          <div>
            <PersonalDebitTransactionsSection
              selectedDate={selectedDateFilter}
              onClearDateFilter={() => setSelectedDateFilter(null)}
              isFrameless
            />
          </div>
        )}
      </GlassCard>

      {/* 3. MODAL CHỐT TÀI CHÍNH */}
      <BalanceSnapshotModal
        isOpen={modalOpen}
        formDate={formDate}
        formItems={formItems}
        formAutoSync={formAutoSync}
        formLivePersonalTotal={formLivePersonalTotal}
        formGrandTotal={formGrandTotal}
        shopBalanceTotal={shopBalanceTotal}
        submitting={submitting}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmitSnapshot}
        onFormDateChange={setFormDate}
        onAddItem={handleAddItemRow}
        onRemoveItem={handleRemoveItemRow}
        onItemChange={handleItemChange}
        onAutoSyncChange={setFormAutoSync}
      />
    </div>
  );
};
