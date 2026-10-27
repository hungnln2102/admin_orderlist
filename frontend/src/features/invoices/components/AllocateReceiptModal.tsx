import React, { useState, useEffect } from "react";
import {
  X,
  Link2,
  ShoppingCart,
  Building2,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Gift,
  PackagePlus,
  DollarSign,
} from "lucide-react";

interface InvoiceReceipt {
  id: number;
  id_order: string | null;
  payment_date: string;
  amount: number;
  unallocated_amount?: string | number;
  status?: string;
  sender: string;
  receiver: string;
  gateway: string;
  reference_code: string;
  sepay_transaction_id: string;
  transfer_type: "in" | "out" | string;
  note: string;
}

interface AllocateReceiptModalProps {
  receipt: InvoiceReceipt | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type AllocationType = "ORDER" | "OPERATIONAL_EXPENSE" | "OTHER_INCOME" | "EXTERNAL_IMPORT" | "FIXED_COST";

export const AllocateReceiptModal: React.FC<AllocateReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [allocationType, setAllocationType] = useState<AllocationType>("ORDER");
  const [targetCode, setTargetCode] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [importId, setImportId] = useState<string>("");
  const [supplierName, setSupplierName] = useState<string>("");
  const [fixedCosts, setFixedCosts] = useState<any[]>([]);
  const [selectedFixedCostId, setSelectedFixedCostId] = useState<string>("");
  const [loadingFixedCosts, setLoadingFixedCosts] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const availableAmount = receipt
    ? Number(receipt.unallocated_amount !== undefined ? receipt.unallocated_amount : receipt.amount)
    : 0;

  const generateRandomImportId = () => `IMP-${Math.floor(100 + Math.random() * 900)}`;

  useEffect(() => {
    if (receipt) {
      const avail = Number(receipt.unallocated_amount !== undefined ? receipt.unallocated_amount : receipt.amount);
      setAmount(String(avail));
      const isOut = receipt.transfer_type === "out";

      if (isOut) {
        setAllocationType("FIXED_COST");
        setImportId(generateRandomImportId());
        setSupplierName(receipt.sender || "");
        setTargetCode("");
        // Tự động nạp danh sách chi phí cố định để gợi ý khớp
        setLoadingFixedCosts(true);
        fetch("/api/finance/fixed-costs")
          .then((res) => (res.ok ? res.json() : { items: [] }))
          .then((data) => {
            const items = (data.items || []).filter((i: any) => i.isActive);
            setFixedCosts(items);
            const matched = items.find((i: any) => Number(i.amount) === avail);
            if (matched) {
              setSelectedFixedCostId(String(matched.id));
              setAllocationType("FIXED_COST");
            } else if (items.length > 0) {
              setSelectedFixedCostId(String(items[0].id));
            } else {
              setAllocationType("OPERATIONAL_EXPENSE");
            }
          })
          .catch((err) => console.error("Lỗi nạp chi phí cố định:", err))
          .finally(() => setLoadingFixedCosts(false));
      } else {
        setAllocationType("ORDER");
        setImportId("");
        setSupplierName("");
        if (receipt.note) {
          const match = receipt.note.match(/MAV[CLKS]\w+/i);
          if (match) {
            setTargetCode(match[0].toUpperCase());
          } else {
            setTargetCode("");
            if (/tip|tang|cho thêm|cho them/i.test(receipt.note)) {
              setAllocationType("OTHER_INCOME");
            }
          }
        } else {
          setTargetCode("");
        }
      }

      setNote("");
      setError(null);
    }
  }, [receipt]);

  if (!isOpen || !receipt) return null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const allocAmount = Number(amount);
    if (isNaN(allocAmount) || allocAmount <= 0) {
      setError("Số tiền phân bổ phải lớn hơn 0 ₫.");
      return;
    }

    if (allocAmount > availableAmount) {
      setError(`Số tiền vượt quá số dư khả dụng (${formatCurrency(availableAmount)}).`);
      return;
    }

    if (allocationType === "FIXED_COST" && !selectedFixedCostId) {
      setError("Vui lòng chọn Khoản chi phí cố định cần khớp.");
      return;
    }

    if (allocationType === "ORDER" && !targetCode.trim()) {
      setError("Vui lòng nhập Mã đơn hàng.");
      return;
    }

    if (allocationType === "EXTERNAL_IMPORT" && !supplierName.trim()) {
      setError("Vui lòng nhập Tên Nhà Cung Cấp / Nguồn hàng.");
      return;
    }

    setLoading(true);

    try {
      const finalNote = allocationType === "EXTERNAL_IMPORT"
        ? `[${supplierName.trim()}] ${note.trim()}`
        : (note.trim() || (allocationType === "OTHER_INCOME" ? "Khách tip / tặng thêm" : ""));

      const finalTargetCode = allocationType === "FIXED_COST"
        ? `FIXED_COST_${selectedFixedCostId}`
        : allocationType === "EXTERNAL_IMPORT"
        ? (importId.trim() || generateRandomImportId())
        : (allocationType === "ORDER" ? targetCode.trim() : null);

      const res = await fetch(`/api/invoices/${receipt.id}/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allocation_type: allocationType,
          target_code: finalTargetCode,
          amount: allocAmount,
          note: finalNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Phân bổ biên lai thất bại.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi phân bổ biên lai.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetFullAmount = () => {
    setAmount(String(availableAmount));
  };

  const handleSetHalfAmount = () => {
    setAmount(String(Math.floor(availableAmount / 2)));
  };

  const isOut = receipt.transfer_type === "out";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">PHÂN BỔ BẢN GHI & GÁN MÃ ĐƠN</h2>
              <p className="text-xs text-slate-400">
                {isOut ? "Phân bổ biên lai tiền ra (Chi phí / Nhập ngoài luồng)" : "Gán biên lai tiền vào (Đơn hàng / Tip khách)"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar space-y-5">
          {/* Info Card - Original Receipt */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Receipt className="w-4 h-4 text-cyan-400" />
                Mã Giao Dịch Ngân Hàng:
              </span>
              <span className="font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-lg border border-cyan-500/20">
                {receipt.sepay_transaction_id || receipt.reference_code || `#REC-${receipt.id}`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/60">
              <div>
                <span className="text-[11px] text-slate-500 block">Số tiền gốc</span>
                <span className="font-mono font-bold text-slate-200">{formatCurrency(receipt.amount)}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Số dư khả dụng</span>
                <span className="font-mono font-bold text-emerald-400">{formatCurrency(availableAmount)}</span>
              </div>
            </div>

            {receipt.note && (
              <div className="text-[11px] text-slate-400 font-mono bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/60 truncate">
                <span className="text-slate-500 block text-[10px] uppercase font-sans font-semibold mb-0.5">
                  Nội dung chuyển khoản gốc:
                </span>
                {receipt.note}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Allocation Type Selector (Categorized by transfer_type) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">LOẠI MỤC ĐÍCH PHÂN BỔ</label>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${isOut ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'}`}>
                {isOut ? 'TIỀN RA NGÂN HÀNG' : 'TIỀN VÀO NGÂN HÀNG'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {isOut ? (
                <>
                  {/* FIXED_COST */}
                  <button
                    type="button"
                    onClick={() => setAllocationType("FIXED_COST")}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      allocationType === "FIXED_COST"
                        ? "bg-purple-500/15 border-purple-500/50 text-purple-300 shadow-md shadow-purple-950/40"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                      <Building2 className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Chi Phí Cố Định</div>
                      <div className="text-[10px] text-slate-400">Server, mặt bằng, tool</div>
                    </div>
                  </button>

                  {/* EXTERNAL_IMPORT (Nhập Ngoài Luồng) */}
                  <button
                    type="button"
                    onClick={() => {
                      setAllocationType("EXTERNAL_IMPORT");
                      if (!importId) setImportId(generateRandomImportId());
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      allocationType === "EXTERNAL_IMPORT"
                        ? "bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-md shadow-amber-950/40"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                      <PackagePlus className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Nhập Ngoài Luồng</div>
                      <div className="text-[10px] text-slate-400">Mua nguồn, NCC ngoài</div>
                    </div>
                  </button>

                  {/* OPERATIONAL_EXPENSE */}
                  <button
                    type="button"
                    onClick={() => setAllocationType("OPERATIONAL_EXPENSE")}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      allocationType === "OPERATIONAL_EXPENSE"
                        ? "bg-rose-500/15 border-rose-500/50 text-rose-300 shadow-md shadow-rose-950/40"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
                      <DollarSign className="w-4 h-4 text-rose-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Chi Phí Đột Xuất</div>
                      <div className="text-[10px] text-slate-400">Ăn uống, ngoài luồng</div>
                    </div>
                  </button>
                </>
              ) : (
                <>
                  {/* ORDER */}
                  <button
                    type="button"
                    onClick={() => setAllocationType("ORDER")}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      allocationType === "ORDER"
                        ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-950/40"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <ShoppingCart className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Đơn Khách Hàng</div>
                      <div className="text-[10px] text-slate-400">Gán mã #MAVC, #MAVL</div>
                    </div>
                  </button>

                  {/* OTHER_INCOME */}
                  <button
                    type="button"
                    onClick={() => setAllocationType("OTHER_INCOME")}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      allocationType === "OTHER_INCOME"
                        ? "bg-pink-500/10 border-pink-500/40 text-pink-300 shadow-md shadow-pink-950/40"
                        : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <Gift className="w-4 h-4 text-pink-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Khách Tip / Tặng Thêm</div>
                      <div className="text-[10px] text-slate-400">Thu ngoài luồng đơn</div>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* FIXED_COST Fields (For Chi Phí Cố Định) */}
          {allocationType === "FIXED_COST" && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                CHỌN KHOẢN CHI PHÍ CỐ ĐỊNH CẦN KHỚP *
              </label>
              {loadingFixedCosts ? (
                <div className="p-3 bg-slate-950/60 rounded-xl text-xs text-slate-400">Đang tải danh sách chi phí...</div>
              ) : fixedCosts.length === 0 ? (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300">
                  Chưa có khoản chi phí cố định nào đang kích hoạt trong Trung Tâm Tài Chính.
                </div>
              ) : (
                <select
                  value={selectedFixedCostId}
                  onChange={(e) => setSelectedFixedCostId(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-purple-300 font-semibold focus:outline-none focus:border-purple-500 text-xs"
                >
                  <option value="">-- Chọn khoản chi phí (Server, Mặt bằng, Tool...) --</option>
                  {fixedCosts.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.name} • {formatCurrency(f.amount)} {f.isPaidThisMonth ? "✓ (Đã trả tháng này)" : "⚠️ (Chưa thanh toán)"}
                    </option>
                  ))}
                </select>
              )}
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-300">
                💡 Khớp với Chi phí cố định sẽ bảo toàn 100% Tài Sản Ròng và không bị trừ double vào Lợi Nhuận P&L.
              </div>
            </div>
          )}

          {/* Target Code Field (For ORDER) */}
          {allocationType === "ORDER" && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                MÃ ĐƠN HÀNG KÍCH HOẠT *
              </label>
              <input
                type="text"
                value={targetCode}
                onChange={(e) => setTargetCode(e.target.value.toUpperCase())}
                placeholder="Nhập mã đơn (VD: MAVC98A2F1)"
                className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-cyan-300 font-mono font-bold placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm uppercase transition-all"
              />
            </div>
          )}

          {/* EXTERNAL_IMPORT Fields (For Nhập Ngoài Luồng) */}
          {allocationType === "EXTERNAL_IMPORT" && (
            <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <PackagePlus className="w-4 h-4" />
                  Thông Tin Nhập Nguồn Ngoài Luồng
                </div>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20">
                  Mã tự động: {importId || "Tự tạo"}
                </span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">NHÀ CUNG CẤP / NGUỒN *</label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="VD: Adobe Global, MAVRYK STORE..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Amount Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">SỐ TIỀN PHÂN BỔ (VND) *</label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSetHalfAmount}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700 transition-all"
                >
                  50%
                </button>
                <button
                  type="button"
                  onClick={handleSetFullAmount}
                  className="px-2 py-0.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-semibold border border-cyan-500/30 transition-all"
                >
                  100% Số Dư
                </button>
              </div>
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Nhập số tiền..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-emerald-400 font-mono font-bold placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm transition-all"
            />
          </div>

          {/* Note Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">GHI CHÚ LOG PHÂN BỔ</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú chi tiết nếu có..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-700 text-xs transition-all"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/50 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang Phân Bổ...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác Nhận Phân Bổ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
