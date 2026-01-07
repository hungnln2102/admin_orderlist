import React, { useId, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { InvoiceEntry, InvoiceForm } from "../helpers";

type BillOrderFormProps = {
  form: InvoiceForm;
  invoiceCodes: InvoiceEntry[];
  onChange: (field: keyof InvoiceForm, value: string) => void;
  onAddInvoiceCode: () => void;
  onRemoveInvoiceCode: (id: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export const BillOrderForm: React.FC<BillOrderFormProps> = ({
  form,
  invoiceCodes,
  onChange,
  onAddInvoiceCode,
  onRemoveInvoiceCode,
  onSubmit,
}) => {
  const invoiceInputId = useId();
  const [hoveredInvoiceId, setHoveredInvoiceId] = useState<string | null>(null);
  const inputClass =
    "w-full rounded-lg border border-white/20 bg-white/5 text-white placeholder:text-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/60";
  const chipListBoxClass =
    "w-full rounded-lg border border-white/20 bg-white/5 text-white px-3 py-2 text-sm shadow-sm shadow-indigo-900/40 flex flex-wrap items-center gap-2 min-h-[48px]";
  const chipInputBoxClass =
    "w-full rounded-lg border border-white/20 bg-white/5 text-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-blue-400/60 focus-within:border-blue-400/60 flex items-center relative overflow-hidden";

  const handleInvoiceCodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddInvoiceCode();
    }
  };

  return (
    <div className="rounded-2xl bg-white shadow-md border border-slate-200 print-hidden">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-white">Thông tin hóa đơn</h2>
      </div>

      <form className="px-6 py-5 space-y-4" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label
              htmlFor={invoiceInputId}
              className="text-sm font-medium text-slate-100"
            >
              Hóa đơn
            </label>
            <div className="space-y-2">
              <div
                className={chipListBoxClass}
                onMouseLeave={() => setHoveredInvoiceId(null)}
              >
                {invoiceCodes.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onRemoveInvoiceCode(entry.id)}
                    onMouseEnter={() => setHoveredInvoiceId(entry.id)}
                    onMouseLeave={() => setHoveredInvoiceId(null)}
                    className="relative inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-900/70 px-3 py-1.5 text-white shadow-sm shadow-indigo-900/40 hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                    aria-label={`Xóa hóa đơn ${entry.code}`}
                  >
                    <span className="pointer-events-none font-semibold text-sm">
                      {entry.code}
                    </span>
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors ${
                        hoveredInvoiceId === entry.id
                          ? "bg-white/20 text-red-500"
                          : ""
                      }`}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </span>
                  </button>
                ))}
              </div>
              <div className={chipInputBoxClass}>
                <input
                  id={invoiceInputId}
                  type="text"
                  onMouseEnter={() => setHoveredInvoiceId(null)}
                  onFocus={() => setHoveredInvoiceId(null)}
                  onBlur={() => setHoveredInvoiceId(null)}
                  value={form.invoiceCode}
                  onChange={(e) => onChange("invoiceCode", e.target.value)}
                  onKeyDown={handleInvoiceCodeKeyDown}
                  className="w-full bg-transparent text-white placeholder:text-slate-300 focus:outline-none h-8 relative z-0"
                  placeholder="Nhập mã hóa đơn và nhấn Enter"
                />
              </div>
            </div>
          </div>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-100">Ngày</span>
            <input
              type="date"
              value={form.invoiceDate}
              onChange={(e) => onChange("invoiceDate", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-100">Mã số thuế</span>
            <input
              type="text"
              value={form.taxCode}
              onChange={(e) => onChange("taxCode", e.target.value)}
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
              onChange={(e) => onChange("customerName", e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-100">Fax</span>
            <input
              type="text"
              value={form.fax}
              onChange={(e) => onChange("fax", e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-100">Địa chỉ</span>
            <textarea
              value={form.address}
              onChange={(e) => onChange("address", e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-100">SĐT</span>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => onChange("phone", e.target.value)}
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
  );
};
