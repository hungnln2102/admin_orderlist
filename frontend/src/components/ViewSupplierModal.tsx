// src/components/ViewSupplierModal.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
  XMarkIcon,
  ClipboardDocumentListIcon,
  XCircleIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { apiFetch } from "../lib/api"; // Chú ý đường dẫn lib
import * as Helpers from "../lib/helpers"; // Chú ý đường dẫn lib

// Helper components nội bộ
const StatCard = ({ title, value, accent, Icon }: any) => {
  const colors = {
    sky: "from-sky-500 via-sky-400 to-blue-500",
    rose: "from-rose-500 via-pink-500 to-red-500",
    violet: "from-purple-500 via-violet-500 to-indigo-500",
    emerald: "from-emerald-500 via-emerald-400 to-lime-500",
  }[accent as string] || "from-gray-500 to-gray-600";

  return (
    <div className="relative isolate rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/10 px-5 py-4 shadow-lg">
      <div className="relative flex items-center gap-4">
        <div className={`rounded-2xl bg-gradient-to-br ${colors} p-3 text-white shadow-inner`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-right flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">{title}</p>
          <p className="text-xl font-extrabold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default function ViewSupplierModal({ isOpen, onClose, supplyId }: { isOpen: boolean; onClose: () => void; supplyId: number | null }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (isOpen && supplyId) {
      fetchDetail();
    } else {
      setData(null);
      setError(null);
      setSelectedPaymentId(null);
    }
  }, [isOpen, supplyId]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/supplies/${supplyId}/overview`);
      if (!res.ok) throw new Error("Không thể tải thông tin chi tiết");
      const json = await res.json();
      
      const supply = json.supply || {};
      const stats = json.stats || {};
      const unpaid = Array.isArray(json.unpaidPayments) ? json.unpaidPayments : [];
      
      setData({ supply, stats, unpaidPayments: unpaid });
      if (unpaid.length > 0) setSelectedPaymentId(unpaid[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedPaymentId) return;
    setConfirming(true);
    try {
      const payment = data.unpaidPayments.find((p: any) => p.id === selectedPaymentId);
      const res = await apiFetch(`/api/payment-supply/${selectedPaymentId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidAmount: payment?.totalImport || payment?.import_value }),
      });
      if (!res.ok) throw new Error("Lỗi xác nhận thanh toán");
      await fetchDetail();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Lỗi hệ thống");
    } finally {
      setConfirming(false);
    }
  };

  if (!isOpen) return null;

  const supply = data?.supply;
  const stats = data?.stats;
  const unpaidPayments = data?.unpaidPayments || [];
  const selectedPayment = unpaidPayments.find((p: any) => p.id === selectedPaymentId);

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
    });
  }, [supply, selectedPayment]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6" onClick={onClose}>
      <div className="w-full max-w-6xl bg-[#0f132c] border border-white/10 rounded-3xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden text-white" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div>
            <p className="text-lg font-semibold">Thông tin Nhà Cung Cấp</p>
            {supply && <p className="text-xs text-white/60">ID: {supplyId} | {supply.sourceName}</p>}
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white"><XMarkIcon className="h-6 w-6" /></button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-6 flex-1">
          {loading && <p className="text-center text-white/50">Đang tải...</p>}
          {error && <p className="text-center text-rose-400">{error}</p>}

          {!loading && data && (
            <>
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 bg-white/5 rounded-3xl p-5 border border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                   <div><p className="text-white/60">Tên NCC</p><p className="text-lg font-bold">{supply.sourceName}</p></div>
                   <div><p className="text-white/60">Trạng Thái</p><span className="text-emerald-400 font-bold">{supply.active_supply !== false ? "Hoạt Động" : "Tạm Dừng"}</span></div>
                   <div><p className="text-white/60">Số Tài Khoản</p><p className="font-mono">{supply.numberBank || "--"}</p></div>
                   <div><p className="text-white/60">Ngân Hàng</p><p>{supply.bankName || supply.binBank || "--"}</p></div>
                </div>
                <div className="flex-[1.5] grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Tổng Đơn" value={stats.totalOrders} accent="sky" Icon={ClipboardDocumentListIcon} />
                  <StatCard title="Đơn Hủy" value={stats.canceledOrders} accent="rose" Icon={XCircleIcon} />
                  <StatCard title="Tháng Này" value={stats.monthlyOrders} accent="violet" Icon={CalendarDaysIcon} />
                  <StatCard title="Đã Thanh Toán" value={Helpers.formatCurrency(stats.totalPaidAmount)} accent="emerald" Icon={CurrencyDollarIcon} />
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-white/80">Chu kỳ chưa thanh toán</h3>
                  {unpaidPayments.length === 0 ? <p className="text-sm text-white/50">Không có công nợ.</p> : unpaidPayments.map((p: any) => (
                    <button key={p.id} onClick={() => setSelectedPaymentId(p.id)}
                      className={`w-full text-left rounded-xl border px-4 py-3 transition ${p.id === selectedPaymentId ? "border-indigo-500 bg-indigo-500/20" : "border-white/10 bg-white/5"}`}>
                      <p className="font-semibold">{p.round}</p>
                      <p className="text-xs text-white/70">Tiền hàng: {Helpers.formatCurrency(p.totalImport || p.import_value)}</p>
                    </button>
                  ))}
                </div>

                <div className="lg:col-span-2 bg-white/5 rounded-2xl border border-white/10 p-6">
                   {selectedPayment ? (
                     <div className="flex flex-col md:flex-row gap-6 items-center">
                        {qrImageUrl ? (
                          <img src={qrImageUrl} alt="QR" className="w-48 rounded-lg shadow-lg" />
                        ) : (
                          <div className="w-48 h-48 bg-white/10 rounded-lg flex items-center justify-center text-xs text-center p-4">Thiếu thông tin NH để tạo QR</div>
                        )}
                        <div className="flex-1 space-y-3 w-full">
                           <h3 className="text-xl font-bold">{selectedPayment.round}</h3>
                           <div className="grid grid-cols-2 gap-4 text-sm">
                              <div><p className="text-white/60">Chủ TK</p><p>{supply.sourceName}</p></div>
                              <div><p className="text-white/60">Số Tiền</p><p className="text-rose-400 font-bold text-lg">{Helpers.formatCurrency(selectedPayment.totalImport || selectedPayment.import_value)}</p></div>
                              <div className="col-span-2"><p className="text-white/60">Nội dung</p><p className="font-mono bg-black/30 p-2 rounded">{selectedPayment.round}</p></div>
                           </div>
                           <div className="pt-4 flex justify-end">
                              <button disabled={confirming} onClick={handleConfirmPayment} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold disabled:opacity-50">
                                {confirming ? "Đang xử lý..." : "Xác nhận đã chuyển khoản"}
                              </button>
                           </div>
                        </div>
                     </div>
                   ) : <div className="text-center text-white/50 py-10">Chọn một chu kỳ để thanh toán</div>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}