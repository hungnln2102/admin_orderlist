/* eslint-disable @typescript-eslint/no-explicit-any */
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
  const [activeSelect, setActiveSelect] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
      setLocalError(null);
      setActiveSelect(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".custom-dropdown-container")) {
        return;
      }
      setActiveSelect(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validate required fields
    for (const field of fields) {
      if (field.required) {
        const val = formData[field.name];
        if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
          setLocalError(`Vui lòng chọn hoặc điền thông tin: ${field.label}`);
          return;
        }
      }
    }

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
                  <div className="relative custom-dropdown-container">
                    <button
                      type="button"
                      id={field.name}
                      onClick={() => {
                        setActiveSelect(activeSelect === field.name ? null : field.name);
                      }}
                      className={`${inputBaseClass} flex items-center justify-between text-left cursor-pointer`}
                    >
                      <span className={formData[field.name] !== undefined && formData[field.name] !== "" ? "text-slate-100" : "text-slate-600"}>
                        {field.options?.find(opt => String(opt.value) === String(formData[field.name] || ""))?.label || `-- Chọn ${field.label.toLowerCase()} --`}
                      </span>
                      <svg
                        className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${activeSelect === field.name ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {activeSelect === field.name && (
                      <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-md focus:outline-none custom-scrollbar">
                        <div
                          onClick={() => {
                            handleChange(field.name, "");
                            setActiveSelect(null);
                          }}
                          className="w-full rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-white/5 hover:text-slate-300 cursor-pointer transition-colors"
                        >
                          -- Chọn {field.label.toLowerCase()} --
                        </div>
                        {field.options?.map((opt) => (
                          <div
                            key={opt.value}
                            onClick={() => {
                              handleChange(field.name, opt.value);
                              setActiveSelect(null);
                            }}
                            className={`w-full rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                              String(opt.value) === String(formData[field.name] || "")
                                ? "bg-indigo-600/20 text-indigo-300 font-semibold"
                                : "text-slate-200 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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

          {(localError || errorMessage) && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-sm text-rose-200 mt-4">
              {localError || errorMessage}
            </p>
          )}

          <div className="sticky bottom-0 bg-slate-950 pt-5 pb-1 flex justify-end gap-3 border-t border-white/5 mt-6">
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
