export type AppNotificationType = "success" | "error" | "info";

export type AppNotificationPayload = {
  title?: string;
  message: string;
  type?: AppNotificationType;
};

export const APP_NOTIFICATION_EVENT = "app-notification";

export const showAppNotification = (payload: AppNotificationPayload) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<AppNotificationPayload>(APP_NOTIFICATION_EVENT, {
      detail: payload,
    })
  );
};

