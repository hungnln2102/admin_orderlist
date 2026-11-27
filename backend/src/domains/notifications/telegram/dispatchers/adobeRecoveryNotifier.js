const { dispatch } = require("@/domains/notifications/hub/notificationHubService");
const { ADOBE_MISSING_SUBSCRIPTION } = require("@/domains/notifications/telegram/core/constants");
const { escapeHtml } = require("@/domains/notifications/telegram/builders/formatters");

function enqueueAdobeMissingSubscription({ trx, orderCode, slotId, account, replaced, reason }) {
  const renderedTitle = reason === "expired"
    ? "Gói đăng ký Adobe đã hết hạn"
    : "Tài khoản Adobe không còn gói đăng ký";
  const outcome = replaced ? "Đã cấp tài khoản thay thế." : "Kho đã hết tài khoản thay thế.";

  return dispatch({
    trx,
    eventType: ADOBE_MISSING_SUBSCRIPTION,
    idempotencyKey: `${ADOBE_MISSING_SUBSCRIPTION}:${orderCode}:${slotId}`,
    renderedTitle,
    renderedContent: [
      `<b>${renderedTitle}</b>`,
      `Mã đơn: <code>${escapeHtml(orderCode)}</code>`,
      `Email Adobe: <code>${escapeHtml(account)}</code>`,
      outcome,
    ].join("\n"),
  });
}

module.exports = { enqueueAdobeMissingSubscription };
