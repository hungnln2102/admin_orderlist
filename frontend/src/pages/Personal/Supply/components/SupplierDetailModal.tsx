import React, { useState, useMemo } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import * as Helpers from "../../../../lib/helpers";
import { BankOption } from "../types";
import { useSupplyDetail } from "../hooks/useSupplyDetail";
import { usePayments } from "../hooks/usePayments";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  supplyId: number | null;
  banks?: BankOption[];
  onRefreshList?: () => void;
}

const SupplierDetailModal: React.FC<Props> = ({ isOpen, onClose, supplyId, banks = [], onRefreshList }) => {
  const { overview, loading, error, fetchOverview, setError } = useSupplyDetail(supplyId, isOpen);
  const { confirmingId, confirmPayment } = usePayments({
    supply: overview?.supply,
    fetchOverview,
    onRefreshList,
  });
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);

  // Tính toán các giá trị từ overview (phải đặt trước useMemo)
  const supply = overview?.supply;
  const stats = overview?.stats;
  const unpaidPayments: any[] = overview?.unpaidPayments || [];
  const selectedPayment = unpaidPayments.find((p) => p.id === selectedPaymentId) || unpaidPayments[0] || null;

  // useMemo phải được gọi trước conditional return
  const qrImageUrl = useMemo(() => {
    if (!supply || !selectedPayment) return null;
    const amount = Number(selectedPayment.totalImport || selectedPayment.import_value || 0);
    const desc = selectedPayment.round || `PAY ${supply.id}`;
    if (!supply.numberBank || !supply.binBank) return null;
    
    return Helpers.buildSepayQrUrl({
      accountNumber: supply.numberBank,
      bankCode: supply.binBank,
      amount: Math.max(0, amount),
      description: desc,
      accountName: supply.nameBank || supply.sourceName || "",
    });
  }, [supply, selectedPayment]);

  const handleConfirmPayment = async (paymentId: number) => {
    const result = await confirmPayment(paymentId);
    if (!result.success) {
      setError(result.error || "Không thể thanh toán chu kỳ");
    }
  };

  const handleClose = () => {
    setSelectedPaymentId(null);
    onClose();
  };

  // Early return sau khi tất cả hooks đã được gọi
  if (!isOpen || !supplyId) return null;

  const totalUnpaid = unpaidPayments.reduce((sum, p) => sum + Math.max(0, (p.totalImport || 0) - (p.paid || 0)), 0);
  const monthlyOrders: Array<{ month: number; orders: number }> = stats?.monthlyOrders || [];
  const statusLabel = supply?.isActive ? "Đang hoạt động" : "Tạm dừng";
  const statusClass = supply?.isActive ? "bg-emerald-500/20 text-emerald-200" : "bg-gray-500/20 text-gray-200";
  const bankNameResolved =
    supply?.bankName ||
    banks.find((b) => (b.bin || "").trim() === (supply?.binBank || "").trim())?.name ||
    supply?.binBank ||
    "--";
  const statCards = [
    { label: "Tổng đơn", value: stats?.totalOrders ?? 0 },
    { label: "Đã thanh toán", value: stats?.paidOrders ?? 0 },
    { label: "Chưa thanh toán", value: stats?.unpaidOrders ?? 0 },
    { label: "Đã hủy", value: stats?.canceledOrders ?? 0 },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-2" onClick={handleClose}>
        <div
          className="glass-panel-dark border border-white/5 p-5 md:p-6 rounded-[32px] text-white w-full max-w-4xl max-h-[95vh] shadow-2xl overflow-y-auto custom-scroll"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1" />
            <h2 className="text-xl font-bold text-center">Chi tiết Nhà Cung Cấp</h2>
            <div className="flex-1 flex justify-end">
              <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 transition text-white/70" aria-label="Đóng">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 text-center text-white/70">Đang tải chi tiết...</div>
          ) : error ? (
            <div className="mt-6 bg-rose-500/10 text-rose-200 border border-rose-500/40 rounded-xl p-4 flex items-center justify-between gap-3">
              <span>{error}</span>
              <button onClick={fetchOverview} className="px-3 py-1 rounded-lg bg-rose-500 text-white text-sm hover:bg-rose-600">
                Thử lại
              </button>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-3 mt-5">
                <div className="bg-white/5 rounded-2xl border border-white/5 p-5 space-y-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300/80">Thông tin chung</h3>
                  <div className="text-sm text-white/80 space-y-2">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-white/40">Tên NCC</span>
                      <span className="font-bold text-white">{supply?.sourceName || "--"}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-white/40">Ngân hàng</span>
                      <span className="font-semibold text-white">{bankNameResolved}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-white/40">Số tài khoản</span>
                      <span className="font-mono font-semibold text-white">{supply?.numberBank || "--"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/40">Trạng thái</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${supply?.isActive ? "text-emerald-400 bg-emerald-500/10" : "text-white/50 bg-white/5"}`}>{statusLabel}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-2xl border border-white/5 p-5 space-y-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-300/80">Tổng quan thanh toán</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm text-white/80">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 transition-colors hover:bg-white/10">
                      <p className="text-white/50 text-[11px] font-bold uppercase tracking-wider">Đã trả</p>
                      <p className="text-lg font-bold text-white mt-1">{Helpers.formatCurrency(stats?.totalPaidAmount || 0)}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 transition-colors hover:bg-white/10">
                      <p className="text-white/50 text-[11px] font-bold uppercase tracking-wider">Còn nợ</p>
                      <p className="text-lg font-bold text-orange-400 mt-1">{Helpers.formatCurrency(totalUnpaid)}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 transition-colors hover:bg-white/10">
                      <p className="text-white/50 text-[11px] font-bold uppercase tracking-wider">Nợ đơn</p>
                      <p className="text-lg font-bold text-white mt-1">{stats?.unpaidOrders ?? 0}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 transition-colors hover:bg-white/10">
                      <p className="text-white/50 text-[11px] font-bold uppercase tracking-wider">Đã xong</p>
                      <p className="text-lg font-bold text-white mt-1">{stats?.paidOrders ?? 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                {statCards.map((card) => (
                  <div key={card.label} className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <p className="text-white/50 text-xs">{card.label}</p>
                    <p className="text-xl font-semibold">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-3 mt-3 items-start">
                {/* Chu kỳ chưa thanh toán + QR code */}
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white/80">Chu kỳ chưa thanh toán</h3>
                    <span className="text-xs text-white/60">Còn nợ {Helpers.formatCurrency(totalUnpaid)}</span>
                  </div>
                  {unpaidPayments.length === 0 ? (
                    <p className="text-white/50 text-sm">Không có chu kỳ nợ.</p>
                  ) : (
                    <>
                      {/* Danh sách chu kỳ với nút thanh toán */}
                      <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scroll scroll-overlay mb-3">
                        {unpaidPayments.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => setSelectedPaymentId(p.id)}
                            className={`w-full flex items-center justify-between rounded-lg px-3 py-2 border transition cursor-pointer ${
                              (selectedPayment?.id === p.id) 
                                ? "border-indigo-500 bg-indigo-500/20" 
                                : "border-white/5 bg-white/5 hover:bg-white/10"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm truncate">{p.round || "Chu kỳ"}</p>
                              <p className="text-xs text-white/60">{p.status}</p>
                            </div>
                            <div className="text-right text-sm mr-2">
                              <p className="text-rose-400 font-semibold">{Helpers.formatCurrency(p.totalImport || 0)}</p>
                              <p className="text-white/40 text-xs">Đã trả: {Helpers.formatCurrency(p.paid || 0)}</p>
                            </div>
                            <button
                              disabled={confirmingId === p.id}
                              onClick={(e) => { e.stopPropagation(); handleConfirmPayment(p.id); }}
                              className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60 font-semibold transition flex-shrink-0"
                            >
                              {confirmingId === p.id ? "..." : "Thanh toán"}
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* QR Code hiển thị trực tiếp */}
                      {selectedPayment && (
                        <div className="flex justify-center mt-2">
                          {qrImageUrl ? (
                            <img src={qrImageUrl} alt="QR" className="w-64 rounded-lg shadow-lg" />
                          ) : (
                            <div className="w-64 h-64 bg-white/10 rounded-lg flex items-center justify-center text-xs text-center p-2">
                              Thiếu thông tin NH
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Đơn theo tháng */}
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white/80">Đơn theo tháng</h3>
                    <span className="text-xs text-white/60">{monthlyOrders.length} tháng</span>
                  </div>
                  {monthlyOrders.length === 0 ? (
                    <p className="text-white/50 text-sm">Chưa có dữ liệu.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-80 overflow-y-auto custom-scroll scroll-overlay">
                      {monthlyOrders.map((m) => (
                        <div key={m.month} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                          <span className="text-sm font-semibold">Tháng {m.month}</span>
                          <span className="text-sm">{m.orders} đơn</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 text-right">
                <button onClick={handleClose} className="px-10 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold transition-all active:scale-95">
                  Đóng
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default SupplierDetailModal;
