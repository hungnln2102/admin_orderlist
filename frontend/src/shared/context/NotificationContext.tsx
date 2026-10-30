import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { NotificationModal, NotificationState } from "../components/NotificationModal";
import { ToastNotificationContainer, ToastItem } from "../components/ToastNotification";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface NotificationContextType {
  info: (message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  confirm: (options: ConfirmOptions) => void;
  close: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Giới hạn tối đa 4 thẻ hiển thị cùng lúc
const MAX_TOASTS = 4;

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Danh sách Toasts góc phải (tối đa 4 thẻ)
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // State riêng cho Modal Xác Nhận (confirm) ở giữa màn hình
  const [confirmModalState, setConfirmModalState] = useState<NotificationState>({
    isOpen: false,
    message: "",
  });

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: "info" | "success" | "warning" | "error", message: string, title?: string) => {
    const newToast: ToastItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      message,
      title,
    };

    setToasts((prev) => {
      // Quy tắc Master: Tối đa 4 thẻ, thẻ thứ 5 hiện thì lập tức mất thẻ 1
      const trimmed = prev.length >= MAX_TOASTS ? prev.slice(prev.length - (MAX_TOASTS - 1)) : prev;
      return [...trimmed, newToast];
    });
  }, []);

  const close = useCallback(() => {
    setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const info = useCallback((message: string, title?: string) => addToast("info", message, title), [addToast]);
  const success = useCallback((message: string, title?: string) => addToast("success", message, title), [addToast]);
  const warning = useCallback((message: string, title?: string) => addToast("warning", message, title), [addToast]);
  const error = useCallback((message: string, title?: string) => addToast("error", message, title), [addToast]);

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmModalState({
      isOpen: true,
      type: "confirm",
      message: options.message,
      title: options.title,
      confirmText: options.confirmText || "Xác Nhận",
      cancelText: options.cancelText || "Hủy Bỏ",
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
    });
  }, []);

  return (
    <NotificationContext.Provider value={{ info, success, warning, error, confirm, close }}>
      {children}

      {/* 1. Hệ thống Toast góc phải: 5s mờ dần, tối đa 4 thẻ, thẻ thứ 5 đẩy thẻ 1 */}
      <ToastNotificationContainer toasts={toasts} onClose={removeToast} />

      {/* 2. Giữ nguyên modal confirm ở giữa màn hình cho thao tác xác nhận an toàn */}
      <NotificationModal {...confirmModalState} onClose={close} />
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification phải được dùng bên trong NotificationProvider");
  }
  return context;
};
