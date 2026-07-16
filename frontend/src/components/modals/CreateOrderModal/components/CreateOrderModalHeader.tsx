import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { CreateOrderCreationKind } from "../types";

type CreateOrderModalHeaderProps = {
  multiOrderEnabled: boolean;
  reservedOrderCode: string | null;
  orderCreationKind: CreateOrderCreationKind;
  hasPrefillCredit: boolean;
  creditMode: boolean;
  onToggleCreditMode: () => void;
  onClose: () => void;
};

export const CreateOrderModalHeader: React.FC<CreateOrderModalHeaderProps> = ({
  multiOrderEnabled,
  reservedOrderCode,
  orderCreationKind,
  hasPrefillCredit,
  creditMode,
  onToggleCreditMode,
  onClose,
}) => {
  const isImport = orderCreationKind === "import";

  return (
    <div className={`shrink-0 px-5 sm:px-6 py-4 border-b relative overflow-hidden ${
      isImport 
        ? "border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 to-slate-900 shadow-[0_4px_30px_rgba(79,70,229,0.15)]" 
        : "border-slate-700/70 bg-slate-900"
    } flex items-start justify-between gap-4`}>
      {isImport && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-[-50px] left-[-20%] w-[150%] h-[150px] bg-indigo-500/10 rotate-12 blur-3xl rounded-[100%]" />
        </div>
      )}
      <div className="relative z-10">
        <p className={`text-[11px] uppercase tracking-[0.26em] font-bold ${isImport ? "text-indigo-300" : "text-cyan-200/70"}`}>
          {isImport ? "Import Builder" : "Order Builder"}
        </p>
        <h3 className="mt-1 text-xl sm:text-2xl font-black text-white tracking-tight">
          {isImport 
            ? "Tạo Đơn Nhập Hàng" 
            : (multiOrderEnabled ? "Tạo đơn hàng gộp" : "Tạo đơn hàng mới")}
        </h3>
        <p className="mt-2 text-xs text-slate-300/75 max-w-xl leading-relaxed">
          {isImport 
            ? "Bổ sung hàng hóa vào Kho Hàng của Shop từ Nhà Cung Cấp. Nhập thông tin tài khoản và hệ thống sẽ tự động cập nhật kho lưu trữ."
            : (multiOrderEnabled
                ? "Nhập nhiều dòng chi tiết cho cùng một khách; hệ thống sẽ tạo các đơn thành phần rồi tự gộp theo đúng luồng gộp biên nhận."
                : "Hoàn thiện thông tin khách hàng, sản phẩm và chi phí trong một form duy nhất.")}
        </p>
        {reservedOrderCode ? (
          <p className={`mt-2.5 text-[11px] inline-flex px-2 py-0.5 rounded-md font-semibold ${isImport ? "bg-indigo-500/20 text-indigo-200" : "bg-cyan-500/20 text-cyan-200"}`}>
            Mã đơn dự kiến: {reservedOrderCode}
          </p>
        ) : null}
      </div>
      <div className="mt-1 flex items-center gap-3 shrink-0 relative z-10">
        {orderCreationKind === "sales" && !hasPrefillCredit ? (
          <button
            type="button"
            onClick={onToggleCreditMode}
            className={`inline-flex items-center justify-center h-11 px-4 rounded-xl border text-sm font-bold transition-all ${
              creditMode
                ? "border-amber-400/60 bg-amber-500/20 text-amber-100 shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                : "border-slate-500/70 bg-slate-800/90 text-slate-200 hover:bg-slate-700 hover:text-white"
            }`}
            title="Chuyển đổi: chọn khách từ phiếu credit còn khả dụng"
          >
            Credit
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className={`inline-flex items-center justify-center h-11 w-11 rounded-xl border transition-all ${
            isImport 
              ? "border-indigo-400/30 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/20 hover:text-white hover:border-indigo-400/50 hover:shadow-[0_0_12px_rgba(129,140,248,0.4)]"
              : "border-slate-500/70 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white"
          }`}
          aria-label="Close"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};
