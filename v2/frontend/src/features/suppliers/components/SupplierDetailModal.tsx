import React from "react";
import { X, Loader2 } from "lucide-react";
import { SupplierDetailData } from "../types";

interface SupplierDetailModalProps {
  selectedSupplierDetailId: number | null;
  onClose: () => void;
  loadingDetail: boolean;
  supplierDetail: SupplierDetailData | null;
  formatCurrency: (val: number) => string;
  onPayDebtSubmit: () => void;
  submitting: boolean;
}

export const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({
  selectedSupplierDetailId,
  onClose,
  loadingDetail,
  supplierDetail,
  formatCurrency,
  onPayDebtSubmit,
  submitting,
}) => {
  if (selectedSupplierDetailId === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-[#0e1320] border border-slate-800/90 rounded-2xl p-6 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
            Chi tiết Nhà Cung Cấp
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loadingDetail || !supplierDetail ? (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin inline mr-2" />
            Đang tải dữ liệu chi tiết Nhà cung cấp V1...
          </div>
        ) : (
          <div className="space-y-5 text-xs">
            {/* Top Grid: Thông Tin Chung & Tổng Quan Thanh Toán */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card Left: THÔNG TIN CHUNG */}
              <div className="bg-[#121829]/90 border border-slate-800/80 rounded-xl p-4 space-y-3 shadow-inner">
                <div className="text-[10.5px] font-bold text-indigo-400 uppercase tracking-wider mb-2">
                  THÔNG TIN CHUNG
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Tên NCC</span>
                  <span className="font-bold text-white text-sm">
                    {supplierDetail.general_info.supplier_name}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Ngân hàng</span>
                  <span className="font-semibold text-slate-200">
                    {supplierDetail.general_info.bank_name}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Số tài khoản</span>
                  <span className="font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-md">
                    {supplierDetail.general_info.number_bank || "Chưa cập nhật"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-400">Trạng thái</span>
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md uppercase">
                    {supplierDetail.general_info.active_supply
                      ? "ĐANG HOẠT ĐỘNG"
                      : "NGƯNG HỢP TÁC"}
                  </span>
                </div>
              </div>

              {/* Card Right: TỔNG QUAN THANH TOÁN */}
              <div className="bg-[#121829]/90 border border-slate-800/80 rounded-xl p-4 shadow-inner space-y-3">
                <div className="text-[10.5px] font-bold text-purple-400 uppercase tracking-wider mb-2">
                  TỔNG QUAN THANH TOÁN
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">ĐÃ TRẢ</div>
                    <div className="text-sm font-black text-slate-100 mt-1">
                      {formatCurrency(supplierDetail.payment_overview.total_paid)}
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-amber-500/30 rounded-xl p-3">
                    <div className="text-[10px] font-bold text-amber-400 uppercase">CÒN NỢ</div>
                    <div className="text-sm font-black text-amber-300 mt-1">
                      {formatCurrency(supplierDetail.payment_overview.remaining_debt)}
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">HOÀN TIỀN</div>
                    <div className="text-sm font-black text-rose-400 mt-1">
                      {formatCurrency(supplierDetail.payment_overview.refund_amount)}
                    </div>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">NỢ ĐƠN</div>
                    <div className="text-sm font-black text-slate-100 mt-1">
                      {supplierDetail.payment_overview.unpaid_orders_count}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Row: 4 Mini Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#121829]/90 border border-slate-800/80 rounded-xl p-3.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Tổng đơn</div>
                <div className="text-xl font-black text-white mt-1">
                  {supplierDetail.order_stats.total_orders}
                </div>
              </div>

              <div className="bg-[#121829]/90 border border-slate-800/80 rounded-xl p-3.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Đã thanh toán</div>
                <div className="text-xl font-black text-emerald-400 mt-1">
                  {supplierDetail.order_stats.paid_orders}
                </div>
              </div>

              <div className="bg-[#121829]/90 border border-slate-800/80 rounded-xl p-3.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Chưa thanh toán</div>
                <div className="text-xl font-black text-amber-400 mt-1">
                  {supplierDetail.order_stats.unpaid_orders}
                </div>
              </div>

              <div className="bg-[#121829]/90 border border-slate-800/80 rounded-xl p-3.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Đã hủy</div>
                <div className="text-xl font-black text-rose-400 mt-1">
                  {supplierDetail.order_stats.canceled_orders}
                </div>
              </div>
            </div>

            {/* Bottom Grid: Chu kỳ chưa thanh toán & Đơn theo tháng */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bottom Left Panel: CHU KỲ CHƯA THANH TOÁN */}
              <div className="bg-[#121829]/90 border border-slate-800/80 rounded-xl p-4 shadow-inner space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10.5px] font-bold text-cyan-400 uppercase tracking-wider">
                    CHU KỲ CHƯA THANH TOÁN
                  </div>
                </div>
                <div className="text-[11px] text-slate-400">
                  Cần chi{" "}
                  <strong className="text-amber-400">
                    {formatCurrency(supplierDetail.unpaid_cycle.amount_needed)}
                  </strong>{" "}
                  | Hoàn về shop{" "}
                  <strong className="text-emerald-400">
                    {formatCurrency(supplierDetail.unpaid_cycle.refund_to_shop)}
                  </strong>
                </div>

                {/* Payment Box */}
                <div className="bg-[#0b0f19] border border-indigo-500/30 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-md">
                  <div>
                    <div className="font-bold text-slate-200">
                      Công nợ theo đơn:{" "}
                      <strong className="text-amber-300">
                        {formatCurrency(supplierDetail.unpaid_cycle.debt_by_order)}
                      </strong>
                    </div>
                    <div className="text-[10.5px] text-slate-400 mt-1 flex items-center gap-2">
                      <span className="text-rose-400 font-bold uppercase">
                        {supplierDetail.unpaid_cycle.payment_status}
                      </span>
                      <span>•</span>
                      <span>
                        ĐÃ TRẢ: {formatCurrency(supplierDetail.unpaid_cycle.amount_paid)}
                      </span>
                    </div>
                  </div>

                  {supplierDetail.unpaid_cycle.amount_needed > 0 && (
                    <button
                      onClick={onPayDebtSubmit}
                      disabled={submitting}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 shrink-0"
                    >
                      {submitting ? "Đang xử lý..." : "Thanh toán"}
                    </button>
                  )}
                </div>

                {/* STK CHI TRẢ Dropdown */}
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-400 uppercase mb-1">
                    STK CHI TRẢ
                  </label>
                  <select className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
                    {supplierDetail.unpaid_cycle.shop_bank_accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* VietQR Image */}
                {supplierDetail.unpaid_cycle.vietqr_url && (
                  <div className="pt-2 text-center">
                    <div className="bg-white p-3 rounded-xl inline-block shadow-lg border border-slate-700 max-w-[220px]">
                      <img
                        src={supplierDetail.unpaid_cycle.vietqr_url}
                        alt="VietQR Payment"
                        className="w-full h-auto object-contain rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Right Panel: ĐƠN THEO THÁNG */}
              <div className="bg-[#121829]/90 border border-slate-800/80 rounded-xl p-4 shadow-inner space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10.5px] font-bold text-indigo-400 uppercase tracking-wider">
                    ĐƠN THEO THÁNG
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {supplierDetail.monthly_orders.length} tháng
                  </span>
                </div>

                <div className="space-y-2">
                  {supplierDetail.monthly_orders.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 italic">
                      Chưa có đơn phát sinh theo tháng
                    </div>
                  ) : (
                    supplierDetail.monthly_orders.map((m, i) => (
                      <div
                        key={i}
                        className="bg-slate-950/70 border border-slate-800/60 rounded-xl p-3 flex items-center justify-between hover:bg-slate-900/60 transition-colors"
                      >
                        <span className="font-bold text-slate-200">{m.month}</span>
                        <span className="font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-lg">
                          {m.count} đơn
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-800 text-xs">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-all font-semibold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
