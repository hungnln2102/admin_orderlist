import React, { useEffect, useState } from "react";
import { FixedCost } from "../types";
import { X, CreditCard, DollarSign, Calendar, FileText, CheckCircle2, Wallet, Receipt, AlertCircle, RefreshCw } from "lucide-react";
import { formatVND } from "@/shared/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  fixedCost: FixedCost | null;
  onSuccess: () => void;
}

interface LiquidityAccount {
  id: number;
  label: string;
  detail: string;
  balance?: number;
}

export const FixedCostPaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  fixedCost,
  onSuccess,
}) => {
  const [fundingSource, setFundingSource] = useState<"RECEIPT" | "ACCOUNT">("RECEIPT");
  const [accounts, setAccounts] = useState<LiquidityAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | "">("");
  const [unallocatedReceipts, setUnallocatedReceipts] = useState<any[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | "">("");
  const [amount, setAmount] = useState<string>("");
  const [periodMonth, setPeriodMonth] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !fixedCost) return;

    setFundingSource("RECEIPT");
    setAmount(String(fixedCost.amount || 0));
    const now = new Date();
    setPeriodMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    setNote(`Thanh toán chi phí "${fixedCost.name}"`);
    setErrorMessage(null);

    setLoading(true);
    Promise.all([
      fetch("/api/wallets/shop-bank-accounts").then((res) => (res.ok ? res.json() : { items: [] })),
      fetch("/api/finance/unallocated-receipts").then((res) => (res.ok ? res.json() : { items: [] })),
    ])
      .then(([bankData, receiptData]) => {
        const banks = (bankData.items || [])
          .filter((a: any) => a.isActive)
          .map((a: any) => {
            const scopePrefix = a.accountScope === "PERSONAL" ? "💳 [Cá nhân]" : "🏢 [Shop]";
            return {
              id: Number(a.id),
              label: `${scopePrefix} ${a.label || a.bankDisplayName || "Ngân hàng"}`,
              detail: `${a.accountNumber} • ${a.accountHolder}`,
              balance: Number(a.balance || 0),
            };
          });
        setAccounts(banks);
        if (banks.length > 0) setSelectedAccountId(banks[0].id);

        const recs = receiptData.items || [];
        // Ưu tiên các biên lai tiền ra
        const outRecs = recs.filter((r: any) => r.transfer_type === "out" || Number(r.amount) > 0);
        setUnallocatedReceipts(outRecs);

        // Tự động tìm biên lai khớp chính xác số tiền
        const matched = outRecs.find(
          (r: any) => Number(r.unallocated_amount || r.amount) === Number(fixedCost.amount)
        );
        if (matched) {
          setSelectedReceiptId(matched.id);
        } else if (outRecs.length > 0) {
          setSelectedReceiptId(outRecs[0].id);
        }
      })
      .catch((err) => console.error("Lỗi nạp dữ liệu thanh toán:", err))
      .finally(() => setLoading(false));
  }, [isOpen, fixedCost]);

  if (!isOpen || !fixedCost) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage("Số tiền thanh toán phải lớn hơn 0");
      return;
    }

    if (fundingSource === "RECEIPT" && !selectedReceiptId) {
      setErrorMessage("Vui lòng chọn một biên lai tiền ra để khớp");
      return;
    }

    if (fundingSource === "ACCOUNT" && !selectedAccountId) {
      setErrorMessage("Vui lòng chọn tài khoản ngân hàng chi tiền");
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        amount: numAmount,
        periodMonth: periodMonth.trim(),
        note: note.trim(),
      };

      if (fundingSource === "RECEIPT") {
        payload.receiptId = Number(selectedReceiptId);
      } else {
        payload.financialAccountId = Number(selectedAccountId);
      }

      const res = await fetch(`/api/finance/fixed-costs/${fixedCost.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Thanh toán thất bại");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Đã xảy ra lỗi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                THANH TOÁN CHI PHÍ CỐ ĐỊNH
              </h2>
              <p className="text-xs text-slate-400">
                {fixedCost.name} • {formatVND(fixedCost.amount)}/tháng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Funding Source Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              NGUỒN TIỀN THANH TOÁN
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFundingSource("RECEIPT")}
                className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${fundingSource === "RECEIPT"
                    ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300 shadow-md shadow-cyan-950/40"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
              >
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                  <Receipt className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Gán Từ Biên Lai</div>
                  <div className="text-[10px] text-slate-400">Tiền ra chưa phân bổ</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFundingSource("ACCOUNT")}
                className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${fundingSource === "ACCOUNT"
                    ? "bg-purple-500/15 border-purple-500/50 text-purple-300 shadow-md shadow-purple-950/40"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
              >
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                  <Wallet className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">Trừ Số Dư Ví / TK</div>
                  <div className="text-[10px] text-slate-400">Trực tiếp từ ngân hàng</div>
                </div>
              </button>
            </div>
          </div>

          {/* If RECEIPT */}
          {fundingSource === "RECEIPT" && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                CHỌN BIÊN LAI TIỀN RA *
              </label>
              {loading ? (
                <div className="p-3 bg-slate-950/60 rounded-xl text-xs text-slate-400">Đang tải biên lai...</div>
              ) : unallocatedReceipts.length === 0 ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                  Không có biên lai tiền ra nào chưa phân bổ. Bạn có thể chọn "Trừ Số Dư Ví / TK" hoặc gán trực tiếp tại trang Biên Lai.
                </div>
              ) : (
                <select
                  value={selectedReceiptId}
                  onChange={(e) => setSelectedReceiptId(Number(e.target.value) || "")}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-cyan-300 font-semibold focus:outline-none focus:border-cyan-500 text-xs"
                >
                  <option value="">-- Chọn biên lai tiền ra --</option>
                  {unallocatedReceipts.map((r) => (
                    <option key={r.id} value={r.id}>
                      #{r.sepay_transaction_id || r.reference_code || r.id} • {formatVND(r.unallocated_amount || r.amount)} • {r.note || r.sender || "Tiền ra"}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* If ACCOUNT */}
          {fundingSource === "ACCOUNT" && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                TÀI KHOẢN NGÂN HÀNG CHI TIỀN *
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(Number(e.target.value) || "")}
                className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-purple-300 font-semibold focus:outline-none focus:border-purple-500 text-xs"
              >
                <option value="">-- Chọn tài khoản ngân hàng --</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} ({formatVND(a.balance || 0)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Month & Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                KỲ THANH TOÁN (THÁNG) *
              </label>
              <input
                type="text"
                value={periodMonth}
                onChange={(e) => setPeriodMonth(e.target.value)}
                placeholder="YYYY-MM"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                SỐ TIỀN THANH TOÁN (VNĐ) *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-emerald-300 font-mono font-bold text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              GHI CHÚ GIAO DỊCH
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Thanh toán tiền server tháng 10"
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              Chuẩn Hóa Kế Toán & Bảo Toàn Tài Sản Ròng
            </div>
            <p className="text-slate-400">
              Khoản này sau khi thanh toán sẽ đưa nghĩa vụ nợ tháng về 0 ₫, giúp Tài Sản Ròng và Lợi Nhuận không bị trừ double.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác Nhận Đã Thanh Toán</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

