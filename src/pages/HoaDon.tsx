import React, { useMemo, useState } from "react";
import { ArrowDownTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";

type InvoiceForm = {
  invoiceCode: string;
  invoiceDate: string;
  customerName: string;
  address: string;
  phone: string;
  fax: string;
  taxCode: string;
};

type InvoiceItem = {
  name: string;
  unitPrice: number;
  quantity: number;
};

type InvoiceEntry = {
  id: string;
  code: string;
};

const buildInvoiceEntry = (code: string): InvoiceEntry => {
  const makeId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? () => crypto.randomUUID()
      : () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return { id: makeId(), code };
};

const COMPANY_INFO = {
  name: "MAVRYK PREMIUM",
  address: "Phan Văn Trị, Phường 11, Quận Bình Thạnh",
  phone: "(0378.304.963)",
  bank: "VP Bank",
  accountNumber: "9183400998",
  receiver: "Ngô Lê Ngọc Hưng",
};

const DEFAULT_FORM: InvoiceForm = {
  invoiceCode: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  customerName: "CÔNG TY TNHH TMDV THANH SƠN HÓA NÔNG",
  address:
    "829 Trần Xuân Soạn, Phường Tân Hưng, Thành Phố Hồ Chí Minh, Việt Nam",
  phone: "028 3771 9999",
  fax: "028 3775 3266",
  taxCode: "0301760011",
};

const DEFAULT_ITEMS: InvoiceItem[] = [
  { name: "Adobe Bản Quyền 1PC - 12 tháng", unitPrice: 4_860_000, quantity: 1 },
  { name: "Canva Pro - 12 tháng", unitPrice: 0, quantity: 1 },
  { name: "Office 365 Bản Quyền - 12 tháng", unitPrice: 0, quantity: 1 },
];

const INVOICE_FONT_STACK =
  "'Myriad Pro','Myriad','Segoe UI','Helvetica Neue',Arial,sans-serif";

const formatCurrency = (value: number): string =>
  `${value.toLocaleString("vi-VN")} đ`;

export default function HoaDon() {
  const [form, setForm] = useState<InvoiceForm>(DEFAULT_FORM);
  const [invoiceCodes, setInvoiceCodes] = useState<InvoiceEntry[]>([]);
  const inputClass =
    "w-full rounded-lg border border-white/20 bg-white/5 text-white placeholder:text-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/60";
  const chipInputClass =
    "w-full rounded-lg border border-white/20 bg-white/5 text-white px-2 py-1.5 text-sm focus-within:ring-2 focus-within:ring-blue-400/60 focus-within:border-blue-400/60 flex items-center gap-2 flex-wrap relative overflow-x-auto";
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

  const totals = useMemo(() => {
    const subtotal = DEFAULT_ITEMS.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    return { subtotal };
  }, []);

  const dateDisplay = useMemo(() => {
    if (!form.invoiceDate) return "..... tháng ..... năm 20..";
    const date = new Date(form.invoiceDate);
    if (Number.isNaN(date.getTime())) return "..... tháng ..... năm 20..";
    return new Intl.DateTimeFormat("vi-VN").format(date);
  }, [form.invoiceDate]);

  const handleChange = (field: keyof InvoiceForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleInvoiceCodeBlur = () => {
    const code = form.invoiceCode.trim();
    if (!code) return;
    setInvoiceCodes((prev) => {
      if (prev.some((item) => item.code === code)) return prev;
      return [...prev, buildInvoiceEntry(code)];
    });
    setForm((prev) => ({ ...prev, invoiceCode: "" }));
  };

  const removeInvoiceCode = (id: string) => {
    setInvoiceCodes((prev) => {
      const idx = prev.findIndex((item) => item.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form values are bound live to the preview.
  };

  const handleDownload = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print-wrapper">
      <div className="rounded-2xl bg-white shadow-md border border-slate-200 print-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            Thông tin hóa đơn
          </h2>
        </div>

        <form className="px-6 py-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-100">
                Hóa Đơn
              </span>
              <div className={`${chipInputClass} flex flex-wrap items-center gap-2`}>
                {invoiceCodes.map((entry) => (
                  <div
                    key={entry.id}
                    className="relative z-10 flex shrink-0 items-center gap-2 rounded-full bg-slate-900/70 px-3 py-1.5 text-white shadow-sm shadow-indigo-900/40"
                  >
                    <span className="font-semibold text-sm">{entry.code}</span>
                    <button
                      type="button"
                      onClick={() => removeInvoiceCode(entry.id)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
                      aria-label={`Xóa hóa đơn ${entry.code}`}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <input
                  type="text"
                value={form.invoiceCode}
                onChange={(e) => handleChange("invoiceCode", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleInvoiceCodeBlur();
                  }
                  }}
                  className="min-w-[120px] flex-1 bg-transparent text-white placeholder:text-slate-300 focus:outline-none h-8 relative z-0"
                  placeholder="Nhập mã hóa đơn và nhấn Enter"
                />
              </div>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-100">Ngày</span>
              <input
                type="date"
                value={form.invoiceDate}
                onChange={(e) => handleChange("invoiceDate", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-100">
                Mã số thuế
              </span>
              <input
                type="text"
                value={form.taxCode}
                onChange={(e) => handleChange("taxCode", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-100">
                Khách hàng / Công ty
              </span>
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => handleChange("customerName", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-100">Fax</span>
              <input
                type="text"
                value={form.fax}
                onChange={(e) => handleChange("fax", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-100">
                Địa chỉ
              </span>
              <textarea
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-100">SĐT</span>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/30 hover:bg-blue-700 transition"
            >
              Cập nhật thông tin
            </button>
          </div>
        </form>
      </div>

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
                <h2 className="text-xl font-bold uppercase">
                  HÓA ĐƠN BÁN HÀNG
                </h2>
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
                          Thành tiền
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {DEFAULT_ITEMS.map((item) => {
                        const lineTotal = item.unitPrice * item.quantity;
                        return (
                          <tr key={item.name}>
                            <td className="border border-slate-700 px-3 py-2 text-white">
                              {item.name}
                            </td>
                            <td className="border border-slate-700 px-3 py-2 text-center text-white font-semibold">
                              {formatCurrency(item.unitPrice)}
                            </td>
                            <td className="border border-slate-700 px-3 py-2 text-center text-white font-semibold">
                              {item.quantity}
                            </td>
                            <td className="border border-slate-700 px-3 py-2 text-center text-white font-semibold">
                              {formatCurrency(lineTotal)}
                            </td>
                          </tr>
                        );
                      })}
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
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-700 transition"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
