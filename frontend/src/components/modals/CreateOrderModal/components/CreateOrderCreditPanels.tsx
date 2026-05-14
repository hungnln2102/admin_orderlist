import React from "react";
import { formatCurrency } from "@/features/orders/utils/ordersHelpers";

type ManualCreditMoney = {
  refOld: number;
  apply: number;
  avail: number;
  noteRemainingAfter: number;
  remaining: number;
};

type PrefillContext = {
  creditNoteId: number;
  creditSourceOrderCode: string;
  sourceOrderListPrice?: number;
  creditApplyAmount?: number;
  creditAvailableAmount?: number;
};

type CreditNote = {
  source_order_code?: string;
};

type Props = {
  creditMode: boolean;
  hasPrefillCredit: boolean;
  selectedCreditNote: CreditNote | null;
  manualCreditMoney: ManualCreditMoney | null;
  prefillContext?: PrefillContext | null;
  prefillCreditNoteRemaining: number | null;
  formDataPrice?: string | number;
};

export const CreateOrderCreditPanels: React.FC<Props> = ({
  creditMode,
  hasPrefillCredit,
  selectedCreditNote,
  manualCreditMoney,
  prefillContext,
  prefillCreditNoteRemaining,
  formDataPrice,
}) => {
  return (
    <>
      {creditMode && !hasPrefillCredit && selectedCreditNote && manualCreditMoney ? (
        <div
          className="mt-4 rounded-2xl border border-amber-400/35 bg-amber-950/35 px-3.5 py-3 text-sm text-amber-50/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          role="status"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200/90">
            Thanh toán bằng credit — đơn nguồn{" "}
            <span className="text-amber-50">
              {selectedCreditNote.source_order_code || "—"}
            </span>
          </p>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-200/95 [&_li]:flex [&_li]:justify-between [&_li]:gap-3">
            <li>
              <span className="text-slate-400">Giá bán tham chiếu (đơn cũ)</span>
              <span className="shrink-0 font-semibold text-white">
                {manualCreditMoney.refOld > 0
                  ? formatCurrency(manualCreditMoney.refOld)
                  : "—"}
              </span>
            </li>
            <li>
              <span className="text-slate-400">Credit trừ vào đơn này</span>
              <span className="shrink-0 font-semibold text-emerald-200/90">
                {formatCurrency(manualCreditMoney.apply)}
              </span>
            </li>
            <li>
              <span className="text-slate-400">
                Credit khả dụng (phiếu, lúc mở form)
              </span>
              <span className="shrink-0 font-semibold text-slate-100">
                {formatCurrency(manualCreditMoney.avail)}
              </span>
            </li>
            <li>
              <span className="text-slate-400">
                Credit còn lại trên phiếu (sau đơn này)
              </span>
              <span className="shrink-0 font-semibold text-amber-100/95">
                {formatCurrency(manualCreditMoney.noteRemainingAfter)}
              </span>
            </li>
            <li className="!block border-t border-amber-500/25 pt-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-amber-100/95">
                  Khách còn thanh toán (giá bán)
                </span>
                <span className="shrink-0 text-base font-black text-amber-50">
                  {formatCurrency(manualCreditMoney.remaining)}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500/90">
                Theo ô «Giá bán» sau khi bạn chọn sản phẩm — chọn gói mới, nhập giá, các dòng
                credit cập nhật tương ứng. «Giá bán tham chiếu» lấy từ số liệu phiếu (hoàn gốc)
                khi có.
              </p>
            </li>
          </ul>
        </div>
      ) : null}

      {prefillContext && Number(prefillContext.creditNoteId) > 0 ? (
        <div
          className="mt-4 rounded-2xl border border-amber-400/35 bg-amber-950/35 px-3.5 py-3 text-sm text-amber-50/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          role="status"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200/90">
            Thanh toán bằng credit — đơn nguồn{" "}
            <span className="text-amber-50">
              {prefillContext.creditSourceOrderCode || "—"}
            </span>
          </p>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-200/95 [&_li]:flex [&_li]:justify-between [&_li]:gap-3">
            <li>
              <span className="text-slate-400">Giá bán tham chiếu (đơn cũ)</span>
              <span className="shrink-0 font-semibold text-white">
                {formatCurrency(
                  Number(prefillContext.sourceOrderListPrice) || 0
                )}
              </span>
            </li>
            <li>
              <span className="text-slate-400">Credit trừ vào đơn này</span>
              <span className="shrink-0 font-semibold text-emerald-200/90">
                {formatCurrency(prefillContext.creditApplyAmount || 0)}
              </span>
            </li>
            <li>
              <span className="text-slate-400">
                Credit khả dụng (phiếu, lúc mở form)
              </span>
              <span className="shrink-0 font-semibold text-slate-100">
                {formatCurrency(prefillContext.creditAvailableAmount || 0)}
              </span>
            </li>
            <li>
              <span className="text-slate-400">
                Credit còn lại trên phiếu (sau đơn này)
              </span>
              <span className="shrink-0 font-semibold text-amber-100/95">
                {formatCurrency(prefillCreditNoteRemaining ?? 0)}
              </span>
            </li>
            <li className="!block border-t border-amber-500/25 pt-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-amber-100/95">
                  Khách còn thanh toán (giá bán)
                </span>
                <span className="shrink-0 text-base font-black text-amber-50">
                  {formatCurrency(Number(formDataPrice || 0))}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500/90">
                Theo ô «Giá bán» sau khi bạn chọn sản phẩm — chọn gói mới, nhập giá, số
                dòng này cập nhật tương ứng.
              </p>
            </li>
          </ul>
        </div>
      ) : null}
    </>
  );
};
