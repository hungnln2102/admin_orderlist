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
}) => (
  <div className="shrink-0 px-4 sm:px-5 py-3 border-b border-slate-700/70 bg-slate-900 flex items-start justify-between gap-4">
    <div>
      <p className="text-[11px] uppercase tracking-[0.26em] text-cyan-200/70 font-bold">
        Order Builder
      </p>
      <h3 className="mt-1 text-base sm:text-lg font-black text-white tracking-tight">
        {multiOrderEnabled ? "Tạo đơn hàng gộp" : "Tạo đơn hàng mới"}
      </h3>
      <p className="mt-2 text-xs text-slate-300/75">
        {multiOrderEnabled
          ? "Nhập nhiều dòng chi tiết cho cùng một khách; hệ thống sẽ tạo các đơn thành phần rồi tự gộp theo đúng luồng gộp biên nhận."
          : "Hoàn thiện thông tin khách hàng, sản phẩm và chi phí trong một form duy nhất."}
      </p>
      {reservedOrderCode ? (
        <p className="mt-2 text-[11px] font-semibold text-cyan-200/90">
          Mã đơn dự kiến: {reservedOrderCode}
        </p>
      ) : null}
    </div>
    <div className="mt-1 flex items-center gap-2 shrink-0">
      {orderCreationKind === "sales" && !hasPrefillCredit ? (
        <button
          type="button"
          onClick={onToggleCreditMode}
          className={`inline-flex items-center justify-center h-11 px-3.5 rounded-xl border text-sm font-bold transition-colors ${
            creditMode
              ? "border-amber-400/60 bg-amber-500/20 text-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.2)]"
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
        className="inline-flex items-center justify-center h-11 w-11 rounded-xl border border-slate-500/70 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
        aria-label="Close"
      >
        <XMarkIcon className="h-6 w-6" />
      </button>
    </div>
  </div>
);
