import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { NotificationType } from "./NotificationModal";

export interface ToastItem {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
}

interface ToastNotificationProps {
  toasts: ToastItem[];
  onClose: (id: string) => void;
}

const ToastCard: React.FC<{ toast: ToastItem; onClose: (id: string) => void }> = ({
  toast,
  onClose,
}) => {
  useEffect(() => {
    // Tự động đóng sau đúng 5 giây (5000ms)
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const getConfig = () => {
    switch (toast.type) {
      case "success":
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />,
          borderColor: "border-emerald-500/40",
          glowColor: "from-emerald-500/20 via-teal-500/10 to-transparent",
          topBar: "from-emerald-400 to-teal-400",
          defaultTitle: "Thành Công",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />,
          borderColor: "border-amber-500/40",
          glowColor: "from-amber-500/20 via-orange-500/10 to-transparent",
          topBar: "from-amber-400 to-orange-400",
          defaultTitle: "Cảnh Báo",
        };
      case "error":
        return {
          icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0 drop-shadow-[0_0_8px_rgba(251,113,133,0.5)]" />,
          borderColor: "border-rose-500/40",
          glowColor: "from-rose-500/20 via-pink-500/10 to-transparent",
          topBar: "from-rose-400 to-pink-500",
          defaultTitle: "Thất Bại / Lỗi",
        };
      case "info":
      default:
        return {
          icon: <Info className="w-5 h-5 text-cyan-400 shrink-0 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />,
          borderColor: "border-cyan-500/40",
          glowColor: "from-cyan-500/20 via-sky-500/10 to-transparent",
          topBar: "from-cyan-400 to-sky-400",
          defaultTitle: "Thông Báo",
        };
    }
  };

  const { icon, borderColor, glowColor, topBar, defaultTitle } = getConfig();
  const title = toast.title || defaultTitle;

  return (
    <div
      role="alert"
      className={`pointer-events-auto relative w-full bg-[#0b0f19]/95 border ${borderColor} rounded-2xl shadow-2xl shadow-black/60 p-4 backdrop-blur-xl overflow-hidden transition-all hover:opacity-100 hover:[animation-play-state:paused]`}
      style={{
        animation: "toastLifetime 5000ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
      }}
    >
      {/* Top Accent Glowing Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${topBar}`} />

      {/* Subtle background glow */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${glowColor} opacity-30 pointer-events-none`}
      />

      <div className="relative z-10 flex items-start gap-3">
        <div className="pt-0.5">{icon}</div>

        <div className="flex-1 min-w-0 pr-6">
          <h4 className="text-xs font-bold text-slate-100 tracking-wide uppercase">
            {title}
          </h4>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words font-medium">
            {toast.message}
          </p>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={() => onClose(toast.id)}
          className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          title="Đóng ngay"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const ToastNotificationContainer: React.FC<ToastNotificationProps> = ({
  toasts,
  onClose,
}) => {
  if (toasts.length === 0) return null;

  return ReactDOM.createPortal(
    <>
      <style>{`
        @keyframes toastLifetime {
          0% {
            opacity: 0;
            transform: translateX(30px) scale(0.95);
          }
          6% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          15% {
            opacity: 0.95;
          }
          50% {
            opacity: 0.7;
          }
          85% {
            opacity: 0.3;
          }
          100% {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
        }
      `}</style>
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none max-w-sm w-[calc(100vw-2.5rem)] sm:w-96"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </div>
    </>,
    document.body
  );
};

