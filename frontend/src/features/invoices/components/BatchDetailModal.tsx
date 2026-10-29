import React, { useState, useEffect } from "react";
import {
  X,
  Layers,
  Clock,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Download,
  Copy,
  Check,
  MessageSquare,
  Building2,
  Calendar,
  ShieldAlert,
  User,
  Package,
} from "lucide-react";

interface BatchOrderDetail {
  id: number;
  id_order: string;
  orderPrefix?: string;
  customer?: string;
  information_order?: string;
  display_name?: string;
  variant_name?: string;
  catalogBasePrice: number;
  price: number;
  status: string;
  order_date?: string;
  expired_at?: string;
}

interface BatchDetailData {
  batch: {
    id: number;
    batch_code: string;
    order_codes: string[] | string;
    base_amount: number;
    slot_suffix: number;
    total_amount: number;
    customer_name?: string | null;
    status: string;
    note?: string | null;
    expires_at: string;
    created_at: string;
    created_by?: string;
  };
  orders: BatchOrderDetail[];
  bank: {
    bank_display_name?: string;
    bank_short_code?: string;
    account_number?: string;
    account_holder?: string;
  };
  vietqr_url: string;
}

interface BatchDetailModalProps {
  batchId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelSuccess?: () => void;
}

export const BatchDetailModal: React.FC<BatchDetailModalProps> = ({
  batchId,
  isOpen,
  onClose,
  onCancelSuccess,
}) => {
  const [data, setData] = useState<BatchDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${mins}`;
  };

  const fetchDetail = async () => {
    if (!batchId) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/invoices/batches/${batchId}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Không thể tải chi tiết đợt gộp đơn.");
      }
      const json = await res.json();
      setData(json.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi tải chi tiết đợt gộp.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && batchId) {
      fetchDetail();
    } else {
      setData(null);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, batchId]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCancelBatch = async () => {
    if (!data?.batch) return;
    const reason = window.prompt(
      `Master có chắc chắn muốn hủy đợt gộp #${data.batch.batch_code}?\nSlot Suffix (+${data.batch.slot_suffix}₫) sẽ được giải phóng ngay lập tức.\nNhập lý do hủy (tùy chọn):`
    );
    if (reason === null) return;

    setCanceling(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/invoices/batches/${data.batch.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "Admin hủy đợt gộp" }),
      });
      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || "Không thể hủy đợt gộp.");
      }
      setSuccessMessage(resJson.message || `Đã hủy đợt gộp #${data.batch.batch_code}!`);
      if (onCancelSuccess) onCancelSuccess();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi hủy đợt gộp.";
      setErrorMessage(msg);
    } finally {
      setCanceling(false);
    }
  };

  const buildPaymentMessage = () => {
    if (!data) return "";
    const { batch, bank } = data;
    const lines = [
      `💳 THÔNG TIN THANH TOÁN ĐƠN GỘP`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `• Mã đợt gộp: ${batch.batch_code}`,
      `• Ngân hàng: ${bank.bank_display_name || bank.bank_short_code || "VPBank"}`,
      `• Số tài khoản: ${bank.account_number || ""}`,
      `• Chủ tài khoản: ${bank.account_holder || ""}`,
      `• Số tiền: ${formatCurrency(batch.total_amount)}`,
    ];
    if (data.orders.length > 0) {
      lines.push(`• Danh sách đơn: ${data.orders.map((o) => o.id_order).join(", ")}`);
    }
    lines.push(`• Nội dung CK: ${batch.batch_code}`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`Quét mã VietQR hoặc chuyển đúng số tiền trên để hoàn tất đối soát tự động.`);
    return lines.join("\n");
  };

  if (!isOpen) return null;

  const batch = data?.batch;
  const orders = data?.orders || [];
  const bank = data?.bank;

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

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "PENDING":
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold">Chờ thanh toán</span>;
      case "COMPLETED":
        return <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">Đã thanh toán</span>;
      case "CANCELED":
        return <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-semibold">Đã hủy</span>;
      case "EXPIRED":
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-500/15 text-slate-300 border border-slate-500/30 text-xs font-semibold">Đã hết hạn</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-700 text-slate-300 text-xs">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2 font-mono">
                  {batch ? batch.batch_code : "Chi Tiết Đợt Gộp Đơn"}
                </h2>
                {batch && getStatusBadge(batch.status)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {batch?.customer_name ? `Khách hàng: ${batch.customer_name} • ` : ""}
                Tạo lúc: {formatDate(batch?.created_at)} • Hết hạn: {formatDate(batch?.expires_at)}
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

        {/* Alerts */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <span>Đang tải thông tin đợt gộp...</span>
            </div>
          ) : !batch ? (
            <div className="py-20 text-center text-slate-500">
              Không tìm thấy thông tin đợt gộp.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* CỘT TRÁI (7 CỘT): DANH SÁCH ĐƠN LẺ CẤU THÀNH */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <span>Đơn Lẻ Trong Đợt Gộp ({orders.length})</span>
                  </span>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Tổng gốc: </span>
                    <span className="text-xs font-bold text-cyan-300 font-mono">
                      {formatCurrency(batch.base_amount)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[56vh] overflow-y-auto pr-1">
                  {orders.map((o, idx) => (
                    <div
                      key={o.id}
                      className="p-3.5 rounded-2xl bg-slate-950/50 border border-slate-800 hover:border-slate-700/80 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-center text-[11px] font-mono text-slate-500">
                            #{idx + 1}
                          </span>
                          <span className="font-mono font-bold text-cyan-300 text-xs">
                            {o.id_order}
                          </span>
                          {getPrefixBadge(o.orderPrefix)}
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-emerald-400 text-xs">
                            {formatCurrency(o.catalogBasePrice)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800/60">
                        <div>
                          <span className="text-slate-500">Khách: </span>
                          <span className="text-slate-300 font-medium">{o.customer || "Khách lẻ"}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500">Gói: </span>
                          <span className="text-slate-300 font-medium">
                            {o.display_name || o.variant_name || "—"}
                          </span>
                        </div>
                      </div>

                      {o.information_order && (
                        <p className="text-[11px] text-slate-400 font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 truncate">
                          {o.information_order}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Ngày đặt: {o.order_date || "—"}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CỘT PHẢI (5 CỘT): PREVIEW VIETQR & THÔNG TIN THANH TOÁN */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col items-center text-center space-y-4 shadow-xl">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                      Mã VietQR Thanh Toán
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                      {formatCurrency(batch.total_amount)}
                    </span>
                  </div>

                  {/* QR Image */}
                  {data?.vietqr_url ? (
                    <div className="p-3 bg-white rounded-2xl shadow-xl shadow-black/50">
                      <img
                        src={data.vietqr_url}
                        alt="VietQR Đợt Gộp"
                        className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xs text-slate-500">
                      Không có mã QR
                    </div>
                  )}

                  {/* Cost Breakdown */}
                  <div className="w-full space-y-1.5 text-left p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Tiền gốc ({orders.length} đơn):</span>
                      <span className="font-mono text-slate-200 font-semibold">
                        {formatCurrency(batch.base_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Đuôi Slot Suffix độc nhất:</span>
                      <span className="font-mono font-bold text-cyan-300">
                        +{batch.slot_suffix} ₫
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-300 pt-1 border-t border-cyan-800/60 font-semibold">
                      <span>Số tiền chuyển thực tế:</span>
                      <span className="font-mono font-bold text-amber-300 text-sm">
                        {formatCurrency(batch.total_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Bank Details */}
                  {bank && (
                    <div className="w-full space-y-1.5 text-left p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Ngân hàng:</span>
                        <span className="text-slate-200 font-semibold">
                          {bank.bank_display_name || bank.bank_short_code || "VPBank"}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400 items-center">
                        <span>Số tài khoản:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-cyan-400 font-mono font-bold">
                            {bank.account_number}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(bank.account_number || "", "stk")}
                            className="text-slate-500 hover:text-slate-300 cursor-pointer"
                            title="Sao chép STK"
                          >
                            {copiedField === "stk" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Chủ tài khoản:</span>
                        <span className="text-slate-200 font-semibold uppercase">
                          {bank.account_holder}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400 items-center pt-1 border-t border-slate-800">
                        <span>Nội dung CK:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400 font-mono font-bold">
                            {batch.batch_code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(batch.batch_code, "batch_code")}
                            className="text-slate-500 hover:text-slate-300 cursor-pointer"
                            title="Sao chép nội dung CK"
                          >
                            {copiedField === "batch_code" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {data?.vietqr_url && (
                      <a
                        href={data.vietqr_url}
                        download={`vietqr_${batch.batch_code}.png`}
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
                          <span>Copy Tin Nhắn</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Cancel batch button (Only if PENDING) */}
                  {batch.status === "PENDING" && (
                    <button
                      type="button"
                      onClick={handleCancelBatch}
                      disabled={canceling}
                      className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {canceling ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Đang hủy đợt gộp...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>Hủy Đợt Gộp (Giải Phóng Suffix)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

