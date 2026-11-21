import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
  Sparkles,
} from "lucide-react";

export type NotificationType = "info" | "success" | "warning" | "error" | "confirm" | "prompt";

export interface NotificationState {
  isOpen: boolean;
  type?: NotificationType;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  placeholder?: string;
  defaultValue?: string;
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
}

interface NotificationModalProps extends NotificationState {
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  type = "info",
  title,
  message,
  confirmText = "Xác Nhận",
  cancelText = "Hủy Bỏ",
  danger = false,
  placeholder,
  defaultValue = "",
  onConfirm,
  onCancel,
  onClose,
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm(inputValue);
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    onClose();
  };

  const getIconAndColors = () => {
    if (danger) {
      return {
        icon: <AlertTriangle className="w-7 h-7 text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]" />,
        badgeColor: "bg-rose-500/10 border-rose-500/30 text-rose-400",
        buttonColor: "bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold hover:brightness-110 shadow-lg shadow-rose-950/40",
        defaultTitle: "Xác Nhận Thao Tác",
      };
    }

    switch (type) {
      case "success":
        return {
          icon: <CheckCircle2 className="w-7 h-7 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />,
          badgeColor: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
          buttonColor: "bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold hover:brightness-110",
          defaultTitle: "Thành Công",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-7 h-7 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />,
          badgeColor: "bg-amber-500/10 border-amber-500/30 text-amber-400",
          buttonColor: "bg-gradient-to-r from-amber-500 to-orange-400 text-slate-950 font-bold hover:brightness-110",
          defaultTitle: "Cảnh Báo",
        };
      case "error":
        return {
          icon: <XCircle className="w-7 h-7 text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.6)]" />,
          badgeColor: "bg-rose-500/10 border-rose-500/30 text-rose-400",
          buttonColor: "bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold hover:brightness-110",
          defaultTitle: "Thất Bại / Lỗi",
        };
      case "prompt":
        return {
          icon: <Sparkles className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />,
          badgeColor: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
          buttonColor: "bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 text-slate-950 font-bold hover:brightness-110",
          defaultTitle: "Nhập Thông Tin",
        };
      case "confirm":
        return {
          icon: <Sparkles className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />,
          badgeColor: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
          buttonColor: "bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 text-slate-950 font-bold hover:brightness-110",
          defaultTitle: "Xác Nhận Thao Tác",
        };
      case "info":
      default:
        return {
          icon: <Info className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />,
          badgeColor: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
          buttonColor: "bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 text-slate-950 font-bold hover:brightness-110",
          defaultTitle: "Thông Báo Hệ Thống",
        };
    }
  };

  const { icon, badgeColor, buttonColor, defaultTitle } = getIconAndColors();
  const displayTitle = title || defaultTitle;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0b0f19] border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Top Glow Bar */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 ${
            danger
              ? "bg-gradient-to-r from-rose-500 via-red-500 to-amber-500"
              : "bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500"
          }`}
        />

        {/* Close Icon Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon + Title */}
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl border ${badgeColor} shrink-0`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold text-white tracking-wide">
              {displayTitle}
            </h3>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-medium whitespace-pre-line">
              {message}
            </p>

            {/* Prompt input field */}
            {type === "prompt" && (
              <div className="mt-3">
                <input
                  type="text"
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={placeholder || "Nhập nội dung..."}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleConfirm();
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 text-xs sm:text-sm font-medium transition-colors"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/80">
          {type === "confirm" || type === "prompt" ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all active:scale-95"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`px-5 py-2 text-xs rounded-xl transition-all shadow-lg active:scale-95 ${buttonColor}`}
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className={`px-6 py-2 text-xs rounded-xl transition-all shadow-lg active:scale-95 ${buttonColor}`}
            >
              Đã Hiểu
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
