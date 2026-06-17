import React from "react";
import type { ShopBankDisplay } from "../../helpers";
import { panelSurface } from "./helpers";

type Props = {
  qrImageUrl: string;
  formattedAmountDisplay: string;
  shopBank: ShopBankDisplay;
};

export const QrPreviewPanel: React.FC<Props> = ({
  qrImageUrl,
  formattedAmountDisplay,
  shopBank,
}) => (
  <div
    className={`${panelSurface} p-6 sm:p-8 flex flex-col items-center gap-8 relative overflow-hidden`}
  >
    <div
      className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-sky-500/15 blur-3xl"
      aria-hidden
    />
    <div className="relative flex flex-col items-center text-center space-y-4 w-full">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20 text-xs font-bold text-violet-200">
          3
        </span>
        <p className="text-sm font-semibold text-sky-200/95 tracking-tight">
          Quét mã QR để thanh toán
        </p>
      </div>
      <div className="relative mx-auto">
        <div
          className="absolute -inset-[3px] rounded-[1.35rem] bg-gradient-to-br from-sky-400/30 via-white/10 to-violet-500/25 opacity-80 blur-[2px]"
          aria-hidden
        />
        <div className="relative rounded-2xl bg-white p-4 sm:p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)]">
          <img
            src={qrImageUrl}
            alt="Mã QR chuyển khoản VietQR"
            className="h-52 w-52 sm:h-56 sm:w-56 object-contain block mx-auto"
          />
        </div>
      </div>
      <a
        href={qrImageUrl}
        download
        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/30 transition hover:from-sky-400 hover:to-blue-500"
      >
        Tải ảnh QR
      </a>
    </div>
    <dl className="relative w-full max-w-lg mx-auto space-y-0 rounded-2xl border border-white/[0.07] bg-slate-950/55 px-4 py-1 divide-y divide-white/[0.06]">
      <div className="flex justify-between gap-4 py-3">
        <dt className="text-slate-500 shrink-0 text-sm">Ngân hàng</dt>
        <dd className="font-medium text-slate-100 text-right text-sm">{shopBank.bankName || "—"}</dd>
      </div>
      <div className="flex justify-between gap-4 py-3">
        <dt className="text-slate-500 shrink-0 text-sm">Số tài khoản</dt>
        <dd className="font-mono font-semibold text-slate-100 text-right break-all text-sm">
          {shopBank.accountNumber || "—"}
        </dd>
      </div>
      <div className="flex justify-between gap-4 py-3">
        <dt className="text-slate-500 shrink-0 text-sm">Chủ TK</dt>
        <dd className="font-medium text-slate-100 text-right uppercase text-xs sm:text-sm leading-snug">
          {shopBank.accountHolder || "—"}
        </dd>
      </div>
      <div className="flex justify-between gap-4 py-3 items-baseline">
        <dt className="text-slate-500 shrink-0 text-sm">Số tiền</dt>
        <dd className="font-semibold text-amber-200 tabular-nums text-right text-sm">
          {formattedAmountDisplay}
        </dd>
      </div>
    </dl>
  </div>
);