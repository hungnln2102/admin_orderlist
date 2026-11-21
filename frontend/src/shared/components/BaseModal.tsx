import React, { useEffect } from "react";
import { X } from "lucide-react";

export type BaseModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  size?: BaseModalSize;
  borderClassName?: string;
  bodyClassName?: string;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  hideCloseButton?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const SIZE_CLASSES: Record<BaseModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl xl:max-w-6xl",
};

/**
 * BaseModal — Khung Modal chuẩn Design System SSOT của dự án.
 * Tích hợp sẵn giới hạn chiều cao `max-h-[92vh]`, phần thân tự cuộn `overflow-y-auto`,
 * cố định Header/Footer trên Mobile & Tablet và hỗ trợ phím Escape.
 */
export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  size = "lg",
  borderClassName = "border-slate-800",
  bodyClassName = "p-5 sm:p-6",
  closeOnBackdrop = false,
  closeOnEsc = true,
  hideCloseButton = false,
  footer,
  children,
}) => {
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={closeOnBackdrop ? onClose : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-slate-900 border ${borderClassName} rounded-2xl sm:rounded-3xl w-full ${SIZE_CLASSES[size]} max-h-[92vh] flex flex-col shadow-2xl overflow-hidden`}
      >
        {(title || !hideCloseButton) && (
          <div className="flex items-start justify-between gap-3 p-4 sm:p-6 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {icon && <div className="shrink-0">{icon}</div>}
              <div className="min-w-0">
                {title && (
                  <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className={`flex-1 overflow-y-auto custom-scrollbar ${bodyClassName}`}>
          {children}
        </div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 px-4 sm:px-6 py-4 border-t border-slate-800 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
