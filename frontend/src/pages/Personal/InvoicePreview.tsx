import React from "react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import {
  COMPANY_INFO,
  INVOICE_FONT_STACK,
  InvoiceForm,
  InvoiceLine,
  formatCurrency,
} from "./bill-order.helpers";

type InvoicePreviewProps = {
  form: InvoiceForm;
  invoiceLines: InvoiceLine[];
  totals: { subtotal: number };
  dateDisplay: string;
  onDownload: () => void;
};

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  form,
  invoiceLines,
  totals,
  dateDisplay,
  onDownload,
}) => {
  const printStyles = `
    #invoice-preview,
    #invoice-preview * {
      font-family: ${INVOICE_FONT_STACK};
    }
    @media print {
      @page { size: A4; margin: 0; }
      html, body { margin: 0; padding: 0; background: white !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .app-aurora { background: white !important; }
      .app-aurora .bg-white,
      .app-aurora .bg-white\\/90,
      .app-aurora .bg-white\\/80,
      .app-aurora .bg-white\\/70,
      .app-aurora .bg-white\\/60,
      .app-aurora .bg-gray-50 {
        background: white !important;
        box-shadow: none !important;
        border: 1px solid transparent !important;
        color: #111 !important;
      }
      .app-aurora input,
      .app-aurora textarea,
      .app-aurora select {
        background: white !important;
        color: #111 !important;
        border-color: #ccc !important;
      }
      .app-aurora > :not(.print-shell) { display: none !important; }
      .print-shell > :not(main) { display: none !important; }
      main > :not(.print-wrapper) { display: none !important; }
      .print-wrapper { margin: 0 !important; padding: 0 !important; }
      .print-wrapper > :not(.print-target) { display: none !important; }
      .print-target { display: block !important; }
      .print-hidden { display: none !important; }
      #invoice-print-area {
        display: block !important;
        margin: 0 auto !important;
        padding: 0 !important;
        width: 100% !important;
        background: white !important;
      }
      #invoice-preview {
        box-sizing: border-box !important;
        box-shadow: none !important;
        border: none !important;
        background: white !important;
        color: #111 !important;
        width: 100% !important;
        max-width: 210mm !important;
        margin: 0 auto !important;
        padding: 24px !important;
        page-break-inside: avoid !important;
      }
      #invoice-preview table th,
      #invoice-preview table td {
        color: #111 !important;
      }
      #invoice-preview,
      #invoice-preview * {
        font-family: ${INVOICE_FONT_STACK} !important;
      }
    }
  `;

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
          <div
            id="invoice-preview"
            className="mx-auto max-w-5xl border border-slate-300 bg-white shadow-sm px-10 py-10 text-white"
            style={{ fontFamily: INVOICE_FONT_STACK }}
          >
            <div className="text-center leading-7">
              <h1 className="text-2xl font-bold uppercase tracking-wide">
                {COMPANY_INFO.name}
              </h1>
              <p>Địa chỉ: {COMPANY_INFO.address}</p>
              <p>Điện thoại: {COMPANY_INFO.phone}</p>
              <p>Ngân hàng: {COMPANY_INFO.bank}</p>
              <p>STK: {COMPANY_INFO.accountNumber}</p>
              <p>Tên người nhận: {COMPANY_INFO.receiver}</p>
            </div>

            <div className="my-4 h-px bg-slate-300" />

            <div className="text-center space-y-2 leading-7">
              <h2 className="text-xl font-bold uppercase">HÓA ĐƠN BÁN HÀNG</h2>
              <div className="text-sm">
                <p>Ngày: {dateDisplay}</p>
              </div>
            </div>

            <div className="mt-6 space-y-1 text-sm leading-6 px-2">
              <p>
                <span className="font-semibold">Khách hàng: </span>
                {form.customerName || "---"}
              </p>
              <p>
                <span className="font-semibold">Địa chỉ: </span>
                {form.address || "---"}
              </p>
              <p>
                <span className="font-semibold">SDT: </span>
                {form.phone || "---"}
                <span className="ml-6 font-semibold">Fax: </span>
                {form.fax || "---"}
              </p>
              <p>
                <span className="font-semibold">Mã số Thuế: </span>
                {form.taxCode || "---"}
              </p>
            </div>

            <div className="mt-8 px-2">
              <div className="overflow-hidden border border-slate-700 rounded-sm">
                <table className="w-full border-collapse text-sm text-white leading-6">
                  <thead>
                    <tr className="bg-transparent text-white font-semibold">
                      <th className="border border-slate-700 px-3 py-2 text-left text-white">
                        Tên hàng hóa / Dịch vụ
                      </th>
                      <th className="border border-slate-700 px-3 py-2 text-center text-white font-semibold">
                        Đơn giá
                      </th>
                      <th className="border border-slate-700 px-3 py-2 text-center text-white font-semibold">
                        SL
                      </th>
                      <th className="border border-slate-700 px-3 py-2 text-center text-white font-semibold">
                        Chiết khấu
                      </th>
                      <th className="border border-slate-700 px-3 py-2 text-center text-white font-semibold">
                        Thành tiền
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceLines.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="border border-slate-700 px-3 py-3 text-center text-white/80"
                        >
                          Chưa có mã hóa đơn nào được chọn.
                        </td>
                      </tr>
                    ) : (
                      invoiceLines.map((item) => (
                        <tr key={item.id}>
                          <td className="border border-slate-700 px-3 py-2 text-white">
                            <div className="font-semibold">{item.description}</div>
                          </td>
                          <td className="border border-slate-700 px-3 py-2 text-center text-white font-semibold">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="border border-slate-700 px-3 py-2 text-center text-white font-semibold">
                            {item.quantity}
                          </td>
                          <td className="border border-slate-700 px-3 py-2 text-center text-white font-semibold">
                            {`${item.discountPct.toLocaleString("vi-VN", {
                              maximumFractionDigits: 2,
                            })} %`}
                          </td>
                          <td className="border border-slate-700 px-3 py-2 text-center text-white font-semibold">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 pr-4 text-right text-sm font-semibold">
              Tổng tiền hàng: {formatCurrency(totals.subtotal)}
            </div>

            <div className="mt-8 text-center text-sm italic">
              Cảm ơn và hẹn gặp lại!
            </div>
          </div>
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
