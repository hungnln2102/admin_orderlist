import React, { useEffect, useMemo, useRef, useState } from "react";
import { DebtKind, DebtRepaymentFrequency, PersonalAsset, PersonalAssetType, ProfitDestination, ProfitFrequency } from "../types";
import { useNotification } from "@/shared/context/NotificationContext";
import { DateInputVN } from "@/shared/components/DateInputVN";
import { PersonalAssetPreview } from "./PersonalAssetPreview";
import {
  Calendar,
  Clock3,
  Coins,
  CreditCard,
  Info,
  Percent,
  Receipt,
  Save,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from "lucide-react";

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
  const amountInputRef = useRef<HTMLInputElement>(null);

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
  const [debtInterestFrequency, setDebtInterestFrequency] = useState<"DAILY" | "MONTHLY">("DAILY");
  const [debtAnnualInterestRate, setDebtAnnualInterestRate] = useState("");
  const [debtDueDay, setDebtDueDay] = useState("15");
  const [debtHasEndDate, setDebtHasEndDate] = useState(false);
  const [debtEndDate, setDebtEndDate] = useState("");
  const [debtRepaymentFrequency, setDebtRepaymentFrequency] = useState<DebtRepaymentFrequency>("MONTHLY");
  const [debtKind, setDebtKind] = useState<DebtKind>("PERSONAL_EXTERNAL");
  const [debtInitialLimit, setDebtInitialLimit] = useState("");
  const [debtAccountNumber, setDebtAccountNumber] = useState("");
  const [cardLastDigits, setCardLastDigits] = useState("");
  const [bankName, setBankName] = useState("");
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
      setDebtInterestFrequency(editingItem.debtInterestFrequency || "DAILY");
      setDebtAnnualInterestRate(editingItem.debtAnnualInterestRate ? String(editingItem.debtAnnualInterestRate) : "");
      setDebtDueDay(editingItem.debtDueDay ? String(editingItem.debtDueDay) : "15");
      setDebtHasEndDate(Boolean(editingItem.debtEndDate));
      setDebtEndDate(editingItem.debtEndDate || "");
      setDebtRepaymentFrequency(editingItem.debtRepaymentFrequency || "MONTHLY");
      setDebtKind(editingItem.debtKind || "PERSONAL_EXTERNAL");
      setDebtInitialLimit(editingItem.debtInitialLimit ? String(editingItem.debtInitialLimit) : "");
      setDebtAccountNumber(editingItem.debtAccountNumber || "");
      setCardLastDigits(editingItem.cardLastDigits || "");
      setBankName(editingItem.bankName || "");
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
      setDebtInterestFrequency("DAILY");
      setDebtAnnualInterestRate("");
      setDebtDueDay("15");
      setDebtHasEndDate(false);
      setDebtEndDate("");
      setDebtRepaymentFrequency("MONTHLY");
      setDebtKind("PERSONAL_EXTERNAL");
      setDebtInitialLimit("");
      setDebtAccountNumber("");
      setCardLastDigits("");
      setBankName("");
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
          .map((item: any) => {
            const scopePrefix = item.accountScope === "PERSONAL" ? "💳 [Cá nhân]" : "🏢 [Shop]";
            return {
              id: Number(item.id),
              kind: "bank" as const,
              label: `${scopePrefix} ${item.label || item.bankDisplayName || "Tài khoản ngân hàng"}`,
              detail: [item.bankDisplayName, item.accountNumber].filter(Boolean).join(" · "),
            };
          });
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

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    const caretPosition = event.target.selectionStart ?? rawValue.length;
    const digitsBeforeCaret = rawValue.slice(0, caretPosition).replace(/\D/g, "").length;
    const formattedValue = formatAmountInput(rawValue);

    setAmount(formattedValue);
    requestAnimationFrame(() => {
      const input = amountInputRef.current;
      if (!input) return;
      let nextCaret = 0;
      let digitCount = 0;
      while (nextCaret < formattedValue.length && digitCount < digitsBeforeCaret) {
        if (/\d/.test(formattedValue[nextCaret])) digitCount += 1;
        nextCaret += 1;
      }
      input.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const setQuickDuration = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setDebtEndDate(d.toISOString().slice(0, 10));
  };

  const amountValue = parseAmountInput(amount);
  const annualRateValue = Number(annualInterestRate) || 0;
  const annualProfit = useMemo(() => (amountValue * annualRateValue) / 100, [amountValue, annualRateValue]);
  const periodProfit =
    profitFrequency === "DAILY" ? annualProfit / 365 : profitFrequency === "MONTHLY" ? annualProfit / 12 : annualProfit;
  const periodLabel = profitFrequency === "DAILY" ? "ngày" : profitFrequency === "MONTHLY" ? "tháng" : "năm";

  // Debt Calculations
  const debtRateValue = Number(debtAnnualInterestRate) || 0;
  const debtRemainingDays = debtHasEndDate && debtEndDate
    ? Math.max(1, Math.ceil((new Date(`${debtEndDate}T23:59:59`).getTime() - Date.now()) / 86400000))
    : null;
  const debtRemainingMonths = debtRemainingDays
    ? Math.max(1, Math.floor(debtRemainingDays / 30.4375) || 1)
    : null;

  const monthlyInterestAmount = debtInterestEnabled ? (amountValue * debtRateValue) / 100 / 12 : 0;
  const debtInterestAmount = debtInterestEnabled
    ? debtRemainingDays
      ? ((amountValue * debtRateValue) / 100) * (debtRemainingDays / 365)
      : monthlyInterestAmount * 12
    : 0;

  const estimatedDebtTotal = debtRemainingDays ? amountValue + debtInterestAmount : amountValue;

  const debtMonthlyPayment = debtRemainingDays && debtRemainingMonths
    ? Math.max(
        Math.ceil(Math.ceil(estimatedDebtTotal / debtRemainingDays) * 30.44),
        Math.ceil(estimatedDebtTotal / debtRemainingMonths)
      )
    : Math.max(Math.ceil(amountValue * 0.05 + monthlyInterestAmount), Math.ceil(amountValue / 24));

  const debtDailyPayment = debtRemainingDays
    ? Math.ceil(estimatedDebtTotal / debtRemainingDays)
    : Math.ceil(debtMonthlyPayment / 30);

  // Dynamic Theme Styling
  const theme = useMemo(() => {
    if (type === "DEBT_PAYABLE") {
      return {
        title: editingItem ? "Sửa Khoản Nợ Phải Trả" : "Thêm Khoản Nợ Phải Trả",
        icon: <Receipt className="h-5 w-5" />,
        badgeBg: "bg-rose-500/10 text-rose-300 border-rose-500/20",
        accentText: "text-rose-400",
        submitBtn: "bg-rose-600 hover:bg-rose-500 shadow-rose-600/25",
        focusBorder: "focus:border-rose-400",
      };
    }
    if (type === "DEBT_RECEIVABLE") {
      return {
        title: editingItem ? "Sửa Khoản Cho Vay (Phải Thu)" : "Thêm Khoản Cho Vay (Phải Thu)",
        icon: <TrendingUp className="h-5 w-5" />,
        badgeBg: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
        accentText: "text-emerald-400",
        submitBtn: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25",
        focusBorder: "focus:border-emerald-400",
      };
    }
    if (type === "CASH_BANK") {
      return {
        title: editingItem ? "Sửa Ví / Ngân Hàng Cá Nhân" : "Thêm Ví / Ngân Hàng Cá Nhân",
        icon: <Wallet className="h-5 w-5" />,
        badgeBg: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
        accentText: "text-cyan-400",
        submitBtn: "bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/25",
        focusBorder: "focus:border-cyan-400",
      };
    }
    if (type === "GOLD_INVESTMENT") {
      return {
        title: editingItem ? "Sửa Vàng / Tài Sản Đầu Tư" : "Thêm Vàng / Tài Sản Đầu Tư",
        icon: <Coins className="h-5 w-5" />,
        badgeBg: "bg-amber-500/10 text-amber-300 border-amber-500/20",
        accentText: "text-amber-400",
        submitBtn: "bg-amber-600 hover:bg-amber-500 shadow-amber-600/25",
        focusBorder: "focus:border-amber-400",
      };
    }
    return {
      title: editingItem ? "Sửa Sổ Tiết Kiệm / Quỹ Tích Lũy" : "Thêm Sổ Tiết Kiệm / Quỹ Tích Lũy",
      icon: <Sparkles className="h-5 w-5" />,
      badgeBg: "bg-purple-500/10 text-purple-300 border-purple-500/20",
      accentText: "text-purple-400",
      submitBtn: "bg-purple-600 hover:bg-purple-500 shadow-purple-600/25",
      focusBorder: "focus:border-purple-400",
    };
  }, [type, editingItem]);

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
    if (isDebtAsset && debtKind !== "PERSONAL_EXTERNAL" && Number(debtInitialLimit) <= 0) {
      notify.warning(debtKind === "CREDIT_CARD" ? "Vui lòng nhập hạn mức tín dụng lớn hơn 0" : "Vui lòng nhập hạn mức thấu chi lớn hơn 0");
      return;
    }
    if (isDebtAsset && debtInterestEnabled && debtRateValue <= 0) {
      notify.warning("Vui lòng nhập lãi suất nợ lớn hơn 0");
      return;
    }
    if (isDebtAsset && debtDueDay && (Number(debtDueDay) < 1 || Number(debtDueDay) > 31)) {
      notify.warning("Vui lòng nhập ngày đến hạn hàng tháng từ 1 đến 31");
      return;
    }
    if (isDebtAsset && debtHasEndDate && !debtEndDate) {
      notify.warning("Vui lòng chọn ngày dự kiến tất toán cho khoản nợ có kỳ hạn");
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
        debtKind: type === "DEBT_PAYABLE" ? debtKind : null,
        debtInitialLimit: type === "DEBT_PAYABLE" && debtKind !== "PERSONAL_EXTERNAL" ? Number(debtInitialLimit) : null,
        debtAccountNumber: type === "DEBT_PAYABLE" ? (debtAccountNumber.replace(/\D/g, "") || null) : null,
        debtInterestEnabled: isDebtAsset && debtKind !== "PERSONAL_EXTERNAL" && debtInterestEnabled,
        debtInterestFrequency: isDebtAsset && debtInterestEnabled ? debtInterestFrequency : null,
        debtAnnualInterestRate: isDebtAsset && debtInterestEnabled ? debtRateValue : null,
        debtDueDay: isDebtAsset && debtDueDay ? Number(debtDueDay) : null,
        debtEndDate: (isDebtAsset && debtHasEndDate && debtEndDate) ? debtEndDate : null,
        debtRepaymentFrequency: isDebtAsset ? debtRepaymentFrequency : null,
        cardLastDigits: isDebtAsset ? (cardLastDigits.trim() || null) : null,
        bankName: isDebtAsset ? (bankName.trim() || null) : null,
      });
      onClose();
    } catch (error: any) {
      notify.error("Lỗi khi lưu mục: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 md:p-6 backdrop-blur-md">
      <div className="my-auto flex flex-col w-full max-w-lg md:max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl transition-all duration-300">
        {/* Sticky Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${theme.badgeBg}`}>
              {theme.icon}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">{theme.title}</h3>
              <p className="text-[11px] text-slate-400">Quản trị và định mức nghĩa vụ / tài sản cá nhân</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="cursor-pointer rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body (2-Column Grid on Desktop) */}
        <form id="personal-asset-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* ════════════════════════════════════════════════════════════════
                CỘT TRÁI (md:col-span-7): FORM NHẬP LIỆU THÔNG TIN
                ════════════════════════════════════════════════════════════════ */}
            <div className="md:col-span-7 space-y-4">
              {/* 1. Category Selector */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Phân loại danh mục</label>
                <select
                  value={type}
                  onChange={(event) => setType(event.target.value as PersonalAssetType)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-slate-700 cursor-pointer"
                >
                  <option value="DEBT_PAYABLE">🔴 Nợ cá nhân phải trả (Nợ phải trả)</option>
                  <option value="DEBT_RECEIVABLE">🟢 Khoản cho vay (Phải thu cá nhân)</option>
                  <option value="SAVINGS">🟣 Quỹ Tích Lũy / Tiết kiệm (Tài sản sinh lời)</option>
                  <option value="GOLD_INVESTMENT">🟡 Vàng / Đầu tư / Crypto (Tài sản đầu tư)</option>
                </select>
              </div>

              {/* 2. Name & Amount (2-column Subgrid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                    Tên khoản / Nhãn ghi chú <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={
                      type === "DEBT_PAYABLE"
                        ? "VD: Nợ anh Nam, Ngân hàng..."
                        : type === "DEBT_RECEIVABLE"
                        ? "VD: Cho Tuấn mượn, Tiền cọc..."
                        : type === "CASH_BANK"
                        ? "VD: Techcombank cá nhân, Ví Momo..."
                        : type === "SAVINGS"
                        ? "VD: Sổ BIDV 6 tháng..."
                        : "VD: 2 chỉ vàng nhẫn SJC..."
                    }
                    required
                    className={`w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-white ${theme.focusBorder} focus:outline-none`}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                    Số tiền (₫) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-sm text-slate-500 font-mono font-bold">₫</span>
                    <input
                      ref={amountInputRef}
                      type="text"
                      inputMode="numeric"
                      value={amount}
                      onChange={handleAmountChange}
                      placeholder="0"
                      required
                      className={`w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-8 pr-3.5 font-mono text-sm font-bold text-white ${theme.focusBorder} focus:outline-none`}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Debt Specific Inputs */}
              {isDebtAsset && (
                <div className="space-y-3.5 rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] p-4">
                  {/* Debt Type Mode Selector (Term vs Open-ended/Credit Card) */}
                  <div>
                    <label className="mb-1.5 block text-xs text-slate-300 font-medium">Hình thức kỳ hạn nợ</label>
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setDebtHasEndDate(false);
                          setDebtEndDate("");
                        }}
                        className={`py-2 px-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          !debtHasEndDate
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <span>💳</span>
                        <span className="truncate">Thẻ tín dụng / Nợ mở</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDebtHasEndDate(true);
                          if (!debtEndDate) setDebtEndDate(defaultDebtEndDate());
                        }}
                        className={`py-2 px-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          debtHasEndDate
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        <span>📅</span>
                        <span className="truncate">Nợ có hạn tất toán</span>
                      </button>
                    </div>
                  </div>

                  {/* Due day & End date */}
                  <div className={`grid gap-3 ${debtHasEndDate ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                    <div>
                      <label className="mb-1.5 block text-xs text-slate-300 font-medium">Hạn thanh toán hàng tháng</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-slate-500">Ngày</span>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={debtDueDay}
                          onChange={(event) => setDebtDueDay(event.target.value)}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-12 pr-3 text-xs font-mono font-bold text-white focus:border-rose-400 focus:outline-none"
                        />
                        <span className="absolute right-3 top-2.5 text-[11px] text-slate-500">mỗi tháng</span>
                      </div>
                    </div>

                    {debtHasEndDate && (
                      <div>
                        <label className="mb-1.5 block text-xs text-slate-300 font-medium">Ngày dự kiến tất toán</label>
                        <DateInputVN
                          value={debtEndDate}
                          onChange={(iso) => setDebtEndDate(iso)}
                          focusBorderClass="focus:border-rose-400"
                        />
                      </div>
                    )}
                  </div>

                  {/* Quick Preset Duration Chips (Only when has end date) */}
                  {debtHasEndDate ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400 font-semibold mr-1">Kỳ hạn nhanh:</span>
                      {[
                        { label: "3 Tháng", months: 3 },
                        { label: "6 Tháng", months: 6 },
                        { label: "1 Năm", months: 12 },
                        { label: "2 Năm", months: 24 },
                      ].map((preset) => (
                        <button
                          key={preset.months}
                          type="button"
                          onClick={() => setQuickDuration(preset.months)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all cursor-pointer active:scale-95"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-400 leading-relaxed flex items-start gap-2">
                      <span className="text-rose-400 font-bold shrink-0">ℹ️</span>
                      <span>
                        Nợ không thời hạn / Thẻ tín dụng: Mỗi tháng chỉ cần thanh toán tối thiểu hoặc gom đóng định kỳ vào ngày {debtDueDay || 15}, không bắt buộc thời hạn tất toán dứt điểm.
                      </span>
                    </div>
                  )}

                  {/* Card Reconciliation (4 Last Digits & Bank Issuer) */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block">Định danh thẻ / Đối chiếu tự động</span>
                        <span className="text-[10px] text-slate-400">Dùng cho App đọc SMS/Email tự động khớp giao dịch quẹt thẻ</span>
                      </div>
                    </div>

                    {type === "DEBT_PAYABLE" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        <label className="text-[11px] text-slate-300 font-medium">Loại sổ nợ
                          <select value={debtKind} onChange={(event) => setDebtKind(event.target.value as DebtKind)} className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-rose-400 focus:outline-none">
                            <option value="PERSONAL_EXTERNAL">Nợ cá nhân ngoài, không lãi</option>
                            <option value="CREDIT_CARD">Thẻ tín dụng</option>
                            <option value="OVERDRAFT">Thấu chi</option>
                          </select>
                        </label>
                        <label className="text-[11px] text-slate-300 font-medium">{debtKind === "PERSONAL_EXTERNAL" ? "STK đối chiếu (nếu có)" : debtKind === "CREDIT_CARD" ? "Hạn mức tín dụng" : "Hạn mức thấu chi"}
                          <input type={debtKind === "PERSONAL_EXTERNAL" ? "text" : "number"} min={debtKind === "PERSONAL_EXTERNAL" ? undefined : "1"} required={debtKind !== "PERSONAL_EXTERNAL"} value={debtKind === "PERSONAL_EXTERNAL" ? debtAccountNumber : debtInitialLimit} onChange={(event) => debtKind === "PERSONAL_EXTERNAL" ? setDebtAccountNumber(event.target.value.replace(/\D/g, "")) : setDebtInitialLimit(event.target.value.replace(/\D/g, ""))} className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:border-rose-400 focus:outline-none" />
                        </label>
                        {debtKind !== "PERSONAL_EXTERNAL" && <label className="text-[11px] text-slate-300 font-medium">STK trích nợ để đối chiếu
                          <input type="text" value={debtAccountNumber} onChange={(event) => setDebtAccountNumber(event.target.value.replace(/\D/g, ""))} className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:border-rose-400 focus:outline-none" />
                        </label>}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-300 font-medium">
                          4 số cuối thẻ ngân hàng
                        </label>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="VD: 0963"
                          value={cardLastDigits}
                          onChange={(e) => setCardLastDigits(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono font-bold text-cyan-300 placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-300 font-medium">
                          Ngân hàng phát hành
                        </label>
                        <input
                          type="text"
                          placeholder="VD: VPBank, Techcombank, VIB..."
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Interest Rate Toggle (iOS Style Switch) */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${debtInterestEnabled ? "bg-rose-500/20 text-rose-300" : "bg-slate-800 text-slate-400"}`}>
                          <Percent className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-200 block">Khoản nợ có tính lãi suất</span>
                          <span className="text-[10px] text-slate-400">Tự động cộng dồn lãi vào tổng nghĩa vụ trả</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={debtInterestEnabled}
                        onClick={() => setDebtInterestEnabled(!debtInterestEnabled)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          debtInterestEnabled ? "bg-rose-500" : "bg-slate-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            debtInterestEnabled ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {debtInterestEnabled && (
                      <div className="pt-2 border-t border-slate-800/60 space-y-3 animate-in fade-in duration-200">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-slate-300">
                            Chu kỳ tính lãi suất
                          </label>
                          <select
                            value={debtInterestFrequency}
                            onChange={(event) => setDebtInterestFrequency(event.target.value as "DAILY" | "MONTHLY")}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-rose-400 focus:outline-none cursor-pointer"
                          >
                            <option value="DAILY">⚡ Lãi theo ngày (Chạy lúc 18:00 hàng ngày)</option>
                            <option value="MONTHLY">🗓️ Lãi theo tháng (Chạy định kỳ hàng tháng)</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="text-xs text-slate-400 shrink-0">Lãi suất (% / năm):</label>
                          <div className="relative flex-1">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={debtAnnualInterestRate}
                              onChange={(event) => setDebtAnnualInterestRate(event.target.value)}
                              placeholder="12.00"
                              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 pr-8 font-mono text-xs font-bold text-white focus:border-rose-400 focus:outline-none"
                            />
                            <span className="absolute right-2.5 top-1.5 text-xs text-slate-500">%</span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-200 leading-relaxed space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-rose-300">
                            <Info className="w-3.5 h-3.5 shrink-0" />
                            <span>{debtInterestFrequency === "DAILY" ? "Cơ Chế Lãi Theo Ngày (18:00 Chiều):" : "Cơ Chế Lãi Theo Tháng:"}</span>
                          </div>
                          <p>
                            {debtInterestFrequency === "DAILY" ? (
                              <>
                                Hằng ngày vào lúc <strong>18:00</strong>, hệ thống tính tiền lãi (`Dư nợ × Lãi suất / 365`). Tiền lãi được tích lũy treo và <strong>không cộng dồn vào gốc ngay</strong>, mà được giữ nguyên để chốt cộng tổng vào <strong>ngày đáo hạn (ngày {debtDueDay || 25})</strong>.
                              </>
                            ) : (
                              <>
                                Hàng tháng, hệ thống tính tiền lãi (`Dư nợ × Lãi suất / 12`). Tiền lãi được tích lũy và cộng dồn vào tổng dư nợ khi đến kỳ hạn thanh toán.
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Repayment Cycle */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-300">
                      Chu kỳ rút tiền thanh toán
                    </label>
                    <select
                      value={debtRepaymentFrequency}
                      onChange={(event) => setDebtRepaymentFrequency(event.target.value as DebtRepaymentFrequency)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-rose-400 focus:outline-none cursor-pointer"
                    >
                      <option value="MONTHLY">🗓️ Đóng định kỳ hàng tháng (Đến ngày {debtDueDay || 15} mới trả)</option>
                      <option value="DAILY">⚡ Rút tiền trả hàng ngày (Bốc bát họ / Trả nợ theo ngày)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 4. Yield Asset Inputs (SAVINGS) */}
              {isYieldAsset && (
                <div className="space-y-3.5 rounded-2xl border border-purple-500/20 bg-purple-500/[0.03] p-4">
                  {/* Profit Switch Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${profitEnabled ? "bg-purple-500/20 text-purple-300" : "bg-slate-800 text-slate-400"}`}>
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block">Quỹ này có sinh lời định kỳ</span>
                        <span className="text-[10px] text-slate-400">Lãi suất gửi tiết kiệm hoặc lợi nhuận tích lũy</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={profitEnabled}
                      onClick={() => setProfitEnabled(!profitEnabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        profitEnabled ? "bg-purple-500" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          profitEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {profitEnabled && (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1.5 block text-[11px] text-slate-400">Kỳ nhận lãi</label>
                          <select
                            value={profitFrequency}
                            onChange={(event) => setProfitFrequency(event.target.value as ProfitFrequency)}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
                          >
                            <option value="DAILY">Theo ngày</option>
                            <option value="MONTHLY">Theo tháng</option>
                            <option value="YEARLY">Theo năm</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-[11px] text-slate-400">Lãi suất (% / năm)</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={annualInterestRate}
                              onChange={(event) => setAnnualInterestRate(event.target.value)}
                              placeholder="5.50"
                              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 pr-8 font-mono text-xs font-bold text-white focus:border-purple-400 focus:outline-none"
                            />
                            <span className="absolute right-2.5 top-2 text-xs text-slate-500">%</span>
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
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
                          >
                            {Object.entries(profitDestinationLabels).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1.5 block text-[11px] text-slate-400">Giờ ghi nhận lãi</label>
                          <input
                            type="time"
                            value={profitCreditTime}
                            onChange={(event) => setProfitCreditTime(event.target.value)}
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-white focus:border-purple-400 focus:outline-none"
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
                            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
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
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 5. Note Field */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">Ghi chú bổ sung</label>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Ghi chú thêm thông tin đối tác, điều khoản hợp đồng..."
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-slate-600 focus:outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                CỘT PHẢI (md:col-span-5): LIVE HUD PREVIEW DASHBOARD
                ════════════════════════════════════════════════════════════════ */}
            <PersonalAssetPreview
              isDebtAsset={isDebtAsset}
              type={type}
              isYieldAsset={isYieldAsset}
              theme={theme}
              debtHasEndDate={debtHasEndDate}
              debtRemainingDays={debtRemainingDays}
              debtRemainingMonths={debtRemainingMonths}
              debtDailyPayment={debtDailyPayment}
              debtDueDay={debtDueDay}
              amountValue={amountValue}
              debtMonthlyPayment={debtMonthlyPayment}
              debtInterestEnabled={debtInterestEnabled}
              debtInterestAmount={debtInterestAmount}
              monthlyInterestAmount={monthlyInterestAmount}
              annualRateValue={annualRateValue}
              estimatedDebtTotal={estimatedDebtTotal}
              profitEnabled={profitEnabled}
              annualProfit={annualProfit}
              periodProfit={periodProfit}
              periodLabel={periodLabel}
              profitDestinationLabels={profitDestinationLabels}
              profitDestination={profitDestination}
              profitCreditTime={profitCreditTime}
            />
          </div>
        </form>

        {/* Sticky Action Footer */}
        <div className="shrink-0 flex items-center justify-between border-t border-slate-800 bg-slate-950/80 px-6 py-3.5 backdrop-blur-md">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span>Giá trị ghi nhận:</span>
            <span className="font-mono font-bold text-white">
              {amountValue > 0 ? `${amountValue.toLocaleString("vi-VN")} ₫` : "0 ₫"}
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              form="personal-asset-form"
              disabled={submitting}
              className={`flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all disabled:opacity-50 ${theme.submitBtn}`}
            >
              <Save className="h-4 w-4" />
              {submitting ? "Đang lưu..." : editingItem ? "Cập nhật" : "Lưu vào sổ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
