import React from "react";

import { formatCurrencyValue } from "../../utils";

type PricePreviewGridProps = {
  highestSupplyPriceDisplay: string;
  previewWholesaleProfitLabel: string | null;
  previewRetailProfitLabel: string | null;
  previewWholesalePrice: number | null;
  previewRetailPrice: number | null;
  previewStudentPrice: number | null;
  previewStudentBlendHint: string | null;
  previewPromoPrice: number | null;
  previewPromoPercentLabel: string | null;
  showPreviewPromo: boolean;
  showPreviewStudent: boolean;
};

const PricePreviewGrid: React.FC<PricePreviewGridProps> = ({
  highestSupplyPriceDisplay,
  previewWholesaleProfitLabel,
  previewRetailProfitLabel,
  previewWholesalePrice,
  previewRetailPrice,
  previewStudentPrice,
  previewStudentBlendHint,
  previewPromoPrice,
  previewPromoPercentLabel,
  showPreviewPromo,
  showPreviewStudent,
}) => (
  <div className="rounded-[20px] border border-white/15 bg-gradient-to-r from-indigo-950/55 via-slate-900/55 to-indigo-950/65 p-3 md:p-4 shadow-[0_16px_45px_-30px_rgba(0,0,0,0.9)] backdrop-blur">
    <div className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-white/80 sm:flex-row sm:items-center sm:justify-between">
      <span>Giá đang nhập để lưu</span>
      <span className="font-medium normal-case text-amber-200">
        Giá nguồn cao nhất: <span className="font-semibold">{highestSupplyPriceDisplay}</span>
      </span>
    </div>
    <div
      className={`mt-3 md:mt-4 grid gap-2 md:gap-3 text-center text-sm grid-cols-2 ${
        showPreviewPromo && showPreviewStudent
          ? "md:grid-cols-4"
          : showPreviewPromo || showPreviewStudent
            ? "md:grid-cols-3"
            : "md:grid-cols-2"
      }`}
    >
      <div className="rounded-xl border border-white/15 bg-white/5 px-2 py-2 md:px-4 md:py-3 shadow-lg backdrop-blur-sm">
        <p className="text-[10px] md:text-xs uppercase text-white/70">Giá Sỉ</p>
        <p className="mt-1 text-base md:text-lg font-semibold text-white">
          {formatCurrencyValue(previewWholesalePrice)}
        </p>
        <p className="text-[11px] text-white/70">
          {previewWholesaleProfitLabel ?? "Chưa có % lợi nhuận"}
        </p>
      </div>
      <div className="rounded-xl border border-white/15 bg-white/5 px-2 py-2 md:px-4 md:py-3 shadow-lg backdrop-blur-sm">
        <p className="text-[10px] md:text-xs uppercase text-white/70">Giá Khách</p>
        <p className="mt-1 text-base md:text-lg font-semibold text-white">
          {formatCurrencyValue(previewRetailPrice)}
        </p>
        <p className="text-[11px] text-white/70">
          {previewRetailProfitLabel ?? "Chưa có % lợi nhuận"}
        </p>
      </div>
      {showPreviewStudent && (
        <div className="rounded-xl border border-white/15 bg-white/5 px-2 py-2 md:px-4 md:py-3 shadow-lg backdrop-blur-sm">
          <p className="text-[10px] md:text-xs uppercase text-white/70">Giá SV (MAVS)</p>
          <p className="mt-1 text-base md:text-lg font-semibold text-cyan-100">
            {formatCurrencyValue(previewStudentPrice)}
          </p>
          <p className="text-[11px] text-white/70">
            {previewStudentBlendHint ?? "Nhập tỷ lệ SV hoặc dùng mặc định"}
          </p>
        </div>
      )}
      {showPreviewPromo && (
        <div className="rounded-xl border border-white/15 bg-white/5 px-2 py-2 md:px-4 md:py-3 shadow-lg backdrop-blur-sm">
          <p className="text-[10px] md:text-xs uppercase text-white/70">Giá Khuyến mãi</p>
          <p className="mt-1 text-base md:text-lg font-semibold text-white">
            {formatCurrencyValue(previewPromoPrice)}
          </p>
          <p className="text-[11px] text-white/70">
            {previewPromoPercentLabel ?? "Giá lưu trực tiếp"}
          </p>
        </div>
      )}
    </div>
  </div>
);

export default PricePreviewGrid;
