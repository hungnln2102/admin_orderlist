import React from "react";

type QuoteWatermarkProps = {
  quoteCode: string;
};

export const QuoteWatermark: React.FC<QuoteWatermarkProps> = ({ quoteCode }) => (
  <div
    className="quote-watermark pointer-events-none absolute left-1/2 top-[42%] z-0 -translate-x-1/2 -translate-y-1/2 select-none"
    aria-hidden
  >
    <span
      className="block whitespace-nowrap font-bold uppercase tracking-[0.2em] text-[3rem] leading-none sm:text-[4.25rem]"
      style={{ transform: "rotate(-24deg)" }}
    >
      {quoteCode}
    </span>
  </div>
);
