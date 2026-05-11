/**
 * Tests cho multipartBuilder — đảm bảo format đúng spec multipart/form-data
 * để Telegram parse được.
 */

const {
  buildMultipartBody,
} = require("../../../../src/services/telegramOrderNotificationLib/multipartBuilder");

const findBoundary = (headers) => {
  const ct = headers["Content-Type"];
  const m = ct.match(/boundary=(.+)$/);
  return m ? m[1] : null;
};

describe("multipartBuilder.buildMultipartBody", () => {
  test("Header Content-Type chứa boundary; Content-Length khớp buffer.length", () => {
    const { buffer, headers, boundary } = buildMultipartBody(
      { chat_id: "123" },
      { field: "photo", filename: "qr.png", contentType: "image/png", data: Buffer.from("X") }
    );
    expect(boundary).toBeTruthy();
    expect(headers["Content-Type"]).toContain("multipart/form-data");
    expect(headers["Content-Type"]).toContain(`boundary=${boundary}`);
    expect(Number(headers["Content-Length"])).toBe(buffer.length);
  });

  test("Field text bình thường (string) → có dòng Content-Disposition đúng", () => {
    const { buffer, headers } = buildMultipartBody(
      { chat_id: "456", caption: "Hello" },
      { field: "photo", filename: "x.png", contentType: "image/png", data: Buffer.from("Y") }
    );
    const text = buffer.toString("utf8");
    const boundary = findBoundary(headers);
    expect(text).toContain(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n456\r\n`);
    expect(text).toContain(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\nHello\r\n`);
  });

  test("Field object (reply_markup) tự JSON.stringify", () => {
    const replyMarkup = { inline_keyboard: [[{ text: "OK", copy_text: "ABC" }]] };
    const { buffer, headers } = buildMultipartBody(
      { chat_id: "789", reply_markup: replyMarkup },
      { field: "photo", filename: "x.png", contentType: "image/png", data: Buffer.from("Z") }
    );
    const text = buffer.toString("utf8");
    const boundary = findBoundary(headers);
    expect(text).toContain(`--${boundary}\r\nContent-Disposition: form-data; name="reply_markup"\r\n\r\n${JSON.stringify(replyMarkup)}\r\n`);
  });

  test("Bỏ field null/undefined (không serialize)", () => {
    const { buffer } = buildMultipartBody(
      { chat_id: "1", caption: null, missing: undefined, parse_mode: "HTML" },
      { field: "photo", filename: "x.png", contentType: "image/png", data: Buffer.from("A") }
    );
    const text = buffer.toString("utf8");
    expect(text).not.toContain(`name="caption"`);
    expect(text).not.toContain(`name="missing"`);
    expect(text).toContain(`name="parse_mode"\r\n\r\nHTML`);
  });

  test("Photo bytes giữ nguyên nhị phân (không bị decode utf8)", () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const { buffer, headers } = buildMultipartBody(
      { chat_id: "1" },
      { field: "photo", filename: "real.png", contentType: "image/png", data: bytes }
    );
    const boundary = findBoundary(headers);
    const fileHeaderText = `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="real.png"\r\nContent-Type: image/png\r\n\r\n`;
    const headerIdx = buffer.indexOf(Buffer.from(fileHeaderText, "utf8"));
    expect(headerIdx).toBeGreaterThan(-1);
    const dataStart = headerIdx + Buffer.byteLength(fileHeaderText);
    const extracted = buffer.slice(dataStart, dataStart + bytes.length);
    expect(Buffer.compare(extracted, bytes)).toBe(0);
  });

  test("Có đóng boundary cuối '--boundary--'", () => {
    const { buffer, headers } = buildMultipartBody(
      { chat_id: "1" },
      { field: "photo", filename: "x.png", contentType: "image/png", data: Buffer.from("B") }
    );
    const boundary = findBoundary(headers);
    expect(buffer.toString("utf8").trimEnd().endsWith(`--${boundary}--`)).toBe(true);
  });

  test("Throw khi file.data không phải Buffer", () => {
    expect(() =>
      buildMultipartBody(
        { chat_id: "1" },
        { field: "photo", filename: "x", contentType: "image/png", data: "not-a-buffer" }
      )
    ).toThrow(/Buffer/);
  });
});
