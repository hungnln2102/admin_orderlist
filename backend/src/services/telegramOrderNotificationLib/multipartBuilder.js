/**
 * Xây multipart/form-data body cho Telegram Bot API sendPhoto khi `photo` là Buffer.
 *
 * Không phụ thuộc package ngoài. Telegram chấp nhận `photo` dưới dạng file
 * binary field nếu Content-Type là `multipart/form-data; boundary=...`.
 */

const crypto = require("crypto");

const CRLF = "\r\n";

/** Field non-binary (string/number/bool) → JSON khi cần (object như reply_markup). */
function serializeFieldValue(value) {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  // object/array → JSON (Telegram chấp nhận reply_markup là JSON string).
  return JSON.stringify(value);
}

/**
 * @param {Record<string, any>} fields - Field thường (chat_id, caption, parse_mode...).
 * @param {{ field: string, filename: string, contentType: string, data: Buffer }} file
 * @param {string} [boundary]
 * @returns {{ buffer: Buffer, headers: Record<string, string>, boundary: string }}
 */
function buildMultipartBody(fields, file, boundary) {
  if (!file || !Buffer.isBuffer(file.data)) {
    throw new TypeError("buildMultipartBody: file.data must be a Buffer");
  }
  const usedBoundary =
    boundary ||
    `----mavryk-tg-${crypto.randomBytes(8).toString("hex")}-${Date.now()}`;

  const parts = [];
  for (const [name, raw] of Object.entries(fields || {})) {
    const value = serializeFieldValue(raw);
    if (value == null) continue;
    parts.push(
      Buffer.from(
        `--${usedBoundary}${CRLF}Content-Disposition: form-data; name="${name}"${CRLF}${CRLF}${value}${CRLF}`,
        "utf8"
      )
    );
  }

  const fileFieldName = file.field || "photo";
  const filename = file.filename || "qr.png";
  const contentType = file.contentType || "image/png";
  parts.push(
    Buffer.from(
      `--${usedBoundary}${CRLF}Content-Disposition: form-data; name="${fileFieldName}"; filename="${filename}"${CRLF}Content-Type: ${contentType}${CRLF}${CRLF}`,
      "utf8"
    )
  );
  parts.push(file.data);
  parts.push(Buffer.from(`${CRLF}--${usedBoundary}--${CRLF}`, "utf8"));

  const buffer = Buffer.concat(parts);
  return {
    buffer,
    headers: {
      "Content-Type": `multipart/form-data; boundary=${usedBoundary}`,
      "Content-Length": String(buffer.length),
    },
    boundary: usedBoundary,
  };
}

module.exports = {
  buildMultipartBody,
};
