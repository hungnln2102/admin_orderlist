import React, { useState, useEffect, useCallback, useMemo } from "react";
import { GlassCard } from "@/shared/components/GlassCard";
import { formatVND } from "@/shared/utils";
import { useNotification } from "@/shared/context/NotificationContext";
import { PersonalAsset } from "../types";
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
  const [formItems, setFormItems] = useState<{ id?: string; name: string; amountStr: string; type?: string; bankAccountId?: number; assetId?: number }[]>([]);
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
    <div className="space-y-4 pt-2">
      {/* 1. HERO WIDGET: STAT TRÒN BIẾN ĐỘNG & TỔNG QUAN TÀI CHÍNH */}
      <GlassCard className="!p-5 bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border-slate-800 rounded-2xl relative overflow-hidden">
        {/* Glow hiệu ứng nền */}
        <div
          className={`absolute -right-10 -top-10 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
            circularMetrics.isIncrease ? "bg-emerald-500" : "bg-rose-500"
          }`}
        />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          {/* Cụm trái: Stat Tròn SVG sắc nét */}
          <div className="flex items-center gap-5">
            {/* SVG Ring Container */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 110 110">
                {/* Track circle */}
                <circle
                  cx="55"
                  cy="55"
                  r="48"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-800"
                />
                {/* Dynamic colored progress circle */}
                <circle
                  cx="55"
                  cy="55"
                  r="48"
                  fill="transparent"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 48}
                  strokeDashoffset={circularMetrics.hasComparison ? circularMetrics.strokeDashoffset : 2 * Math.PI * 48}
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ease-out ${
                    circularMetrics.isIncrease
                      ? "stroke-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                      : "stroke-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                  }`}
                />
              </svg>

              {/* Tâm vòng tròn: hiển thị % và icon */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {circularMetrics.hasComparison ? (
                  <>
                    <div className="flex items-center justify-center">
                      {circularMetrics.isIncrease ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span
                        className={`text-base font-black font-mono ml-0.5 ${
                          circularMetrics.isIncrease ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {circularMetrics.isIncrease ? "+" : "-"}
                        {circularMetrics.absPercent.toFixed(1)}%
                      </span>
                    </div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">
                      {circularMetrics.isIncrease ? "Tăng" : "Giảm"}
                    </span>
                  </>
                ) : (
                  <div className="flex flex-col items-center">
                    <History className="w-4 h-4 text-cyan-400 mb-0.5" />
                    <span className="text-[10px] font-bold text-slate-400">1 Mốc Số Dư</span>
                  </div>
                )}
              </div>
            </div>

            {/* Thông tin mô tả bên cạnh vòng tròn */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                  Quản Trị Dòng Tiền & Tài Sản
                </span>
                <span className="text-xs text-slate-400">
                  {snapshots.length} lần chốt
                </span>
              </div>

              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>Nhật Ký Chốt Tài Chính</span>
              </h3>

              {circularMetrics.hasComparison ? (
                <div className="space-y-1 pt-0.5">
                  <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>Tổng Tài Sản Lần Mới Nhất:</span>
                    <span className="font-mono font-bold text-white text-sm">
                      {formatVND(circularMetrics.latestTotal || 0)}
                    </span>
                    <span className="text-slate-400">({formatDateVN(circularMetrics.latestDate)})</span>
                    <span className="text-slate-500">·</span>
                    <span
                      className={`font-mono font-extrabold flex items-center gap-1 ${
                        circularMetrics.isIncrease ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {circularMetrics.isIncrease ? "+" : ""}
                      {formatVND(circularMetrics.deltaAmount)} ({circularMetrics.isIncrease ? "+" : ""}
                      {circularMetrics.percent}%)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 font-mono">
                    <span>Cá nhân: <strong className="text-emerald-300">{formatVND(circularMetrics.latestPersonal || 0)}</strong></span>
                    <span>·</span>
                    <span>Shop: <strong className="text-cyan-300">{formatVND(circularMetrics.latestShop || 0)}</strong></span>
                    <span>·</span>
                    <span className="text-slate-500">so với {formatDateVN(circularMetrics.previousDate)} ({formatVND(circularMetrics.previousTotal || 0)})</span>
                  </div>
                </div>
              ) : snapshots.length === 1 ? (
                <p className="text-xs text-slate-400">
                  Đã ghi nhận mốc ngày {formatDateVN(snapshots[0].snapshotDate)} với Tổng Tài Sản{" "}
                  <strong className="text-cyan-300 font-mono">{formatVND(snapshots[0].totalBalance)}</strong> (Cá nhân: {formatVND(snapshots[0].personalBalance)} · Shop: {formatVND(snapshots[0].shopBalance)}). Hãy chốt thêm 1 ngày nữa để đo lường % tăng/giảm!
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  Chưa có lịch sử chốt tài chính. Bấm nút bên phải để ghi nhận số dư hôm nay!
                </p>
              )}
            </div>
          </div>

          {/* Cụm phải: Nút hành động Chốt Tài Chính */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={fetchSnapshots}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700/60"
              title="Làm mới lịch sử"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>

            <button
              onClick={() => handleOpenCreateModal()}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Chốt Tài Chính</span>
            </button>
          </div>
        </div>
      </GlassCard>

      {/* 2. BẢNG LOG MA TRẬN LỊCH SỬ SỐ DƯ (ĐIỀN 1 LẦN RỒI THÔI - GỒM 3 CỘT: CÁ NHÂN, SHOP TỰ ĐỘNG, TỔNG) */}
      <GlassCard className="!p-4 bg-slate-900/90 border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 px-1">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-bold text-white">Lịch Sử Biến Động Số Dư Qua Các Lần Chốt</h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <span>{snapshots.length} lần chốt</span>
            {!isTodayFinalized && (
              <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                +1 live
              </span>
            )}
          </span>
        </div>

        {loading && snapshots.length === 0 ? (
          <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            <span className="text-xs">Đang tải lịch sử số dư...</span>
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full rounded-xl border border-slate-800">
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
                  <tr className="bg-gradient-to-r from-amber-500/15 via-slate-900/80 to-amber-500/10 border-b-2 border-amber-500/40 hover:bg-amber-500/20 transition-all whitespace-nowrap shadow-inner group">
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
                        className="hover:bg-slate-800/25 transition-colors whitespace-nowrap"
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
      </GlassCard>


      {/* 3. MODAL CHỐT TÀI CHÍNH */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-400" />
                <span>Chốt Tài Chính</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmitSnapshot} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Ngày chốt */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Ngày Chốt
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Danh sách các tài khoản / nguồn tài chính cá nhân */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    1. Các Nguồn Tài Sản Cá Nhân (Hanagold, Momo, TK Cá Nhân...)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm Kênh Khác</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {formItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2"
                    >
                      <input
                        type="text"
                        placeholder="Tên tài khoản / ví (VD: Hanagold, Momo)"
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                        required
                        className="flex-1 bg-slate-900 border border-slate-700/60 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />

                      <div className="relative w-44">
                        <input
                          type="text"
                          placeholder="0 ₫"
                          value={item.amountStr}
                          onChange={(e) => handleItemChange(idx, "amountStr", e.target.value)}
                          required
                          className="w-full bg-slate-900 border border-slate-700/60 rounded-lg pl-2.5 pr-6 py-1.5 text-xs font-mono font-bold text-emerald-300 text-right focus:outline-none focus:border-cyan-500"
                        />
                        <span className="absolute right-2 top-1.5 text-xs text-slate-500 font-bold">₫</span>
                      </div>

                      {formItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"
                          title="Xóa dòng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Subtotal cá nhân */}
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Tổng Tài Sản Cá Nhân:</span>
                  <span className="font-mono font-bold text-emerald-300 text-sm">
                    {formatVND(formLivePersonalTotal)}
                  </span>
                </div>
              </div>

              {/* 2. Tài sản Shop tự động */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">2. Tài Sản Shop (Tự Động)</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      TỰ ĐỘNG SHOP
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Hệ thống tự động cộng dồn số dư các ví Shop Bank & USDT hiện tại
                  </span>
                </div>
                <span className="font-mono font-black text-base text-cyan-300">
                  {formatVND(shopBalanceTotal || 0)}
                </span>
              </div>

              {/* Tạm tính Tổng Tài Sản Toàn Diện */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">TỔNG TÀI SẢN TOÀN DIỆN:</span>
                  <span className="text-[11px] text-slate-400 block">
                    Cá nhân ({formatVND(formLivePersonalTotal)}) + Shop ({formatVND(shopBalanceTotal || 0)})
                  </span>
                </div>
                <span className="font-mono font-black text-xl text-white">
                  {formatVND(formGrandTotal)}
                </span>
              </div>

              {/* Checkbox Đồng bộ 2 chiều cho tài sản cá nhân */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAutoSync}
                    onChange={(e) => setFormAutoSync(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Tự động đồng bộ vào số dư hiện thời
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Cập nhật luôn số dư hiện tại trong danh mục tài sản cá nhân và chỉ số Net Worth.
                    </span>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lưu Chốt Tài Chính</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
