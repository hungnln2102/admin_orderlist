import React from "react";
import QUOTE_LOGO from "@/assets/logo-transparent.png";
import {
  QUOTE_HEADER,
  QUOTE_LOGO_KNOCKOUT_BLACK_BG,
} from "../constants";

type QuoteDocumentHeaderProps = {
  quoteCode: string;
  dateDisplay: string;
};

export const QuoteDocumentHeader: React.FC<QuoteDocumentHeaderProps> = ({
  quoteCode,
  dateDisplay,
}) => (
  <header className="quote-doc-header px-8 pt-5 pb-1">
    <div className="flex flex-wrap items-start gap-3">
      <div className="quote-logo-wrap flex shrink-0 items-center py-1 pr-2">
        <img
          src={QUOTE_LOGO}
          alt={QUOTE_HEADER.companyName}
          className={`h-14 w-auto max-w-[180px] object-contain object-left sm:h-[4.5rem] sm:max-w-[200px]${QUOTE_LOGO_KNOCKOUT_BLACK_BG ? " quote-logo-knockout" : ""}`}
        />
      </div>
      <div className="min-w-0 flex-1 pt-0.5 sm:pt-1">
        <p className="quote-brand text-[15px] font-bold uppercase leading-snug tracking-tight sm:text-lg">
          {QUOTE_HEADER.companyName}
        </p>
        <p className="quote-muted mt-1 text-[11px] font-semibold uppercase tracking-wide sm:text-xs">
          {QUOTE_HEADER.tagline}
        </p>
      </div>
      <p className="quote-ink w-full text-right text-xs sm:ml-auto sm:w-auto sm:shrink-0 sm:whitespace-nowrap sm:pt-1 sm:text-sm">
        {QUOTE_HEADER.mstLabel}
      </p>
    </div>

    <div className="quote-doc-head-rule my-3 border-b-2 border-[#5b5bc0]" />

    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-slate-600 sm:text-sm">
      <span className="min-w-0 flex-1 leading-snug">{QUOTE_HEADER.address}</span>
      <span className="shrink-0 font-medium whitespace-nowrap text-slate-700">
        {QUOTE_HEADER.hotline}
      </span>
    </div>
    <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
      <span>{QUOTE_HEADER.email}</span>
      <span className="mx-2 text-slate-300">|</span>
      <span>{QUOTE_HEADER.website}</span>
    </p>

    <div className="mt-7 border-b border-slate-200 pb-5 text-center">
      <h1 className="quote-brand text-base font-bold uppercase leading-tight tracking-wide sm:text-xl">
        BẢNG BÁO GIÁ SẢN PHẨM & DỊCH VỤ
      </h1>
      <p className="quote-doc-subtitle-en mt-2 text-[11px] uppercase tracking-wide sm:text-sm">
        Software &amp; technology solution quotation
      </p>
      <p className="quote-ink mt-4 text-sm">
        <span className="text-slate-500">Số:</span>{" "}
        <strong className="font-semibold tabular-nums text-slate-900">
          {quoteCode}
        </strong>
        <span className="mx-2 text-slate-300">|</span>
        <span className="text-slate-500">Ngày:</span>{" "}
        <strong className="font-semibold text-slate-900">{dateDisplay}</strong>
      </p>
    </div>
  </header>
);
