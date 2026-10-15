import React, { useEffect, useMemo, useState } from "react";
import { DebtRepaymentFrequency, PersonalAsset, PersonalAssetType, ProfitDestination, ProfitFrequency } from "../types";
import { useNotification } from "@/shared/context/NotificationContext";
import { formatVND } from "@/shared/utils";
import { Calendar, Info, Save, Sparkles, Wallet, X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
  editingItem?: PersonalAsset | null;
  defaultType?: PersonalAssetType;
}

const formatAmountInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("vi-VN") : "";
};

const parseAmountInput = (value: string) => Number(value.replace(/\D/g, ""));

const defaultDebtEndDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
};

const profitDestinationLabels: Record<ProfitDestination, string> = {
  REINVEST: "Tái đầu tư vào chính quỹ",
  CASH_BANK: "Tiền mặt / tài khoản cá nhân",
  SHOP_BALANCE: "Số dư ví Shop",
  OTHER: "Khác",
};

interface ProfitAccountOption {
  id: number;
  kind: "bank" | "usdt";
  label: string;
  detail: string;
}

export const PersonalAssetsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  defaultType = "SAVINGS",
}) => {
  const notify = useNotification();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<PersonalAssetType>(defaultType);
  const [note, setNote] = useState("");
  const [profitEnabled, setProfitEnabled] = useState(false);
  const [profitFrequency, setProfitFrequency] = useState<ProfitFrequency>("MONTHLY");
  const [annualInterestRate, setAnnualInterestRate] = useState("");
  const [profitDestination, setProfitDestination] = useState<ProfitDestination>("REINVEST");
  const [profitAccountId, setProfitAccountId] = useState("");
  const [profitCreditTime, setProfitCreditTime] = useState("07:00");
  const [profitAccounts, setProfitAccounts] = useState<ProfitAccountOption[]>([]);
  const [loadingProfitAccounts, setLoadingProfitAccounts] = useState(false);
  const [debtInterestEnabled, setDebtInterestEnabled] = useState(false);
  const [debtAnnualInterestRate, setDebtAnnualInterestRate] = useState("");
  const [debtDueDay, setDebtDueDay] = useState("15");
  const [debtEndDate, setDebtEndDate] = useState(defaultDebtEndDate);
  const [debtRepaymentFrequency, setDebtRepaymentFrequency] = useState<DebtRepaymentFrequency>("MONTHLY");
  const [submitting, setSubmitting] = useState(false);

  const isYieldAsset = type === "SAVINGS";
  const isDebtAsset = type === "DEBT_PAYABLE" || type === "DEBT_RECEIVABLE";

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name);
      setAmount(formatAmountInput(String(editingItem.amount)));
      setType(editingItem.type);
      setNote(editingItem.note || "");
      setProfitEnabled(Boolean(editingItem.profitEnabled));
      setProfitFrequency(editingItem.profitFrequency || "MONTHLY");
      setAnnualInterestRate(editingItem.annualInterestRate ? String(editingItem.annualInterestRate) : "");
      setProfitDestination(editingItem.profitDestination || "REINVEST");
      setProfitAccountId(editingItem.profitAccountId ? String(editingItem.profitAccountId) : "");
      setProfitCreditTime(editingItem.profitCreditTime || "07:00");
      setDebtInterestEnabled(Boolean(editingItem.debtInterestEnabled));
      setDebtAnnualInterestRate(editingItem.debtAnnualInterestRate ? String(editingItem.debtAnnualInterestRate) : "");
      setDebtDueDay(editingItem.debtDueDay ? String(editingItem.debtDueDay) : "15");
      setDebtEndDate(editingItem.debtEndDate || defaultDebtEndDate());
      setDebtRepaymentFrequency(editingItem.debtRepaymentFrequency || "MONTHLY");
    } else {
      setName("");
      setAmount("");
      setType(defaultType);
      setNote("");
      setProfitEnabled(false);
      setProfitFrequency("MONTHLY");
      setAnnualInterestRate("");
      setProfitDestination("REINVEST");
      setProfitAccountId("");
      setProfitCreditTime("07:00");
      setDebtInterestEnabled(false);
      setDebtAnnualInterestRate("");
      setDebtDueDay("15");
      setDebtEndDate(defaultDebtEndDate());
      setDebtRepaymentFrequency("MONTHLY");
    }
  }, [editingItem, defaultType, isOpen]);

  useEffect(() => {
    if (!isOpen || !profitEnabled) return;

    let cancelled = false;
    setLoadingProfitAccounts(true);
    Promise.all([
      fetch("/api/wallets/shop-bank-accounts").then((response) => (response.ok ? response.json() : { items: [] })),
      fetch("/api/wallets/usdt-wallets").then((response) => (response.ok ? response.json() : { items: [] })),
    ])
      .then(([bankData, usdtData]) => {
        if (cancelled) return;
        const banks = (bankData.items || [])
          .filter((item: any) => item.isActive)
          .map((item: any) => ({
            id: Number(item.id),
            kind: "bank" as const,
            label: item.label || item.bankDisplayName || "Tài khoản ngân hàng",
            detail: [item.bankDisplayName, item.accountNumber].filter(Boolean).join(" · "),
          }));
        const wallets = (usdtData.items || [])
          .filter((item: any) => item.isActive)
          .map((item: any) => ({
            id: Number(item.id),
            kind: "usdt" as const,
            label: item.label || "Ví USDT",
            detail: [item.network, item.walletAddress].filter(Boolean).join(" · "),
          }));
        setProfitAccounts([...banks, ...wallets]);
      })
      .catch(() => {
        if (!cancelled) setProfitAccounts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProfitAccounts(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, profitEnabled]);

  const amountValue = parseAmountInput(amount);
  const annualRateValue = Number(annualInterestRate) || 0;
  const annualProfit = useMemo(() => (amountValue * annualRateValue) / 100, [amountValue, annualRateValue]);
  const periodProfit =
    profitFrequency === "DAILY" ? annualProfit / 365 : profitFrequency === "MONTHLY" ? annualProfit / 12 : annualProfit;
  const periodLabel = profitFrequency === "DAILY" ? "ngày" : profitFrequency === "MONTHLY" ? "tháng" : "năm";

  // Debt Calculations
  const debtRateValue = Number(debtAnnualInterestRate) || 0;
  const debtRemainingDays = Math.max(
    1,
    Math.ceil((new Date(`${debtEndDate}T23:59:59`).getTime() - Date.now()) / 86400000)
  );
  const debtRemainingMonths = Math.max(1, Math.floor(debtRemainingDays / 30.4375) || 1);
  const debtInterestAmount = debtInterestEnabled
    ? ((amountValue * debtRateValue) / 100) * (debtRemainingDays / 365)
    : 0;
  const estimatedDebtTotal = amountValue + debtInterestAmount;
  const debtDailyPayment = Math.ceil(estimatedDebtTotal / debtRemainingDays);
  // Nguyên tắc an toàn: Thà dôi dư chứ không để thiếu hụt nợ khi tới hạn
  const debtMonthlyPayment = Math.max(
    Math.ceil(debtDailyPayment * 30.44),
    Math.ceil(estimatedDebtTotal / debtRemainingMonths)
  );

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || amountValue <= 0) {
      notify.warning("Vui lòng điền tên và số tiền hợp lệ");
      return;
    }
    if (isYieldAsset && profitEnabled && annualRateValue <= 0) {
      notify.warning("Vui lòng nhập lãi suất năm lớn hơn 0");
      return;
    }
    if (isYieldAsset && profitEnabled && ["CASH_BANK", "SHOP_BALANCE"].includes(profitDestination) && !profitAccountId) {
      notify.warning("Vui lòng chọn tài khoản nhận tiền sinh lời");
      return;
    }
    if (isDebtAsset && debtInterestEnabled && debtRateValue <= 0) {
      notify.warning("Vui lòng nhập lãi suất nợ lớn hơn 0");
      return;
    }
    if (isDebtAsset && (!debtEndDate || Number(debtDueDay) < 1 || Number(debtDueDay) > 31)) {
      notify.warning("Vui lòng nhập ngày đến hạn (1-31) và ngày hết hạn nợ hợp lệ");
      return;
    }

    try {
      setSubmitting(true);
      await onSave({
        name: name.trim(),
        type,
        amount: amountValue,
        note: note.trim(),
        profitEnabled: isYieldAsset && profitEnabled,
        profitFrequency: isYieldAsset && profitEnabled ? profitFrequency : null,
        annualInterestRate: isYieldAsset && profitEnabled ? annualRateValue : null,
        profitDestination: isYieldAsset && profitEnabled ? profitDestination : null,
        profitAccountId: isYieldAsset && profitEnabled && profitAccountId ? Number(profitAccountId) : null,
        profitCreditTime: isYieldAsset && profitEnabled ? profitCreditTime : null,
        debtInterestEnabled: isDebtAsset && debtInterestEnabled,
        debtAnnualInterestRate: isDebtAsset && debtInterestEnabled ? debtRateValue : null,
        debtDueDay: isDebtAsset ? Number(debtDueDay) : null,
        debtEndDate: isDebtAsset ? debtEndDate : null,
        debtRepaymentFrequency: isDebtAsset ? debtRepaymentFrequency : null,
      });
      onClose();
    } catch (error: any) {
      notify.error("Lỗi khi lưu mục: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="my-4 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300">
              <Wallet className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">
              {editingItem
                ? `Sửa ${type === "CASH_BANK" ? "Ví Cá Nhân" : type === "SAVINGS" ? "Sổ Tiết Kiệm" : "Bản Ghi Tài Chính"}`
                : type === "CASH_BANK"
                ? "Thêm Ví / Ngân Hàng Cá Nhân"
                : type === "SAVINGS"
                ? "Thêm Sổ Tiết Kiệm / Quỹ Tích Lũy"
                : type === "GOLD_INVESTMENT"
                ? "Thêm Vàng / Tài Sản Đầu Tư"
                : "Thêm Mục Tài Sản / Nợ Cá Nhân"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-5 max-h-[80vh] overflow-y-auto">
          {/* 1. Category */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Loại mục tài chính</label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as PersonalAssetType)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-purple-400 focus:outline-none cursor-pointer"
            >
              <option value="CASH_BANK">Tiền mặt / Tài khoản cá nhân (Tài sản)</option>
              <option value="SAVINGS">Quỹ Tích Lũy / Tiết kiệm (Tài sản)</option>
              <option value="GOLD_INVESTMENT">Vàng / Đầu tư / Crypto (Tài sản)</option>
              <option value="DEBT_PAYABLE">Nợ cá nhân phải trả (Nợ phải trả)</option>
              <option value="DEBT_RECEIVABLE">Khoản cho vay (Phải thu)</option>
            </select>
            {type === "CASH_BANK" && (
              <p className="mt-1.5 text-[11px] text-cyan-300 bg-cyan-950/40 border border-cyan-500/20 rounded-lg p-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                <span>Ví/ngân hàng cá nhân này lưu độc lập, không bị trộn lẫn vào số dư Shop Bank kinh doanh.</span>
              </p>
            )}
          </div>

          {/* 2. Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              Tên tài sản / Khoản nợ <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={
                type === "CASH_BANK"
                  ? "VD: Techcombank cá nhân, Ví Momo, Tiền mặt két..."
                  : type === "SAVINGS"
                  ? "VD: Sổ BIDV 6 tháng, Quỹ khẩn cấp..."
                  : type === "GOLD_INVESTMENT"
                  ? "VD: 2 chỉ vàng nhẫn SJC..."
                  : "VD: Tên tài sản / khoản nợ..."
              }
              required
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-400 focus:outline-none"
            />
          </div>

          {/* 3. Amount */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              Số tiền (₫) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm text-slate-500 font-mono">₫</span>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(formatAmountInput(event.target.value))}
                placeholder="25.000.000"
                required
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-4 font-mono text-sm font-bold text-white focus:border-purple-400 focus:outline-none"
              />
            </div>
          </div>

          {/* 4. Yield asset settings (SAVINGS) */}
          {isYieldAsset && (
            <div className="space-y-3 rounded-xl border border-purple-400/20 bg-purple-400/[0.04] p-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-200">
                <input
                  type="checkbox"
                  checked={profitEnabled}
                  onChange={(event) => setProfitEnabled(event.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-slate-700 bg-slate-950 text-purple-500 focus:ring-0"
                />
                Quỹ này có sinh lời
              </label>

              {profitEnabled && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] text-slate-400">Cách nhận lãi</label>
                      <select
                        value={profitFrequency}
                        onChange={(event) => setProfitFrequency(event.target.value as ProfitFrequency)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
                      >
                        <option value="DAILY">Theo ngày</option>
                        <option value="MONTHLY">Theo tháng</option>
                        <option value="YEARLY">Theo năm</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] text-slate-400">Lãi suất (%/năm)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={annualInterestRate}
                          onChange={(event) => setAnnualInterestRate(event.target.value)}
                          placeholder="5.50"
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 pr-10 font-mono text-xs text-white focus:border-purple-400 focus:outline-none"
                        />
                        <span className="absolute right-3 top-2 text-xs text-slate-500">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] text-slate-400">Lãi chuyển về đâu?</label>
                      <select
                        value={profitDestination}
                        onChange={(event) => {
                          setProfitDestination(event.target.value as ProfitDestination);
                          setProfitAccountId("");
                        }}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
                      >
                        {Object.entries(profitDestinationLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] text-slate-400">Giờ cộng lãi mỗi lần</label>
                      <input
                        type="time"
                        value={profitCreditTime}
                        onChange={(event) => setProfitCreditTime(event.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:border-purple-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {["CASH_BANK", "SHOP_BALANCE"].includes(profitDestination) && (
                    <div>
                      <label className="mb-1.5 block text-[11px] text-slate-400">
                        Chọn tài khoản nhận lãi <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={profitAccountId}
                        onChange={(event) => setProfitAccountId(event.target.value)}
                        disabled={loadingProfitAccounts}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
                      >
                        <option value="">
                          {loadingProfitAccounts ? "Đang tải tài khoản..." : "Chọn tài khoản cụ thể"}
                        </option>
                        {profitAccounts
                          .filter((account) => profitDestination === "SHOP_BALANCE" || account.kind === "bank")
                          .map((account) => (
                            <option key={`${account.kind}-${account.id}`} value={account.id}>
                              {account.label}
                              {account.detail ? ` · ${account.detail}` : ""}
                            </option>
                          ))}
                      </select>
                      {!loadingProfitAccounts &&
                        profitAccounts.filter((account) => profitDestination === "SHOP_BALANCE" || account.kind === "bank")
                          .length === 0 && (
                          <p className="mt-1 text-[10px] text-amber-300">
                            Chưa có tài khoản đang hoạt động để nhận lãi.
                          </p>
                        )}
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2 text-xs">
                    <span className="text-slate-500">Dự kiến nhận {periodLabel}</span>
                    <span className="font-mono font-semibold text-purple-200">
                      {periodProfit.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} ₫
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. Debt asset settings (DEBT_PAYABLE & DEBT_RECEIVABLE) */}
          {isDebtAsset && (
            <div className="space-y-3.5 rounded-xl border border-rose-400/20 bg-rose-400/[0.04] p-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-200">
                <input
                  type="checkbox"
                  checked={debtInterestEnabled}
                  onChange={(event) => setDebtInterestEnabled(event.target.checked)}
                  className="h-4 w-4 cursor-pointer rounded border-slate-700 bg-slate-950 text-rose-500 focus:ring-0"
                />
                Khoản nợ này có tính lãi
              </label>

              {/* Due day & End date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[11px] text-slate-400">Ngày đến hạn mỗi tháng</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={debtDueDay}
                    onChange={(event) => setDebtDueDay(event.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:border-rose-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] text-slate-400">Ngày hết hạn nợ</label>
                  <input
                    type="date"
                    value={debtEndDate}
                    onChange={(event) => setDebtEndDate(event.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:border-rose-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Interest rate if enabled */}
              {debtInterestEnabled && (
                <div>
                  <label className="mb-1.5 block text-[11px] text-slate-400">Lãi suất nợ (%/năm)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={debtAnnualInterestRate}
                      onChange={(event) => setDebtAnnualInterestRate(event.target.value)}
                      placeholder="12.00"
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 pr-10 font-mono text-xs text-white focus:border-rose-400 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-500">%</span>
                  </div>
                </div>
              )}

              {/* Repayment Cycle */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-slate-300">
                  Hình thức thanh toán cho chủ nợ
                </label>
                <select
                  value={debtRepaymentFrequency}
                  onChange={(event) => setDebtRepaymentFrequency(event.target.value as DebtRepaymentFrequency)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-rose-400 focus:outline-none cursor-pointer"
                >
                  <option value="MONTHLY">🗓️ Đóng định kỳ hàng tháng (Đến ngày {debtDueDay || 15} mới trả)</option>
                  <option value="DAILY">⚡ Rút tiền trả hàng ngày (Bốc bát họ / Trả nợ ngày)</option>
                </select>
              </div>

              {/* SMART DAILY ACCRUAL PREVIEW CARD */}
              <div className="rounded-xl border border-rose-500/30 bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-purple-950/30 p-3.5 space-y-3 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Tích Lũy Dự Phòng Theo Ngày (Smart Accrual)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/15 text-purple-200 border border-purple-500/30">
                    Còn {debtRemainingDays} ngày (~{debtRemainingMonths} tháng)
                  </span>
                </div>

                {/* 2 Big Numbers */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block font-medium">Định mức gánh nợ / ngày</span>
                    <span className="text-base sm:text-lg font-black font-mono text-amber-300 block mt-0.5">
                      ~{debtDailyPayment.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} ₫
                    </span>
                    <span className="text-[9px] text-slate-500">Mỗi ngày Shop tự động gánh</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block font-medium">Tổng gom đóng mỗi tháng</span>
                    <span className="text-base sm:text-lg font-black font-mono text-rose-300 block mt-0.5">
                      {debtMonthlyPayment.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} ₫
                    </span>
                    <span className="text-[9px] text-slate-500">Hạn ngày {debtDueDay || 15} hàng tháng</span>
                  </div>
                </div>

                {/* Visual Explanation Box */}
                <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-200 space-y-1.5 leading-relaxed">
                  <div className="flex items-start gap-1.5">
                    <span className="text-purple-400 font-bold shrink-0">💡 Cách vận hành:</span>
                    <span>
                      Mỗi ngày Động Cơ Hòa Vốn sẽ cộng <strong>{debtDailyPayment.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} ₫</strong> vào chỉ tiêu bán hàng hôm nay của Shop.
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5 text-slate-300 text-[10px] border-t border-purple-500/15 pt-1.5">
                    <span className="text-amber-400 font-bold shrink-0">🔄 Cơ chế gối đầu:</span>
                    <span>
                      Nếu hôm nay đơn hàng chưa đủ bù, số thiếu sẽ <strong>tự động dồn sang mục tiêu ngày mai</strong>. Đảm bảo đúng ngày {debtDueDay || 15} bạn luôn gom đủ {debtMonthlyPayment.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} ₫ trả nợ nhẹ nhàng, không lo bị hụt tiền.
                    </span>
                  </div>
                </div>

                {/* Total projected debt */}
                <div className="flex items-center justify-between text-xs pt-1 px-1">
                  <span className="text-slate-400">
                    {debtInterestEnabled ? "Tổng gốc + lãi dự kiến" : "Tổng nợ gốc cần trả"}:
                  </span>
                  <span className="font-mono font-bold text-white">
                    {estimatedDebtTotal.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} ₫
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 6. Note */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">Ghi chú thêm</label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ghi chú thêm thông tin thỏa thuận..."
              rows={2}
              className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-purple-400 focus:outline-none"
            />
          </div>

          {/* 7. Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-purple-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-500/20 hover:bg-purple-400 disabled:opacity-50 transition-all"
            >
              <Save className="h-4 w-4" />
              {submitting ? "Đang lưu..." : editingItem ? "Cập nhật" : "Lưu vào sổ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
