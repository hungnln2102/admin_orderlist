import { INVOICE_FONT_STACK } from "../helpers";

export const buildInvoicePrintStyles = (): string => `
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
      body * { visibility: hidden !important; }
      #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
      #invoice-print-area {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
      }
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
        max-width: 210mm !important;
        margin: 0 auto !important;
        padding: 24px !important;
        page-break-inside: avoid !important;
        background: #ffffff !important;
        color: #111827 !important;
        border: 1px solid #cbd5e1 !important;
      }
      /* Force readable text colors on white print background, including inline styles. */
      #invoice-preview,
      #invoice-preview * {
        color: #1e293b !important;
      }
      #invoice-preview .inv-muted { color: #334155 !important; }
      #invoice-preview .inv-heading { color: #0f172a !important; }
      #invoice-preview .inv-border { border-color: #64748b !important; }
      #invoice-preview .inv-table-head { background: #f1f5f9 !important; color: #0f172a !important; }
      #invoice-preview .inv-table-cell { border-color: #94a3b8 !important; color: #1e293b !important; }
      #invoice-preview .inv-link-name { color: #1d4ed8 !important; }
      #invoice-preview,
      #invoice-preview * {
        font-family: ${INVOICE_FONT_STACK} !important;
      }
      #invoice-preview .invoice-signature img {
        max-width: 200px !important;
        height: auto !important;
        object-fit: contain !important;
        filter: none !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  `;
