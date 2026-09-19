import React, { createContext, useContext, useState, ReactNode } from "react";
import { NotificationModal, NotificationState, NotificationType } from "../components/NotificationModal";

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

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<NotificationState>({
    isOpen: false,
    message: "",
  });

  const showNotification = (
    type: NotificationType,
    message: string,
    title?: string,
    extra?: Partial<NotificationState>
  ) => {
    setModalState({
      isOpen: true,
      type,
      message,
      title,
      ...extra,
    });
  };

  const close = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const info = (message: string, title?: string) => showNotification("info", message, title);
  const success = (message: string, title?: string) => showNotification("success", message, title);
  const warning = (message: string, title?: string) => showNotification("warning", message, title);
  const error = (message: string, title?: string) => showNotification("error", message, title);

  const confirm = (options: ConfirmOptions) => {
    showNotification("confirm", options.message, options.title, {
      confirmText: options.confirmText || "Xác Nhận",
      cancelText: options.cancelText || "Hủy Bỏ",
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
    });
  };

  return (
    <NotificationContext.Provider value={{ info, success, warning, error, confirm, close }}>
      {children}
      <NotificationModal {...modalState} onClose={close} />
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
