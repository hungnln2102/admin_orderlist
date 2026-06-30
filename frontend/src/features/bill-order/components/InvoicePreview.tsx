import React, { useMemo } from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import {
  InvoiceForm,
  InvoiceLine,
  type CompanyBankInfo,
} from "../helpers";
import { InvoiceDocument } from "./InvoiceDocument";
import { buildInvoicePrintStyles } from "./invoicePrintStyles";

type InvoicePreviewProps = {
  form: InvoiceForm;
  invoiceLines: InvoiceLine[];
  totals: { subtotal: number };
  dateDisplay: string;
  invoiceCodesDisplay: string;
  orderStatusDisplay: string;
  companyBank: CompanyBankInfo;
  onDownload: () => void;
};

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  form,
  invoiceLines,
  totals,
  dateDisplay,
  invoiceCodesDisplay,
  orderStatusDisplay,
  companyBank,
  onDownload,
}) => {
  const { productTotal, discountTotal, subTotal } = useMemo(() => {
    const pt = invoiceLines.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const sub = totals.subtotal;
    return {
      productTotal: pt,
      discountTotal: Math.max(0, pt - sub),
      subTotal: sub,
    };
  }, [invoiceLines, totals.subtotal]);

  const printStyles = buildInvoicePrintStyles();


  return (
    <div className="rounded-2xl bg-white shadow-md border border-slate-200 print-target">
      <div className="border-b border-slate-200 px-6 py-4 print-hidden">
        <h2 className="text-lg font-semibold text-white">
          Xem trước & tải về
        </h2>
      </div>

      <div className="p-6">
        <style>{printStyles}</style>
        <div id="invoice-print-area">
          <InvoiceDocument
            form={form}
            invoiceLines={invoiceLines}
            productTotal={productTotal}
            discountTotal={discountTotal}
            subTotal={subTotal}
            dateDisplay={dateDisplay}
            invoiceCodesDisplay={invoiceCodesDisplay}
            orderStatusDisplay={orderStatusDisplay}
            companyBank={companyBank}
          />
        </div>

        <div className="mt-6 flex justify-center print-hidden">
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-700 transition"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};
