import React, { useState, useEffect } from "react";
import { ModalPortal } from "@/components/ui/ModalPortal";

export type FormFieldType = "text" | "number" | "select" | "textarea" | "password";

export interface FormField {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  options?: { value: string | number; label: string }[]; // for select
  placeholder?: string;
  colSpan?: 1 | 2; // Support for grid layout
  formatOnTyping?: (val: string) => string;
}

interface GenericFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: FormField[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  submitText?: string;
  loadingText?: string;
  errorMessage?: string | null;
}

export function GenericFormModal({
  isOpen,
  onClose,
  title,
  fields,
  initialData = {},
  onSubmit,
  submitText = "Lưu",
  loadingText = "Đang xử lý...",
  errorMessage,
}: GenericFormModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const overlayClass = "fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/88 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200";
  const modalClass = "relative w-full max-w-lg rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-950 p-6 sm:p-8 shadow-[0_28px_72px_-28px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]";
  const titleClass = "text-xl sm:text-2xl font-bold tracking-tight text-white mb-6";
  const labelClass = "block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 mb-2";
  const inputBaseClass = "w-full rounded-xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] placeholder:text-slate-600 focus:border-indigo-400/55 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-[border,box-shadow]";

  return (
    <ModalPortal>
      <div className={overlayClass} onClick={onClose} role="presentation">
        <div className={modalClass} onClick={(e) => e.stopPropagation()} role="dialog">
          <h2 className={titleClass}>{title}</h2>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {fields.map((field) => (
              <div 
                key={field.name} 
                className={field.colSpan === 2 || !field.colSpan ? "col-span-1 sm:col-span-2" : "col-span-1"}
              >
                <label className={labelClass} htmlFor={field.name}>
                  {field.label} {field.required && <span className="text-rose-500">*</span>}
                </label>

                {field.type === "textarea" ? (
                  <textarea
                    id={field.name}
                    className={`${inputBaseClass} min-h-[100px] resize-y`}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                    placeholder={field.placeholder}
                  />
                ) : field.type === "select" ? (
                  <select
                    id={field.name}
                    className={inputBaseClass}
                    value={formData[field.name] || ""}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                  >
                    <option value="" disabled>-- Chọn {field.label.toLowerCase()} --</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={field.name}
                    type={field.type}
                    className={inputBaseClass}
                    value={formData[field.name] || ""}
                    onChange={(e) => {
                      let val: string | number = e.target.value;
                      if (field.formatOnTyping) {
                        val = field.formatOnTyping(val as string);
                      } else if (field.type === "number") {
                        val = Number(val);
                      }
                      handleChange(field.name, val);
                    }}
                    required={field.required}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
          </div>

          {errorMessage && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-sm text-rose-200 mt-4">
              {errorMessage}
            </p>
          )}

          <div className="sticky bottom-0 bg-zinc-950 pt-5 pb-1 flex justify-end gap-3 border-t border-white/5 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? loadingText : submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalPortal>
  );
}
