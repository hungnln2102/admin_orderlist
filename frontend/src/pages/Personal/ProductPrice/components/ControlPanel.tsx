import React from "react";
import { QuoteLine } from "../helpers";

type ProductOption = {
  value: string;
  label: string;
};

type ControlPanelProps = {
  recipient: string;
  onRecipientChange: (value: string) => void;
  quoteDate: string;
  onQuoteDateChange: (value: string) => void;
  quoteCode: string;
  contact: string;
  onContactChange: (value: string) => void;
  productSearch: string;
  onProductSearchChange: (value: string) => void;
  filteredOptions: ProductOption[];
  selectedProductKeys: string[];
  onToggleProduct: (value: string) => void;
  onAddSelectedProduct: () => void;
  onResetSearch: () => void;
  lines: QuoteLine[];
  onRemoveLine: (id: string) => void;
  onDownload: () => void;
};

const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white placeholder:text-slate-300 focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/60";

export const ControlPanel: React.FC<ControlPanelProps> = ({
  recipient,
  onRecipientChange,
  quoteDate,
  onQuoteDateChange,
  quoteCode,
  contact,
  onContactChange,
  productSearch,
  onProductSearchChange,
  filteredOptions,
  selectedProductKeys,
  onToggleProduct,
  onAddSelectedProduct,
  onResetSearch,
  lines,
  onRemoveLine,
  onDownload,
}) => {
  return (
    <div className="no-print rounded-2xl bg-white/5 border border-white/10 shadow-lg shadow-indigo-900/30">
      <div className="border-b border-white/10 px-6 py-4">
        <h2 className="text-lg font-semibold text-white">Thong tin bao gia</h2>
      </div>

      <div className="px-6 py-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="space-y-1">
            <span className="text-sm font-medium text-white">Kinh gui</span>
            <input
              type="text"
              value={recipient}
              onChange={(e) => onRecipientChange(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-white">Ngay</span>
            <input
              type="date"
              value={quoteDate}
              onChange={(e) => onQuoteDateChange(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-white">Ma bao gia</span>
            <input value={quoteCode} readOnly className={`${inputClass} opacity-80`} />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-sm font-medium text-white">Lien he</span>
            <input
              type="text"
              value={contact}
              onChange={(e) => onContactChange(e.target.value)}
              className={inputClass}
              placeholder="Email / SDT"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium text-white">Ghi chu (tuy chon)</span>
            <input
              type="text"
              className={inputClass}
              placeholder="Thong tin them cho bao gia"
            />
          </label>
        </div>

        <div className="border border-white/15 rounded-lg p-3 space-y-2">
          <label className="text-sm font-semibold text-white block">Ma san pham</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={productSearch}
              onChange={(e) => onProductSearchChange(e.target.value)}
              className={`${inputClass} text-sm`}
              placeholder="Tim san pham..."
            />
            <button
              type="button"
              onClick={onResetSearch}
              className="px-3 py-2 text-sm rounded-lg border border-white/20 bg-white/5 text-white hover:border-white/40 transition-colors"
            >
              Xoa Tim Kiem
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto rounded-lg border border-white/20 bg-white/5 p-2">
            {filteredOptions.map((opt) => {
              const isActive = selectedProductKeys.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onToggleProduct(opt.value)}
                  className={`text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "border-blue-400/80 bg-blue-500/20 text-white"
                      : "border-white/10 bg-white/5 hover:border-white/30 text-white/90"
                  }`}
                  title={opt.label}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={onAddSelectedProduct}
              className="rounded bg-blue-600/80 hover:bg-blue-600 text-white px-3 py-2 text-sm disabled:opacity-60"
              disabled={!selectedProductKeys.length}
            >
              Them
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="rounded bg-indigo-600/80 hover:bg-indigo-600 text-white px-3 py-2 text-sm"
            >
              Download PDF
            </button>
          </div>
          {lines.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {lines.map((line) => (
                <span
                  key={line.id}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-white text-sm"
                >
                  {line.product}
                  <button
                    type="button"
                    onClick={() => onRemoveLine(line.id)}
                    className="text-red-300 hover:text-red-200 font-semibold"
                    title="Xoa"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
