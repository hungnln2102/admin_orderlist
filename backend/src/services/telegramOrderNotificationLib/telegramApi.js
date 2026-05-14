/**
 * Gọi Telegram Bot API: sendMessage, sendPhoto.
 *
 * sendPhoto hỗ trợ 2 dạng `payload.photo`:
 *   - string (URL): gửi JSON như cũ, Telegram tự GET URL → có thể chậm/lỗi
 *     khi provider QR (vietqr.io) chậm.
 *   - Buffer hoặc { buffer, filename, contentType }: gửi multipart/form-data,
 *     Telegram nhận trực tiếp bytes → không phụ thuộc Telegram fetch URL.
 */

const { TELEGRAM_BOT_TOKEN } = require("./constants");
const { postJson, postMultipart } = require("./httpClient");
const { buildMultipartBody } = require("./multipartBuilder");

function sendTelegramMessage(payload) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  return postJson(url, payload);
}

/**
 * @param {Object} payload Telegram sendPhoto payload.
 *   - `photo`: string (URL) | Buffer | { buffer, filename?, contentType? }
 *   - Các field khác (chat_id, caption, parse_mode, reply_markup, message_thread_id…)
 *     được forward; reply_markup object sẽ tự JSON.stringify trong multipart.
 */
function sendTelegramPhoto(payload) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
  const photo = payload?.photo;

  const photoIsBuffer = Buffer.isBuffer(photo);
  const photoIsBufferObj =
    photo != null &&
    typeof photo === "object" &&
    !Buffer.isBuffer(photo) &&
    Buffer.isBuffer(photo.buffer);

  if (!photoIsBuffer && !photoIsBufferObj) {
    // Đường cũ: photo là URL string → Telegram tự fetch.
    return postJson(url, payload);
  }

  const { photo: _omit, ...fields } = payload;
  const buffer = photoIsBuffer ? photo : photo.buffer;
  const filename = photoIsBuffer ? "qr.png" : photo.filename || "qr.png";
  const contentType = photoIsBuffer
    ? "image/png"
    : photo.contentType || "image/png";

  const { buffer: body, headers } = buildMultipartBody(fields, {
    field: "photo",
    filename,
    contentType,
    data: buffer,
  });
  return postMultipart(url, body, headers);
}

module.exports = {
  sendTelegramMessage,
  sendTelegramPhoto,
};
