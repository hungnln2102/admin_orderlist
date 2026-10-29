import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  ChevronRight,
  QrCode,
  Check,
  Copy,
  Download,
  Search,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Layers,
  RefreshCw,
  Sparkles,
  CreditCard,
  Trash2,
  ExternalLink,
  MessageSquare,
  Save,
  Eye,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { BatchDetailModal } from "./BatchDetailModal";
import { BatchSubOrdersModal } from "./BatchSubOrdersModal";
import { StatusBadge } from "@/features/orders/components/StatusBadge";
import { ORDER_STATUS } from "@/features/orders/constants/orderStatus";

interface BankAccount {
  id: number;
  label?: string;
  accountNumber: string;
  accountHolder: string;
  bankBin?: string;
  bankShortCode?: string;
  bankDisplayName?: string;
  isDefault?: boolean;
}

interface MatchableOrder {
  id: number;
  orderCode: string;
  orderPrefix?: string;
  customer: string;
  price: number;
  catalogBasePrice?: number;
  displayName?: string;
  variantName?: string;
  status: string;
  orderDate?: string;
  informationOrder?: string;
  productId?: string | number;
}

interface SavedBatch {
  id: number;
  batch_code: string;
  base_amount: number;
  slot_suffix: number;
  total_amount: number;
}

interface ConflictingBatchItem {
  id: number;
  batch_code: string;
  overlapCodes: string[];
}

interface CreateReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ModalMode = "batch" | "custom_amount";

export const CreateReceiptModal: React.FC<CreateReceiptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<ModalMode>("batch");

  // Bank accounts
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [loadingBanks, setLoadingBanks] = useState(false);

  // Orders list (Unpaid / Renew required)
  const [matchableOrders, setMatchableOrders] = useState<MatchableOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Batch Mode State
  const [rawOrderCodesInput, setRawOrderCodesInput] = useState<string>("");
  const [selectedOrderCodes, setSelectedOrderCodes] = useState<string[]>([]);
  const [orderSearchTerm, setOrderSearchTerm] = useState<string>("");

  // Slot suffix and saved batch state
  const [slotSuffix, setSlotSuffix] = useState<number>(0);
  const [savedBatch, setSavedBatch] = useState<SavedBatch | null>(null);
  const [savingBatch, setSavingBatch] = useState<boolean>(false);
  const [detailBatchId, setDetailBatchId] = useState<number | null>(null);
  const [previewBatchCode, setPreviewBatchCode] = useState<string>("");
  const [isSubOrdersModalOpen, setIsSubOrdersModalOpen] = useState<boolean>(false);
  const [conflictingBatches, setConflictingBatches] = useState<ConflictingBatchItem[] | null>(null);

  // Custom Amount Mode State
  const [customAmount, setCustomAmount] = useState<string>("");
  const [customNote, setCustomNote] = useState<string>("");

  // UI state
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Format currency VND
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  const getPrefixBadge = (prefix?: string) => {
    switch (prefix) {
      case "MAVC":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">CTV</span>;
      case "MAVL":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Bán lẻ</span>;
      case "MAVK":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">Khuyến mãi</span>;
      case "MAVS":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">Sinh viên</span>;
      case "MAVT":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Quà tặng</span>;
      default:
        return null;
    }
  };

  // 1. Fetch Bank Accounts
  useEffect(() => {
    if (!isOpen) return;
    const fetchBanks = async () => {
      setLoadingBanks(true);
      try {
        const res = await fetch("/api/wallets/shop-bank-accounts");
        if (res.ok) {
          const data = await res.json();
          const items: BankAccount[] = Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data?.accounts)
            ? data.accounts
            : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
            ? data
            : [];
          setBankAccounts(items);
          const defaultAcc = items.find((b) => b.isDefault) || items[0];
          if (defaultAcc) {
            setSelectedBankId(String(defaultAcc.id));
          }
        }
      } catch (err) {
        console.error("Lỗi tải danh sách tài khoản ngân hàng:", err);
      } finally {
        setLoadingBanks(false);
      }
    };
    fetchBanks();
  }, [isOpen]);

  // 2. Fetch Matchable Orders
  useEffect(() => {
    if (!isOpen) return;
    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const res = await fetch("/api/invoices/matchable-orders?limit=150");
        if (res.ok) {
          const json = await res.json();
          const ordersList: MatchableOrder[] = Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json?.orders)
            ? json.orders
            : Array.isArray(json)
            ? json
            : [];
          setMatchableOrders(ordersList);
        }
      } catch (err) {
        console.error("Lỗi tải danh sách đơn chờ thanh toán:", err);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, [isOpen]);

  // 3. Fetch Slot Suffix preview when orders change
  useEffect(() => {
    if (mode !== "batch" || selectedOrderCodes.length === 0) {
      setSlotSuffix(0);
      return;
    }
    // Khi danh sách đơn thay đổi: Bắt buộc hủy savedBatch để tránh khách quét QR cũ
    setSavedBatch(null);
    setConflictingBatches(null);

    const fetchSuffix = async () => {
      try {
        const res = await fetch("/api/invoices/batches/suffix");
        if (res.ok) {
          const data = await res.json();
          if (data?.suffix) {
            setSlotSuffix(Number(data.suffix));
          }
          if (data?.previewBatchCode) {
            setPreviewBatchCode(data.previewBatchCode);
          }
        }
      } catch (err) {
        console.error("Lỗi lấy slot suffix preview:", err);
      }
    };
    fetchSuffix();
  }, [mode, selectedOrderCodes]);

  // Parse order codes from textarea input
  const parsePastedCodes = (text: string): string[] => {
    if (!text) return [];
    const matches = text.match(/MAV[A-Z0-9]{3,20}/gi) || [];
    return Array.from(new Set(matches.map((c) => c.toUpperCase())));
  };

  // Handle textarea change
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawOrderCodesInput(val);
    const parsed = parsePastedCodes(val);
    if (parsed.length > 0) {
      setSelectedOrderCodes((prev) => Array.from(new Set([...prev, ...parsed])));
    }
  };

  // Toggle order checkbox
  const handleToggleOrder = (code: string) => {
    setSelectedOrderCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Remove single order from batch
  const handleRemoveOrder = (code: string) => {
    setSelectedOrderCodes((prev) => prev.filter((c) => c !== code));
  };

  // Select all orders of a customer
  const handleSelectAllByCustomer = (customerName: string) => {
    if (!customerName) return;
    const customerOrders = matchableOrders
      .filter((o) => o.customer && o.customer.toLowerCase() === customerName.toLowerCase())
      .map((o) => o.orderCode);
    setSelectedOrderCodes((prev) => Array.from(new Set([...prev, ...customerOrders])));
  };

  // Filtered orders list for quick picker
  const filteredOrders = useMemo(() => {
    const list = Array.isArray(matchableOrders) ? matchableOrders : [];
    if (!orderSearchTerm.trim()) return list;
    const q = orderSearchTerm.toLowerCase();
    return list.filter(
      (o) =>
        o.orderCode.toLowerCase().includes(q) ||
        o.customer.toLowerCase().includes(q) ||
        (o.informationOrder && o.informationOrder.toLowerCase().includes(q))
    );
  }, [matchableOrders, orderSearchTerm]);

  // Details of selected orders with accurate catalog price
  const selectedOrderObjects = useMemo(() => {
    const list = Array.isArray(matchableOrders) ? matchableOrders : [];
    const map = new Map(list.map((o) => [o.orderCode, o]));
    return (selectedOrderCodes || []).map((code) => {
      const found = map.get(code);
      const prefix = code.startsWith("MAVC")
        ? "MAVC"
        : code.startsWith("MAVL")
        ? "MAVL"
        : code.startsWith("MAVK")
        ? "MAVK"
        : code.startsWith("MAVS")
        ? "MAVS"
        : "MAVL";

      return (
        found || {
          id: 0,
          orderCode: code,
          orderPrefix: prefix,
          customer: "Chưa định danh",
          price: 0,
          catalogBasePrice: 0,
          status: "UNPAID",
        }
      );
    });
  }, [selectedOrderCodes, matchableOrders]);

  // Base total of selected orders: Lấy đúng giá gốc từ bảng giá, TUYỆT ĐỐI KHÔNG LÀM TRÒN
  const batchBaseAmount = useMemo(() => {
    return selectedOrderObjects.reduce(
      (sum, o) => sum + Number(o.catalogBasePrice ?? o.price ?? 0),
      0
    );
  }, [selectedOrderObjects]);

  // Total amount for batch including slot suffix: Base + Suffix (Không làm tròn số học)
  const batchTotalAmount = useMemo(() => {
    if (savedBatch?.total_amount) return Number(savedBatch.total_amount);
    if (batchBaseAmount <= 0) return 0;
    return batchBaseAmount + (slotSuffix || 0);
  }, [batchBaseAmount, slotSuffix, savedBatch]);

  // Active Bank Account
  const activeBank = useMemo(() => {
    const list = Array.isArray(bankAccounts) ? bankAccounts : [];
    return list.find((b) => String(b.id) === String(selectedBankId)) || list[0] || null;
  }, [bankAccounts, selectedBankId]);

  // Final amount for QR
  const finalQrAmount = useMemo(() => {
    if (mode === "batch") {
      return savedBatch ? Number(savedBatch.total_amount) : batchTotalAmount;
    }
    const num = Number(customAmount.replace(/\D/g, ""));
    return Number.isFinite(num) && num > 0 ? num : 0;
  }, [mode, savedBatch, batchTotalAmount, customAmount]);

  // QR transfer description
  const qrTransferContent = useMemo(() => {
    if (mode === "batch") {
      if (savedBatch?.batch_code) return savedBatch.batch_code;
      return "";
    }
    return customNote.trim();
  }, [mode, savedBatch, customNote]);

  // Generated VietQR Image URL (Chỉ tạo khi savedBatch tồn tại ở mode batch, hoặc mode custom_amount)
  const qrImageUrl = useMemo(() => {
    if (!activeBank) return "";
    if (mode === "batch" && !savedBatch) return ""; // CHẶN HIỂN THỊ KHI CHƯA LƯU DB
    if (finalQrAmount <= 0) return "";

    const bankCode = activeBank.bankShortCode || activeBank.bankBin || "ICB";
    const acc = activeBank.accountNumber || "";
    const params = new URLSearchParams();
    params.set("amount", String(Math.round(finalQrAmount)));
    if (activeBank.accountHolder) params.set("accountName", activeBank.accountHolder);
    const qs = params.toString();
    return `https://img.vietqr.io/image/${bankCode}-${acc}-compact2.png${qs ? `?${qs}` : ""}`;
  }, [activeBank, finalQrAmount, mode, savedBatch]);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Build full message to send to customer
  // Effective batch code & total amount for compact display
  const effectiveBatchCode = useMemo(() => {
    if (savedBatch?.batch_code) return savedBatch.batch_code;
    if (conflictingBatches?.[0]?.batch_code) return conflictingBatches[0].batch_code;
    if (previewBatchCode) return previewBatchCode;
    const todayStr = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10).replace(/-/g, "");
    return `MBP-${todayStr}-S${slotSuffix || 1}`;
  }, [savedBatch, conflictingBatches, previewBatchCode, slotSuffix]);

  const effectiveBatchTotal = useMemo(() => {
    if (savedBatch?.total_amount) return Number(savedBatch.total_amount);
    return batchTotalAmount;
  }, [savedBatch, batchTotalAmount]);

  const buildPaymentMessage = (batchCode?: string) => {
    if (!activeBank) return "";
    const code = batchCode || savedBatch?.batch_code || "";
    const lines = [
      `💳 THÔNG TIN THANH TOÁN ĐƠN HÀNG`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `• Ngân hàng: ${activeBank.bankDisplayName || activeBank.bankShortCode}`,
      `• Số tài khoản: ${activeBank.accountNumber}`,
      `• Chủ tài khoản: ${activeBank.accountHolder}`,
      `• Số tiền: ${formatCurrency(finalQrAmount)}`,
    ];
    if (mode === "batch" && selectedOrderCodes.length > 0) {
      lines.push(`• Danh sách đơn: ${selectedOrderCodes.join(", ")}`);
    }
    if (code) {
      lines.push(`• Nội dung CK: ${code}`);
    } else {
      lines.push(`• Nội dung CK: Chuyển đúng số tiền trên (không cần ghi nội dung)`);
    }
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`Quét mã QR để hoàn tất thanh toán tự động.`);
    return lines.join("\n");
  };

  // Save Batch to DB (Pending Batch Request)
  const handleSaveBatchPayment = async (forceCancelOld = false): Promise<SavedBatch | null> => {
    if (selectedOrderCodes.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất 1 mã đơn hàng.");
      return null;
    }

    setSavingBatch(true);
    setErrorMessage(null);
    setConflictingBatches(null);
    try {
      const res = await fetch("/api/invoices/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderCodes: selectedOrderCodes,
          financialAccountId: selectedBankId ? Number(selectedBankId) : null,
          customerName: selectedOrderObjects[0]?.customer || "",
          note: `Gộp ${selectedOrderCodes.length} đơn qua form Tạo Biên Lai`,
          created_by: "ADMIN",
          forceCancelOldBatches: forceCancelOld,
        }),
      });

      const json = await res.json();

      // Nếu phát hiện đơn bị trùng trong batch PENDING cũ
      if (res.status === 409 && json.code === "CONFLICTING_BATCH") {
        setConflictingBatches(json.conflictingBatches || []);
        setErrorMessage(json.error);
        return null;
      }

      if (!res.ok) {
        throw new Error(json.error || "Không thể lưu đợt gộp đơn.");
      }

      const newBatch: SavedBatch = json.data?.batch;
      setSavedBatch(newBatch);
      if (newBatch?.slot_suffix) {
        setSlotSuffix(Number(newBatch.slot_suffix));
      }
      setSuccessMessage(
        `Đã lưu đợt gộp #${newBatch.batch_code}! Khi khách chuyển tiền, hệ thống sẽ tự động đối soát và gia hạn.`
      );
      return newBatch;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi lưu đợt gộp.";
      setErrorMessage(msg);
      return null;
    } finally {
      setSavingBatch(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[94vh]">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-20 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
                  Tạo Đơn Thanh Toán Cho Khách Hàng
                </h2>
                <p className="text-xs text-slate-400">
                  Gộp nhiều đơn hàng thành 1 mã QR thanh toán kèm Slot Suffix định danh tự động
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="px-6 pt-3 pb-2 bg-slate-900/50 border-b border-slate-800/60 flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("batch")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                  mode === "batch"
                    ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-md shadow-cyan-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Gộp Nhiều Đơn Hàng (Batch)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("custom_amount")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                  mode === "custom_amount"
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-md shadow-emerald-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Tạo QR Theo Số Tiền Tùy Ý</span>
              </button>
            </div>

            {/* Bank selector mini */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>STK nhận:</span>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-cyan-500 font-medium"
              >
                {(Array.isArray(bankAccounts) ? bankAccounts : []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankShortCode || b.bankDisplayName} - {b.accountNumber} ({b.accountHolder}) {b.isDefault ? "★" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cảnh báo xung đột Batch cũ kèm nút Hủy */}
          {conflictingBatches && conflictingBatches.length > 0 && (
            <div className="mx-6 mt-4 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs space-y-3 shadow-lg">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-sm text-amber-300">
                    Phát Hiện Đơn Hàng Đang Nằm Trong Đợt Gộp Khác!
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {conflictingBatches.map((cb) => (
                      <span key={cb.id} className="block">
                        • Đơn <strong>[{cb.overlapCodes.join(", ")}]</strong> đang nằm trong đợt gộp <strong>#{cb.batch_code}</strong> chờ thanh toán.
                      </span>
                    ))}
                  </p>
                  <p className="text-[11px] text-amber-300/80 italic pt-1">
                    Theo quy tắc, bạn cần hủy đợt gộp cũ để giải phóng đơn và tạo mã QR mới.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-amber-500/20">
                <button
                  type="button"
                  onClick={() => setConflictingBatches(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Bỏ Qua
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBatchPayment(true)}
                  disabled={savingBatch}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-amber-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {savingBatch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>Hủy Đợt Gộp Cũ & Tạo QR Mới Ngay</span>
                </button>
              </div>
            </div>
          )}

          {/* Alerts thông thường */}
          {errorMessage && !conflictingBatches && (
            <div className="mx-6 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Main Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* CỘT TRÁI (7 CỘT): NHẬP / CHỌN ĐƠN HÀNG */}
              <div className="lg:col-span-7 space-y-5">
                {mode === "batch" ? (
                  <>
                    {/* Ô dán mã đơn hàng nhanh */}
                    <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                          <span>1. Dán Mã Đơn Hàng Cần Gộp</span>
                          <span className="text-[10px] text-slate-400 font-normal lowercase">
                            (cách nhau bằng phẩy hoặc xuống dòng)
                          </span>
                        </label>
                        {selectedOrderCodes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderCodes([]);
                              setRawOrderCodesInput("");
                              setSavedBatch(null);
                            }}
                            className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                          >
                            Xóa hết ({selectedOrderCodes.length})
                          </button>
                        )}
                      </div>

                      <textarea
                        rows={3}
                        placeholder="Dán mã đơn hàng tại đây: MAVCG89Q, MAVCK78X, MAVCL99P..."
                        value={rawOrderCodesInput}
                        onChange={handleTextareaChange}
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-xs font-mono text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 resize-none"
                      />
                    </div>

                    {/* 2. Khối Đợt Gộp Đơn Hàng (Single Row Compact Card: Mã Batch, Trạng Thái, Số Tiền) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-cyan-400" />
                          2. Đợt Gộp Thanh Toán
                        </span>
                        {selectedOrderObjects.length > 0 && (
                          <span className="text-[11px] text-slate-500">
                            Bấm vào dòng để xem chi tiết {selectedOrderObjects.length} đơn
                          </span>
                        )}
                      </div>

                      {selectedOrderObjects.length === 0 ? (
                        <div className="py-4 px-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-xs text-slate-500">
                          Chưa có đơn hàng nào được chọn. Hãy dán mã đơn ở trên hoặc chọn từ danh sách bên dưới.
                        </div>
                      ) : (
                        <div
                          onClick={() => setIsSubOrdersModalOpen(true)}
                          className="group p-3 rounded-xl bg-slate-900/90 hover:bg-slate-900 border border-cyan-500/30 hover:border-cyan-400 shadow-md shadow-black/40 hover:shadow-cyan-500/10 transition-all duration-150 cursor-pointer flex items-center justify-between gap-3"
                        >
                          {/* Cột Trái: Icon + Mã Batch + Trạng Thái (StatusBadge) + Số lượng đơn */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:bg-cyan-500/20 transition-colors shrink-0">
                              <Layers className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs sm:text-sm text-cyan-300 tracking-wide">
                                #{effectiveBatchCode}
                              </span>
                              <StatusBadge status={ORDER_STATUS.UNPAID} />
                              <span className="text-[11px] text-slate-400 font-medium">
                                ({selectedOrderObjects.length} đơn con)
                              </span>
                            </div>
                          </div>

                          {/* Cột Phải: Số Tiền (nổi bật) + Phân rã + Mũi tên */}
                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="text-right">
                              <div className="text-base sm:text-lg font-bold font-mono text-emerald-400 leading-tight">
                                {formatCurrency(effectiveBatchTotal)}
                              </div>
                              {slotSuffix > 0 ? (
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Gốc {formatCurrency(batchBaseAmount)} <span className="text-amber-400 font-semibold">(+{slotSuffix}₫)</span>
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Tiền gốc: {formatCurrency(batchBaseAmount)}
                                </div>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Danh sách gợi ý đơn hàng chưa thanh toán */}
                    <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          3. Hoặc Chọn Nhanh Từ Đơn Chưa Thanh Toán
                        </span>
                        <div className="relative w-48">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type="text"
                            placeholder="Lọc mã đơn, khách..."
                            value={orderSearchTerm}
                            onChange={(e) => setOrderSearchTerm(e.target.value)}
                            className="w-full h-7 bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-2 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/50">
                        {loadingOrders ? (
                          <p className="text-xs text-slate-500 text-center py-4">Đang tải danh sách đơn...</p>
                        ) : filteredOrders.length === 0 ? (
                          <p className="text-xs text-slate-500 text-center py-4">Không có đơn chưa thanh toán nào</p>
                        ) : (
                          filteredOrders.map((o) => {
                            const isChecked = selectedOrderCodes.includes(o.orderCode);
                            const displayPrice = Number(o.catalogBasePrice ?? o.price ?? 0);
                            return (
                              <div
                                key={o.id}
                                className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                                  isChecked
                                    ? "bg-cyan-500/10 border border-cyan-500/30"
                                    : "hover:bg-slate-800/60 border border-transparent"
                                }`}
                              >
                                <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggleOrder(o.orderCode)}
                                    className="w-3.5 h-3.5 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-800 border-slate-600 cursor-pointer"
                                  />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-xs font-bold text-slate-200">
                                        {o.orderCode}
                                      </span>
                                      {getPrefixBadge(o.orderPrefix)}
                                      <span className="text-xs text-slate-400">
                                        {o.customer || "Khách lẻ"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 truncate max-w-sm">
                                      {o.displayName || o.informationOrder || "Chưa có thông tin"}
                                    </p>
                                  </div>
                                </label>

                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-emerald-400 font-mono">
                                    {formatCurrency(displayPrice)}
                                  </span>
                                  {o.customer && (
                                    <button
                                      type="button"
                                      onClick={() => handleSelectAllByCustomer(o.customer)}
                                      className="text-[10px] text-cyan-400/80 hover:text-cyan-300 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
                                      title={`Chọn toàn bộ đơn của khách ${o.customer}`}
                                    >
                                      +Tất cả của khách
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  /* CHẾ ĐỘ 2: NHẬP SỐ TIỀN TÙY Ý */
                  <div className="p-5 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
                        Số Tiền Cần Thu (VND)
                      </label>
                      <input
                        type="text"
                        placeholder="VD: 500,000"
                        value={
                          customAmount
                            ? Number(customAmount.replace(/\D/g, "")).toLocaleString("vi-VN")
                            : ""
                        }
                        onChange={(e) => setCustomAmount(e.target.value.replace(/\D/g, ""))}
                        className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-4 text-lg font-mono font-bold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* Quick amounts */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {[50000, 100000, 200000, 500000, 1000000].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => {
                            const cur = Number(customAmount.replace(/\D/g, "")) || 0;
                            setCustomAmount(String(cur + v));
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
                        >
                          +{(v / 1000).toLocaleString("vi-VN")}k
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCustomAmount("")}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        Xóa
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
                        Nội Dung Chuyển Khoản (Không bắt buộc)
                      </label>
                      <input
                        type="text"
                        placeholder="VD: MAV... hoặc tên khách hàng"
                        value={customNote}
                        onChange={(e) => setCustomNote(e.target.value)}
                        className="w-full h-10 bg-slate-900 border border-slate-700 rounded-xl px-3 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* CỘT PHẢI (5 CỘT): PREVIEW VIETQR & GỬI KHÁCH HÀNG */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col items-center text-center space-y-4 shadow-xl">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                      <QrCode className="w-4 h-4" />
                      <span>Mã VietQR Thanh Toán</span>
                    </div>
                    {finalQrAmount > 0 && (
                      <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                        {formatCurrency(finalQrAmount)}
                      </span>
                    )}
                  </div>

                  {/* KHUNG HIỂN THỊ: CHỈ HIỆN QR KHI ĐÃ CÓ SAVED_BATCH (HOẶC CUSTOM AMOUNT) */}
                  {mode === "batch" && !savedBatch ? (
                    <div className="w-full py-8 px-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center text-center space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
                        <Zap className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-200">
                          Chưa Tạo Mã QR Đợt Gộp
                        </p>
                        <p className="text-xs text-slate-400 max-w-xs">
                          Bấm nút bên dưới để cấp Slot Suffix độc nhất và lưu đợt gộp vào hệ thống tự động đối soát.
                        </p>
                      </div>

                      {/* Tóm tắt tiền */}
                      <div className="w-full p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs space-y-1 text-left">
                        <div className="flex justify-between text-slate-400">
                          <span>Số đơn chọn:</span>
                          <span className="font-semibold text-slate-200">{selectedOrderObjects.length} đơn</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Tiền gốc:</span>
                          <span className="font-mono text-slate-200">{formatCurrency(batchBaseAmount)}</span>
                        </div>
                      </div>

                      {/* Nút Tạo QR & Lưu đợt gộp */}
                      <button
                        type="button"
                        onClick={() => handleSaveBatchPayment(false)}
                        disabled={savingBatch || selectedOrderCodes.length === 0}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-bold text-white shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        {savingBatch ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Đang lưu đợt gộp...</span>
                          </>
                        ) : (
                          <>
                            <QrCode className="w-4 h-4" />
                            <span>⚡ Tạo Mã QR Thanh Toán (Lưu Đợt Gộp)</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : qrImageUrl ? (
                    <div className="p-3 bg-white rounded-2xl shadow-xl shadow-black/50">
                      <img
                        src={qrImageUrl}
                        alt="Mã QR VietQR"
                        className="w-52 h-52 sm:w-56 sm:h-56 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-52 h-52 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs text-slate-500">
                      Chưa có số tiền thanh toán
                    </div>
                  )}

                  {/* Breakdown Suffix & Mã Batch khi đã lưu đợt gộp */}
                  {mode === "batch" && savedBatch && (
                    <div className="w-full space-y-1.5 text-left p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Tiền gốc ({selectedOrderObjects.length} đơn):</span>
                        <span className="font-mono text-slate-200 font-semibold">{formatCurrency(batchBaseAmount)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Đuôi Slot Suffix độc nhất:</span>
                        <span className="font-mono font-bold text-cyan-300">+{slotSuffix || 0} ₫</span>
                      </div>
                      <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800/60">
                        <span>Mã đợt gộp đã lưu:</span>
                        <span className="font-mono font-bold text-emerald-400">{savedBatch.batch_code}</span>
                      </div>
                    </div>
                  )}

                  {/* Bank Account Details Card (Chỉ hiện khi đã lưu batch hoặc custom amount) */}
                  {activeBank && (mode !== "batch" || savedBatch) && (
                    <div className="w-full space-y-1.5 text-left p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Ngân hàng:</span>
                        <span className="text-slate-200 font-semibold">{activeBank.bankDisplayName || activeBank.bankShortCode}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 items-center">
                        <span>Số tài khoản:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-cyan-400 font-mono font-bold">{activeBank.accountNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(activeBank.accountNumber, "stk")}
                            className="text-slate-500 hover:text-slate-300 cursor-pointer"
                            title="Sao chép STK"
                          >
                            {copiedField === "stk" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Chủ tài khoản:</span>
                        <span className="text-slate-200 font-semibold uppercase">{activeBank.accountHolder}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                        <span>Số tiền CK thực tế:</span>
                        <span className="text-amber-300 font-mono font-bold">{formatCurrency(finalQrAmount)}</span>
                      </div>
                      {savedBatch && (
                        <div className="flex justify-between text-slate-400 items-center pt-1 border-t border-slate-800">
                          <span>Nội dung CK:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-400 font-mono font-bold">{savedBatch.batch_code}</span>
                            <button
                              type="button"
                              onClick={() => handleCopy(savedBatch.batch_code, "batch_code")}
                              className="text-slate-500 hover:text-slate-300 cursor-pointer"
                              title="Sao chép nội dung CK"
                            >
                              {copiedField === "batch_code" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fast Action Buttons: Chỉ hiện khi đã có QR hợp lệ */}
                  {(mode !== "batch" || savedBatch) && qrImageUrl && (
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <a
                        href={qrImageUrl}
                        download={`vietqr_${savedBatch?.batch_code || activeBank?.accountNumber || "pay"}.png`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Tải Ảnh QR</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleCopy(buildPaymentMessage(), "msg")}
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        {copiedField === "msg" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Đã Sao Chép</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Copy Tin Nhắn Khách</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Nút Xem Chi Tiết Đợt Gộp (Chỉ khi đã lưu batch) */}
                  {savedBatch && (
                    <button
                      type="button"
                      onClick={() => setDetailBatchId(savedBatch.id)}
                      className="w-full py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                    >
                      <Eye className="w-4 h-4 text-cyan-400" />
                      <span>Xem Chi Tiết Đợt Gộp #{savedBatch.batch_code}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal View Chi Tiết Các Đơn Trong Đợt Gộp (Mở khi bấm vào khối Mục 2) */}
      <BatchSubOrdersModal
        isOpen={isSubOrdersModalOpen}
        onClose={() => setIsSubOrdersModalOpen(false)}
        batchCode={effectiveBatchCode}
        status="PENDING"
        totalAmount={effectiveBatchTotal}
        baseAmount={batchBaseAmount}
        slotSuffix={slotSuffix}
        orders={selectedOrderObjects}
        onRemoveOrder={handleRemoveOrder}
        isSaved={Boolean(savedBatch)}
      />

      {/* Modal Chi Tiết Đợt Gộp */}
      <BatchDetailModal
        batchId={detailBatchId}
        isOpen={Boolean(detailBatchId)}
        onClose={() => setDetailBatchId(null)}
        onCancelSuccess={() => {
          setSavedBatch(null);
          onSuccess();
        }}
      />
    </>
  );
};
