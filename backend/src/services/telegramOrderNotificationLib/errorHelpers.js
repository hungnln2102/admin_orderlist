/**
 * Nhận diện lỗi Telegram (thread/topic, copy button) để retry không gửi topic/buttons.
 */

function isThreadError(err) {
  const bodyText = String(err?.body || err?.message || "");
  const lowered = bodyText.toLowerCase();
  return (
    err?.status === 400 &&
    (lowered.includes("message_thread_id") ||
      lowered.includes("message thread not found") ||
      (lowered.includes("thread") && lowered.includes("not found")) ||
      (lowered.includes("topic") && lowered.includes("not found")))
  );
}

function isCopyButtonError(err) {
  const bodyText = String(err?.body || err?.message || "");
  const lowered = bodyText.toLowerCase();
  return (
    err?.status === 400 &&
    (lowered.includes("copy_text") ||
      lowered.includes("inline keyboard button") ||
      lowered.includes("reply_markup") ||
      lowered.includes("button_type_invalid") ||
      lowered.includes("can't parse inline keyboard button"))
  );
}

module.exports = {
  isThreadError,
  isCopyButtonError,
};
