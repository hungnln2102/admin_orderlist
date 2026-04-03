import React from "react";
import type { QuoteLineWithTotal, QuoteProductDescSection } from "../types";
import { displayDate } from "../utils/quoteFormat";
import { QuoteTable } from "./QuoteTable";
import { ProductInfoSection } from "./ProductInfoSection";
import { SignatureBlock } from "./SignatureBlock";
import { QuoteWatermark } from "./QuoteWatermark";
import { QuoteDocumentHeader } from "./QuoteDocumentHeader";
import { QuoteLetterIntro } from "./QuoteLetterIntro";
import { QuoteClosingSection } from "./QuoteClosingSection";

type QuotePrintSheetProps = {
  quoteCode: string;
  quoteDateYmd: string;
  greetingAddressee: string;
  contact: string;
  rows: QuoteLineWithTotal[];
  grandTotal: number;
  productDescSections: QuoteProductDescSection[];
};

export const QuotePrintSheet: React.FC<QuotePrintSheetProps> = ({
  quoteCode,
  quoteDateYmd,
  greetingAddressee,
  contact,
  rows,
  grandTotal,
  productDescSections,
}) => {
  const dateDisplay = displayDate(quoteDateYmd) || "—";

  return (
    <div className="print-wrapper flex justify-center py-2">
      <div
        id="quote-print-area"
        className="print-target relative overflow-hidden rounded-lg border border-transparent shadow-lg shadow-black/25 print:overflow-visible print:min-h-0 print:shadow-none"
        style={{
          width: "210mm",
          minHeight: "297mm",
          fontFamily:
            'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: "14px",
          lineHeight: 1.6,
        }}
      >
        <QuoteWatermark quoteCode={quoteCode} />

        <div className="relative z-[1]">
          <QuoteDocumentHeader
            quoteCode={quoteCode}
            dateDisplay={dateDisplay}
          />
          <QuoteLetterIntro
            greetingAddressee={greetingAddressee}
            contact={contact}
          />
          <QuoteTable rows={rows} grandTotal={grandTotal} />
          <ProductInfoSection sections={productDescSections} />
          <QuoteClosingSection />
          <SignatureBlock quoteDateLabel={dateDisplay} />
        </div>
      </div>
    </div>
  );
};
