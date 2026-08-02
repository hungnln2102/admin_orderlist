/** CSS scoped #quote-print-area + @media print — màn hình: panel tối; in/PDF: giấy trắng. */
export const QUOTE_PRINT_STYLES = `
    #quote-print-area {
      color-scheme: dark;
      background-color: #0f172a !important;
      color: #cbd5e1 !important;
      border: 1px solid #334155 !important;
    }
    #quote-print-area h1,
    #quote-print-area .quote-ink,
    #quote-print-area strong.quote-ink {
      color: #f1f5f9 !important;
    }
    #quote-print-area .quote-muted,
    #quote-print-area span.quote-muted {
      color: #94a3b8 !important;
    }
    #quote-print-area .quote-table-head th {
      background-color: #312e81 !important;
      color: #e0e7ff !important;
      border-color: #4338ca !important;
    }
    #quote-print-area .quote-table-foot td {
      background-color: #1e293b !important;
      color: #f1f5f9 !important;
      border-color: #475569 !important;
    }
    #quote-print-area .quote-brand {
      color: #a5b4fc !important;
    }
    #quote-print-area .quote-doc-head-rule {
      border-bottom: 2px solid #818cf8 !important;
    }
    #quote-print-area .quote-doc-subtitle-en {
      color: #94a3b8 !important;
      font-style: italic !important;
    }
    #quote-print-area .quote-logo-wrap {
      background-color: transparent !important;
      display: flex;
      justify-content: flex-start;
      align-items: center;
    }
    #quote-print-area img.quote-logo-knockout {
      filter: invert(1);
      mix-blend-mode: multiply;
    }
    #quote-print-area .quote-watermark {
      color: rgba(165, 180, 252, 0.12) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    #quote-print-area .border-slate-100 {
      border-color: #1e293b !important;
    }
    #quote-print-area .border-slate-200 {
      border-color: #334155 !important;
    }
    #quote-print-area .border-slate-300 {
      border-color: #475569 !important;
    }
    #quote-print-area .text-slate-900 {
      color: #f8fafc !important;
    }
    #quote-print-area .text-slate-800 {
      color: #e2e8f0 !important;
    }
    #quote-print-area .text-slate-700 {
      color: #cbd5e1 !important;
    }
    #quote-print-area .text-slate-600 {
      color: #94a3b8 !important;
    }
    #quote-print-area .text-slate-500 {
      color: #94a3b8 !important;
    }
    #quote-print-area .text-slate-300 {
      color: #64748b !important;
    }
    #quote-print-area tbody tr.bg-white {
      background-color: #1e293b !important;
    }

    body {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    body::-webkit-scrollbar {
      display: none;
    }

    @media print {
      @page {
        margin: 12mm 12mm 14mm 12mm;
      }
      html, body {
        height: auto !important;
        overflow: visible !important;
        background: white !important;
      }
      body { margin: 0 !important; padding: 0 !important; }
      body * { visibility: hidden !important; }
      #quote-print-area,
      #quote-print-area * { visibility: visible !important; }
      .print-wrapper {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
      }
      #quote-print-area {
        position: static !important;
        left: auto !important;
        top: auto !important;
        width: 100% !important;
        max-width: 210mm !important;
        margin: 0 auto !important;
        min-height: auto !important;
        padding-bottom: 8mm !important;
        overflow: visible !important;
        box-shadow: none !important;
        border: none !important;
        break-inside: auto !important;
        page-break-inside: auto !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-scheme: light only !important;
        background-color: #ffffff !important;
        color: #334155 !important;
      }
      #quote-print-area h1,
      #quote-print-area .quote-ink,
      #quote-print-area strong.quote-ink {
        color: #0f172a !important;
      }
      #quote-print-area .quote-muted,
      #quote-print-area span.quote-muted {
        color: #64748b !important;
      }
      #quote-print-area .quote-table-head th {
        background-color: #e0e7ff !important;
        color: #1e1b4b !important;
        border-color: #c7d2fe !important;
      }
      #quote-print-area .quote-table-foot td {
        background-color: #f1f5f9 !important;
        color: #0f172a !important;
        border-color: #cbd5e1 !important;
      }
      #quote-print-area .quote-brand {
        color: #5b5bc0 !important;
      }
      #quote-print-area .quote-doc-head-rule {
        border-bottom: 2px solid #5b5bc0 !important;
      }
      #quote-print-area .quote-doc-subtitle-en {
        color: #64748b !important;
        font-style: italic !important;
      }
      #quote-print-area .quote-logo-wrap {
        background-color: #ffffff !important;
        display: flex;
        justify-content: flex-start;
        align-items: center;
      }
      #quote-print-area .quote-watermark {
        color: rgba(91, 91, 192, 0.07) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      #quote-print-area .border-slate-100 {
        border-color: #f1f5f9 !important;
      }
      #quote-print-area .border-slate-200 {
        border-color: #e2e8f0 !important;
      }
      #quote-print-area .border-slate-300 {
        border-color: #cbd5e1 !important;
      }
      #quote-print-area .text-slate-900 {
        color: #0f172a !important;
      }
      #quote-print-area .text-slate-800 {
        color: #1e293b !important;
      }
      #quote-print-area .text-slate-700 {
        color: #334155 !important;
      }
      #quote-print-area .text-slate-600 {
        color: #475569 !important;
      }
      #quote-print-area .text-slate-500 {
        color: #64748b !important;
      }
      #quote-print-area .text-slate-300 {
        color: #cbd5e1 !important;
      }
      #quote-print-area tbody tr.bg-white {
        background-color: #ffffff !important;
      }
      #quote-print-area .quote-system-footer {
        color: #64748b !important;
        visibility: visible !important;
        opacity: 1 !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .no-print { display: none !important; }
      #quote-print-area table { break-inside: auto; }
      #quote-print-area thead { display: table-header-group; }
      #quote-print-area tfoot { display: table-footer-group; }
    }
  `;
