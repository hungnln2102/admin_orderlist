/**
 * Nhận diện lỗi Telegram (thread/topic, copy button, ảnh URL) để retry bỏ topic / nút / ảnh.
 */

function telegramErrorText(err) {
  const raw = String(err?.body || err?.message || "").trim();
  if (!raw) return "";
  try {
    const j = JSON.parse(raw);
    if (j?.description != null) return String(j.description);
  } catch {
    /* body không phải JSON */
  }
  return raw;
}

function isThreadError(err) {
  if (err?.status !== 400) return false;
  const lowered = telegramErrorText(err).toLowerCase();
  return (
    lowered.includes("message_thread_id") ||
    lowered.includes("message thread not found") ||
    (lowered.includes("thread") && lowered.includes("not found")) ||
    (lowered.includes("topic") && lowered.includes("not found")) ||
    lowered.includes("not a forum") ||
    lowered.includes("forum is not enabled") ||
    lowered.includes("the message must be sent in a forum topic")
  );
}

/** Telegram không lấy được ảnh từ URL (VietQR…) hoặc caption quá dài cho sendPhoto. */
function isPhotoSourceError(err) {
  if (err?.status !== 400) return false;
  const lowered = telegramErrorText(err).toLowerCase();
  return (
    lowered.includes("failed to get http url") ||
    lowered.includes("failed to get url") ||
    lowered.includes("wrong remote file identifier") ||
    lowered.includes("wrong type of the web page content") ||
    lowered.includes("can't use file of type") ||
    lowered.includes("failed to connect") ||
    lowered.includes("message caption is too long") ||
    lowered.includes("caption is too long")
  );
}

function isCopyButtonError(err) {
  if (err?.status !== 400) return false;
  const lowered = telegramErrorText(err).toLowerCase();
  return (
    lowered.includes("copy_text") ||
    lowered.includes("inline keyboard button") ||
    lowered.includes("reply_markup") ||
    lowered.includes("button_type_invalid") ||
    lowered.includes("can't parse inline keyboard button")
  );
}

module.exports = {
  telegramErrorText,
  isThreadError,
  isCopyButtonError,
  isPhotoSourceError,
};
