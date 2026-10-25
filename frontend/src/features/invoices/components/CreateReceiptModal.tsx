import React, { useState, useEffect, useMemo } from "react";
import {
  X,
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
} from "lucide-react";

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
  customer: string;
  price: number;
  status: string;
  orderDate?: string;
  informationOrder?: string;
  productId?: string | number;
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

  // Custom Amount Mode State
  const [customAmount, setCustomAmount] = useState<string>("");
  const [customNote, setCustomNote] = useState<string>("");

  // UI state
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Format currency VND
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

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

  // Details of selected orders
  const selectedOrderObjects = useMemo(() => {
    const list = Array.isArray(matchableOrders) ? matchableOrders : [];
    const map = new Map(list.map((o) => [o.orderCode, o]));
    return (selectedOrderCodes || []).map((code) => {
      const found = map.get(code);
      return (
        found || {
          id: 0,
          orderCode: code,
          customer: "Chưa định danh",
          price: 0,
          status: "UNPAID",
        }
      );
    });
  }, [selectedOrderCodes, matchableOrders]);

  // Calculate total amount for batch
  const batchTotalAmount = useMemo(() => {
    return selectedOrderObjects.reduce((sum, o) => sum + Number(o.price || 0), 0);
  }, [selectedOrderObjects]);

  // Active Bank Account
  const activeBank = useMemo(() => {
    const list = Array.isArray(bankAccounts) ? bankAccounts : [];
    return list.find((b) => String(b.id) === String(selectedBankId)) || list[0] || null;
  }, [bankAccounts, selectedBankId]);

  // Final amount for QR
  const finalQrAmount = useMemo(() => {
    if (mode === "batch") return batchTotalAmount;
    const num = Number(customAmount.replace(/\D/g, ""));
    return Number.isFinite(num) && num > 0 ? num : 0;
  }, [mode, batchTotalAmount, customAmount]);

  // QR transfer description
  const qrTransferContent = useMemo(() => {
    if (mode === "batch") {
      if (selectedOrderCodes.length === 1) return selectedOrderCodes[0];
      return ""; // Theo chuẩn V1: Gộp nhiều đơn chuyển đúng số tiền, không bắt buộc nội dung CK
    }
    return customNote.trim();
  }, [mode, selectedOrderCodes, customNote]);

  // Generated VietQR Image URL (V2: Chuẩn compact2.png, không dùng addInfo)
  const qrImageUrl = useMemo(() => {
    if (!activeBank) return "";
    const bankCode = activeBank.bankShortCode || activeBank.bankBin || "ICB";
    const acc = activeBank.accountNumber || "";
    const params = new URLSearchParams();
    if (finalQrAmount > 0) params.set("amount", String(Math.round(finalQrAmount)));
    if (activeBank.accountHolder) params.set("accountName", activeBank.accountHolder);
    const qs = params.toString();
    return `https://img.vietqr.io/image/${bankCode}-${acc}-compact2.png${qs ? `?${qs}` : ""}`;
  }, [activeBank, finalQrAmount]);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Full message to send to customer via Zalo/Telegram
  const fullPaymentMessage = useMemo(() => {
    if (!activeBank) return "";
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
    if (qrTransferContent) {
      lines.push(`• Nội dung CK: ${qrTransferContent}`);
    } else {
      lines.push(`• Nội dung CK: Chuyển đúng số tiền trên (không cần ghi nội dung)`);
    }
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`Quét mã QR để hoàn tất thanh toán tự động.`);
    return lines.join("\n");
  }, [activeBank, finalQrAmount, mode, selectedOrderCodes, qrTransferContent]);

  // Confirm and Mark as Paid (ACID complete)
  const handleConfirmPaid = async () => {
    if (selectedOrderCodes.length === 0) {
      setErrorMessage("Vui lòng chọn ít nhất 1 đơn hàng để xác nhận thanh toán.");
      return;
    }

    if (
      !window.confirm(
        `Xác nhận thanh toán cho ${selectedOrderCodes.length} đơn hàng (${selectedOrderCodes.join(", ")}) với tổng số tiền ${formatCurrency(batchTotalAmount)}?\nCác đơn hàng sẽ chuyển sang trạng thái ĐÃ THANH TOÁN.`
      )
    ) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/invoices/batch-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderCodes: selectedOrderCodes,
          financialAccountId: selectedBankId ? Number(selectedBankId) : null,
          gateway: "VietQR_Batch",
          note: `Thanh toán gộp ${selectedOrderCodes.length} đơn: ${selectedOrderCodes.join(", ")}`,
          created_by: "ADMIN",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Không thể thanh toán các đơn hàng.");
      }

      setSuccessMessage(`Đã xác nhận thanh toán thành công ${selectedOrderCodes.length} đơn hàng!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi xác nhận thanh toán.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
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
                Gộp nhiều đơn hàng thành 1 mã QR thanh toán duy nhất cho khách hàng
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

        {/* Alerts */}
        {errorMessage && (
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
                        <span className="text-[10px] text-slate-400 font-normal lowercase">(cách nhau bằng phẩy hoặc xuống dòng)</span>
                      </label>
                      {selectedOrderCodes.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedOrderCodes([]);
                            setRawOrderCodesInput("");
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

                  {/* Danh sách các đơn đã chọn trong đợt gộp */}
                  <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        2. Chi Tiết Các Đơn Trong Đợt Gộp ({selectedOrderObjects.length})
                      </span>
                      <span className="text-xs font-bold text-cyan-400">
                        Tổng tiền: {formatCurrency(batchTotalAmount)}
                      </span>
                    </div>

                    {selectedOrderObjects.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">
                        Chưa có đơn hàng nào được chọn. Hãy dán mã đơn ở trên hoặc chọn từ danh sách bên dưới.
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {selectedOrderObjects.map((order, idx) => (
                          <div
                            key={`${order.orderCode}-${idx}`}
                            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 text-center text-[11px] font-mono text-slate-500">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-cyan-300">
                                    {order.orderCode}
                                  </span>
                                  <span className="text-slate-300 font-medium">
                                    {order.customer}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 truncate max-w-xs">
                                  {order.informationOrder || "Đơn hàng hệ thống"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-bold text-emerald-400">
                                {formatCurrency(order.price)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveOrder(order.orderCode)}
                                className="p-1 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                                title="Gỡ khỏi đợt gộp"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
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
                                    <span className="text-xs text-slate-400">
                                      {o.customer || "Khách lẻ"}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 truncate max-w-sm">
                                    {o.informationOrder || "Chưa có thông tin"}
                                  </p>
                                </div>
                              </label>

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-emerald-400">
                                  {formatCurrency(o.price)}
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
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      {formatCurrency(finalQrAmount)}
                    </span>
                  )}
                </div>

                {/* QR Image Frame */}
                {qrImageUrl ? (
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

                {/* Bank Account Details Card */}
                {activeBank && (
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
                      <span>Số tiền CK:</span>
                      <span className="text-amber-300 font-mono font-bold">{formatCurrency(finalQrAmount)}</span>
                    </div>
                  </div>
                )}

                {/* Fast Action Buttons */}
                <div className="grid grid-cols-2 gap-2 w-full">
                  {qrImageUrl && (
                    <a
                      href={qrImageUrl}
                      download={`vietqr_${activeBank?.accountNumber || "pay"}.png`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Tải Ảnh QR</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopy(fullPaymentMessage, "msg")}
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
                        <span>Copy Tin Nhắn Gửi Khách</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Confirm Paid Button */}
                {mode === "batch" && selectedOrderCodes.length > 0 && (
                  <button
                    type="button"
                    onClick={handleConfirmPaid}
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang xử lý thanh toán...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Xác Nhận Đã Thu Tiền ({selectedOrderCodes.length} Đơn)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
