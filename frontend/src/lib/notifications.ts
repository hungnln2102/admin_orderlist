export type AppNotificationType = "success" | "error" | "info";

export type AppNotificationPayload = {
  title?: string;
  message: string;
  type?: AppNotificationType;
};

export const APP_NOTIFICATION_EVENT = "app-notification";

export function showAppNotification(
  payloadOrMessage: AppNotificationPayload | string,
  type?: AppNotificationType,
  title?: string
) {
  if (typeof window === "undefined") return;

  const detail: AppNotificationPayload =
    typeof payloadOrMessage === "string"
      ? { message: payloadOrMessage, type, title }
      : payloadOrMessage;

  window.dispatchEvent(
    new CustomEvent<AppNotificationPayload>(APP_NOTIFICATION_EVENT, {
      detail,
    })
  );
}

