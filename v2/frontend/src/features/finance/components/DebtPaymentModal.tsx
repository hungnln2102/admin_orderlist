import React, { useEffect, useState } from "react";
import { Installment, PersonalAsset } from "../types";
import { X, CreditCard, DollarSign, Calendar, FileText, PlusCircle, MinusCircle, Wallet, Receipt } from "lucide-react";
import { formatVND } from "@/shared/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: "INSTALLMENT" | "DEBT_PAY" | "DEBT_BORROW", payload: { financialAccountId?: number; receiptId?: number; amount: number; periodMonth?: string; note: string }) => Promise<void>;
  item?: Installment | PersonalAsset | null;
  defaultMode?: "INSTALLMENT" | "DEBT_PAY" | "DEBT_BORROW";
}

interface LiquidityAccount {
  id: number;
  label: string;
  detail: string;
  balance?: number;
}

export const DebtPaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  item,
  defaultMode = "INSTALLMENT",
}) => {
  const [mode, setMode] = useState<"INSTALLMENT" | "DEBT_PAY" | "DEBT_BORROW">(defaultMode);
  const [fundingSource, setFundingSource] = useState<"ACCOUNT" | "RECEIPT">("ACCOUNT");
  const [accounts, setAccounts] = useState<LiquidityAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | "">("");
  const [unallocatedReceipts, setUnallocatedReceipts] = useState<any[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | "">("");
  const [amount, setAmount] = useState<string>("");
  const [periodMonth, setPeriodMonth] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !item) return;

    const initialMode = defaultMode;
    setMode(initialMode);
    setFundingSource("ACCOUNT");

    if (initialMode === "INSTALLMENT") {
      const inst = item as Installment;
      setAmount(String(inst.monthlyAmount || 0));
      const now = new Date();
      setPeriodMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
      setNote(`Thanh toán trả góp "${inst.name}"`);
    } else {
      const debt = item as PersonalAsset;
      setAmount("");
      setNote(initialMode === "DEBT_PAY" ? `Trả bớt nợ "${debt.name}"` : `Vay thêm / Phát sinh nợ "${debt.name}"`);
      setPeriodMonth("");
    }
  }, [isOpen, item, defaultMode]);

  // Fetch liquidity accounts & receipts
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoadingAccounts(true);
    Promise.all([
      fetch("/api/wallets/shop-bank-accounts").then((res) => (res.ok ? res.json() : { items: [] })),
      fetch("/api/wallets/usdt-wallets").then((res) => (res.ok ? res.json() : { items: [] })),
      fetch("/api/finance/unallocated-receipts").then((res) => (res.ok ? res.json() : { items: [] })),
    ])
      .then(([bankData, usdtData, receiptData]) => {
        if (cancelled) return;
        const banks = (bankData.items || [])
          .filter((a: any) => a.isActive)
          .map((a: any) => {
            const scopePrefix = a.accountScope === "PERSONAL" ? "💳 [Cá nhân]" : "🏢 [Shop]";
            return {
              id: Number(a.id),
              label: `${scopePrefix} ${a.label || a.bankDisplayName || "Ngân hàng"}`,
              detail: [a.bankDisplayName, a.accountNumber, `Số dư: ${formatVND(a.balanceRemaining || 0)}`].filter(Boolean).join(" · "),
            };
          });
        const wallets = (usdtData.items || [])
          .filter((w: any) => w.isActive)
          .map((w: any) => ({
            id: Number(w.id),
            label: w.label || "Ví USDT",
            detail: [w.network, w.walletAddress].filter(Boolean).join(" · "),
          }));
        const combined = [...banks, ...wallets];
        setAccounts(combined);
        if (combined.length > 0 && !selectedAccountId) {
          setSelectedAccountId(combined[0].id);
        }

        const receipts = receiptData.items || [];
        setUnallocatedReceipts(receipts);
        if (receipts.length > 0 && !selectedReceiptId) {
          setSelectedReceiptId(receipts[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAccounts([]);
          setUnallocatedReceipts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAccounts(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const isInstallment = defaultMode === "INSTALLMENT";

  const handleModeChange = (newMode: "DEBT_PAY" | "DEBT_BORROW") => {
    setMode(newMode);
    const debt = item as PersonalAsset;
    setNote(newMode === "DEBT_PAY" ? `Trả bớt nợ "${debt.name}"` : `Vay thêm / Phát sinh nợ "${debt.name}"`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount.replace(/\D/g, ""));
    if (numAmount <= 0) {
      alert("Vui lòng nhập số tiền hợp lệ lớn hơn 0");
      return;
    }
    if (fundingSource === "ACCOUNT" && !selectedAccountId && mode !== "DEBT_BORROW") {
      alert("Vui lòng chọn tài khoản thanh khoản nguồn");
      return;
    }
    if (fundingSource === "RECEIPT" && !selectedReceiptId) {
      alert("Vui lòng chọn biên lai ngân hàng");
      return;
    }
    if (mode === "INSTALLMENT" && !periodMonth) {
      alert("Vui lòng chỉ định kỳ tháng thanh toán");
      return;
    }

    try {
      setSubmitting(true);
      await onConfirm(mode, {
        financialAccountId: fundingSource === "ACCOUNT" && selectedAccountId ? Number(selectedAccountId) : undefined,
        receiptId: fundingSource === "RECEIPT" && selectedReceiptId ? Number(selectedReceiptId) : undefined,
        amount: numAmount,
        periodMonth: periodMonth || undefined,
        note: note.trim(),
      });
      onClose();
    } catch (err: any) {
      alert("Lỗi thực hiện: " + (err.message || "Thao tác thất bại"));
    } finally {
      setSubmitting(false);
    }
  };

  const getTitle = () => {
    if (mode === "INSTALLMENT") return "Thanh Toán Trả Góp";
    if (mode === "DEBT_PAY") return "Trả Bớt Nợ Cá Nhân";
    return "Vay Thêm / Phát Sinh Nợ";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              mode === "DEBT_BORROW"
                ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}>
              {mode === "DEBT_BORROW" ? <PlusCircle className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{getTitle()}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Mode Switcher for Personal Debt */}
          {!isInstallment && (
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleModeChange("DEBT_PAY")}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  mode === "DEBT_PAY"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <MinusCircle className="w-4 h-4" />
                Trả Bớt Nợ
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("DEBT_BORROW")}
                className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  mode === "DEBT_BORROW"
                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                Vay Thêm
              </button>
            </div>
          )}

          {/* Funding Source Selection (Account vs Receipt) */}
          {(mode === "INSTALLMENT" || mode === "DEBT_PAY" || mode === "DEBT_BORROW") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                  Nguồn Giao Dịch / Thanh Khoản <span className="text-rose-400">*</span>
                </label>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFundingSource("ACCOUNT")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      fundingSource === "ACCOUNT" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Tài Khoản / Ví
                  </button>
                  <button
                    type="button"
                    onClick={() => setFundingSource("RECEIPT")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      fundingSource === "RECEIPT" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Biên Lai Ngân Hàng (SePay)
                  </button>
                </div>
              </div>

              {fundingSource === "ACCOUNT" ? (
                loadingAccounts ? (
                  <div className="text-xs text-slate-500 py-3">Đang tải danh sách tài khoản...</div>
                ) : accounts.length === 0 ? (
                  <div className="text-xs text-rose-400 py-2">Không tìm thấy tài khoản ngân hàng hoặc ví nào đang hoạt động.</div>
                ) : (
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                    required={fundingSource === "ACCOUNT"}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.label} ({acc.detail})
                      </option>
                    ))}
                  </select>
                )
              ) : (
                unallocatedReceipts.length === 0 ? (
                  <div className="text-xs text-rose-400 py-2">Không có biên lai ngân hàng nào chưa phân bổ (unallocated).</div>
                ) : (
                  <select
                    value={selectedReceiptId}
                    onChange={(e) => {
                      const rId = Number(e.target.value);
                      setSelectedReceiptId(rId);
                      const found = unallocatedReceipts.find((r: any) => Number(r.id) === rId);
                      if (found) {
                        const avail = Number(found.unallocated_amount !== undefined ? found.unallocated_amount : found.amount);
                        if (avail > 0) {
                          setAmount(String(avail));
                        }
                      }
                    }}
                    required={fundingSource === "RECEIPT"}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-cyan-300 font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {unallocatedReceipts.map((rec: any) => {
                      const avail = Number(rec.unallocated_amount !== undefined ? rec.unallocated_amount : rec.amount);
                      return (
                        <option key={rec.id} value={rec.id}>
                          [{rec.sepay_transaction_id || rec.reference_code || `REC-${rec.id}`}] {rec.sender || "Khách"} - {formatVND(avail)} (Khả dụng) - "{rec.note || ""}"
                        </option>
                      );
                    })}
                  </select>
                )
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Số Tiền (₫) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={Number(amount.replace(/\D/g, "") || 0).toLocaleString("vi-VN")}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono text-emerald-300 focus:outline-none focus:border-emerald-400"
                />
                <DollarSign className="w-4 h-4 text-slate-500 absolute left-2.5 top-3" />
              </div>
            </div>

            {mode === "INSTALLMENT" && (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Kỳ Tháng Thanh Toán <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="YYYY-MM (VD: 2026-10)"
                    value={periodMonth}
                    onChange={(e) => setPeriodMonth(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-400"
                  />
                  <Calendar className="w-4 h-4 text-slate-500 absolute left-2.5 top-3" />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Ghi Chú Giao Dịch</label>
            <div className="relative">
              <input
                type="text"
                placeholder="VD: Ghi chú giao dịch..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
              <FileText className="w-4 h-4 text-slate-500 absolute left-2.5 top-3" />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50 text-white ${
                mode === "DEBT_BORROW"
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-500/20"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20"
              }`}
            >
              {submitting ? "Đang Xử Lý..." : "Xác Nhận"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
