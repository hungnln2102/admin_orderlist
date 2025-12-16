import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import * as Helpers from "../../../../lib/helpers";
import { BankOption } from "../types";
import { useSupplyDetail } from "../hooks/useSupplyDetail";
import { usePayments } from "../hooks/usePayments";
import QrModal from "./QrModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  supplyId: number | null;
  banks?: BankOption[];
  onRefreshList?: () => void;
}

const SupplierDetailModal: React.FC<Props> = ({ isOpen, onClose, supplyId, banks = [], onRefreshList }) => {
  const { overview, loading, error, fetchOverview, setError } = useSupplyDetail(supplyId, isOpen);
  const { confirmingId, qrPayment, confirmPayment, showQrForPayment, setQrPayment } = usePayments({
    supply: overview?.supply,
    fetchOverview,
    onRefreshList,
  });

  if (!isOpen || !supplyId) return null;

  const supply = overview?.supply;
  const stats = overview?.stats;
  const unpaidPayments: any[] = overview?.unpaidPayments || [];
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

  const handleConfirmPayment = async (paymentId: number) => {
    const result = await confirmPayment(paymentId);
    if (!result.success) {
      setError(result.error || "Không thể thanh toán chu kỳ");
    }
  };

  const handleClose = () => {
    setQrPayment(null);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={handleClose}>
        <div
          className="bg-slate-900 border border-white/20 p-6 rounded-2xl text-white w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-white/60">Chi tiết Supplier #{supplyId}</p>
              <h2 className="text-2xl font-bold">{supply?.sourceName || "Đang tải..."}</h2>
              {supply && (
                <span className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>{statusLabel}</span>
              )}
            </div>
            <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 transition text-white/70" aria-label="Đóng">
              <XMarkIcon className="h-6 w-6" />
            </button>
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
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-white/80">Thông tin chung</h3>
                  <div className="text-sm text-white/80 space-y-1">
                    <div>
                      <span className="text-white/50">Ngân hàng: </span>
                      {bankNameResolved}
                    </div>
                    <div>
                      <span className="text-white/50">Số tài khoản: </span>
                      {supply?.numberBank || "--"}
                    </div>
                    <div>
                      <span className="text-white/50">Trạng thái: </span>
                      {statusLabel}
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-white/80">Tổng quan thanh toán</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm text-white/80">
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <p className="text-white/50 text-xs">Đã thanh toán</p>
                      <p className="text-lg font-semibold">{Helpers.formatCurrency(stats?.totalPaidAmount || 0)}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <p className="text-white/50 text-xs">Còn nợ</p>
                      <p className="text-lg font-semibold text-orange-300">{Helpers.formatCurrency(totalUnpaid)}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <p className="text-white/50 text-xs">Đơn chưa thanh toán</p>
                      <p className="text-lg font-semibold">{stats?.unpaidOrders ?? 0}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <p className="text-white/50 text-xs">Đơn đã thanh toán</p>
                      <p className="text-lg font-semibold">{stats?.paidOrders ?? 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-3 mt-4">
                {statCards.map((card) => (
                  <div key={card.label} className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <p className="text-white/50 text-xs">{card.label}</p>
                    <p className="text-xl font-semibold">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white/80">Chu kỳ chưa thanh toán</h3>
                    <span className="text-xs text-white/60">Còn nợ {Helpers.formatCurrency(totalUnpaid)}</span>
                  </div>
                  {unpaidPayments.length === 0 ? (
                    <p className="text-white/50 text-sm">Không có chu kỳ nợ.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scroll scroll-overlay">
                      {unpaidPayments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-white/5 gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{p.round || "Chu kỳ"}</p>
                            <p className="text-xs text-white/60">{p.status}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p>Nhập: {Helpers.formatCurrency(p.totalImport || 0)}</p>
                            <p className="text-white/60 text-xs">Đã trả: {Helpers.formatCurrency(p.paid || 0)}</p>
                          </div>
                          <div className="flex-shrink-0">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => showQrForPayment(p)}
                                className="px-3 py-1.5 text-xs rounded-lg bg-indigo-500 text-white hover:bg-indigo-600"
                              >
                                Xem QR
                              </button>
                              <button
                                disabled={confirmingId === p.id}
                                onClick={() => handleConfirmPayment(p.id)}
                                className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-60"
                              >
                                {confirmingId === p.id ? "Đang xử lý..." : "Thanh toán"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white/80">Đơn theo tháng</h3>
                    <span className="text-xs text-white/60">{monthlyOrders.length} tháng</span>
                  </div>
                  {monthlyOrders.length === 0 ? (
                    <p className="text-white/50 text-sm">Chưa có dữ liệu.</p>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scroll scroll-overlay">
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

              <div className="mt-6 text-right">
                <button onClick={handleClose} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white">
                  Đóng
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <QrModal payment={qrPayment} onClose={() => setQrPayment(null)} />
    </>
  );
};

export default SupplierDetailModal;
