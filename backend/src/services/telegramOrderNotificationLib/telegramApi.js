/**
 * Gọi Telegram Bot API: sendMessage, sendPhoto.
 */

const { TELEGRAM_BOT_TOKEN } = require("./constants");
const { postJson } = require("./httpClient");

function sendTelegramMessage(payload) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  return postJson(url, payload);
}

function sendTelegramPhoto(payload) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
  return postJson(url, payload);
}

module.exports = {
  sendTelegramMessage,
  sendTelegramPhoto,
};
