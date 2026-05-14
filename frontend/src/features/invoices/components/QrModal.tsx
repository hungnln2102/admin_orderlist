import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { panelSurface } from "./qr-modal/helpers";
import { QrBatchToolsPanel } from "./qr-modal/QrBatchToolsPanel";
import { QrPreviewPanel } from "./qr-modal/QrPreviewPanel";
import { useQrModalController } from "./qr-modal/useQrModalController";
import type { QrModalProps } from "./qr-modal/types";
import { QR_BANK_INFO } from "../helpers";

export const QrModal: React.FC<QrModalProps> = ({
  open,
  amount,
  note,
  matchableOrders,
  onClose,
  onAmountChange,
  onNoteChange,
}) => {
  const controller = useQrModalController({
    open,
    amount,
    note,
    matchableOrders,
    onAmountChange,
    onNoteChange,
  });

  if (!open) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-slate-950/80 backdrop-blur-md px-3 py-6 sm:py-10">
        <div className="relative w-full max-w-6xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-[#151c2e] via-[#0f141c] to-[#0a0d12] text-white shadow-[0_32px_96px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.06]">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/35 to-transparent"
            aria-hidden
          />
          <button
            type="button"
            className="absolute right-3 top-3 z-10 rounded-full p-2.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Đóng"
          >
            <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <div className="px-5 py-7 sm:px-9 sm:py-9 space-y-5 sm:space-y-6 pt-14 sm:pt-10">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <span className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300/90">
                VietQR · Sepay
              </span>
              <h2 className="text-[1.35rem] sm:text-2xl font-bold text-white tracking-tight leading-snug">
                Tạo thông tin thanh toán qua QR Code
              </h2>
              <p className="text-sm text-slate-400/95 leading-relaxed max-w-xl mx-auto">
                Trên: nhập số tiền và nội dung hoặc gộp đơn MAVG. Dưới: mã QR và thông tin giao dịch
                khớp với các ô đã nhập.
              </p>
            </div>

            <div
              className={`${panelSurface} p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4`}
            >
              <img
                src="https://companieslogo.com/img/orig/VPB.VN-b0a9916f.png?t=1722928514"
                alt=""
                className="h-10 w-10 object-contain shrink-0 rounded-xl bg-white/12 p-1.5 ring-1 ring-white/10"
              />
              <div className="min-w-0 flex-1 text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Tài khoản nhận
                </p>
                <p className="font-mono text-sm font-semibold text-white tracking-tight truncate">
                  {QR_BANK_INFO.accountNumber}
                </p>
                <p className="text-xs text-slate-400 truncate">{QR_BANK_INFO.accountHolder}</p>
              </div>
            </div>

            <QrBatchToolsPanel
              amountDraft={controller.amountDraft}
              noteDraft={controller.noteDraft}
              orderHint={controller.orderHint}
              batchCodesDraft={controller.batchCodesDraft}
              batchLoading={controller.batchLoading}
              batchError={controller.batchError}
              batchInfo={controller.batchInfo}
              batchListLoading={controller.batchListLoading}
              batchListError={controller.batchListError}
              batchList={controller.batchList}
              selectedBatchCode={controller.selectedBatchCode}
              selectedBatchItems={controller.selectedBatchItems}
              selectedBatchLoading={controller.selectedBatchLoading}
              selectedBatchError={controller.selectedBatchError}
              onAmountDraftChange={controller.handleAmountInputChange}
              onAmountDraftBlur={controller.commitAmount}
              onAmountDraftEnter={controller.commitAmount}
              onNoteDraftChange={controller.setNoteDraft}
              onNoteDraftBlur={controller.commitNote}
              onNoteDraftEnter={controller.commitNote}
              onApplyAll={controller.applyAll}
              onBatchCodesDraftChange={controller.setBatchCodesDraft}
              onCreateBatchFromOrders={controller.createBatchFromOrders}
              onOpenBatchDetail={controller.openBatchDetail}
            />

            <QrPreviewPanel
              qrImageUrl={controller.qrImageUrl}
              formattedAmountDisplay={controller.formattedAmountDisplay}
              noteDisplay={controller.noteDisplay}
            />
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
