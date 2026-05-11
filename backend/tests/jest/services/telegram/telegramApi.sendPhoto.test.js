/**
 * Tests cho telegramApi.sendTelegramPhoto — chọn đúng transport:
 *   - photo URL string → postJson
 *   - photo Buffer / { buffer } → postMultipart
 */

jest.mock(
  "../../../../src/services/telegramOrderNotificationLib/httpClient",
  () => ({
    postJson: jest.fn(async () => "{\"ok\":true}"),
    postMultipart: jest.fn(async () => "{\"ok\":true}"),
  })
);

const {
  postJson,
  postMultipart,
} = require("../../../../src/services/telegramOrderNotificationLib/httpClient");
const {
  sendTelegramPhoto,
} = require("../../../../src/services/telegramOrderNotificationLib/telegramApi");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("sendTelegramPhoto transport routing", () => {
  test("photo là URL string → postJson với payload nguyên", async () => {
    await sendTelegramPhoto({
      chat_id: "1",
      photo: "https://img.vietqr.io/x.png",
      caption: "abc",
    });
    expect(postJson).toHaveBeenCalledTimes(1);
    expect(postMultipart).not.toHaveBeenCalled();
    const [, payload] = postJson.mock.calls[0];
    expect(payload).toEqual({
      chat_id: "1",
      photo: "https://img.vietqr.io/x.png",
      caption: "abc",
    });
  });

  test("photo là Buffer → postMultipart, payload đã bỏ field photo trong fields", async () => {
    const bytes = Buffer.from("PNG");
    await sendTelegramPhoto({
      chat_id: "2",
      photo: bytes,
      caption: "với ảnh",
      parse_mode: "HTML",
    });
    expect(postMultipart).toHaveBeenCalledTimes(1);
    expect(postJson).not.toHaveBeenCalled();
    const [, body, headers] = postMultipart.mock.calls[0];
    expect(Buffer.isBuffer(body)).toBe(true);
    expect(headers["Content-Type"]).toMatch(/^multipart\/form-data; boundary=/);
    const text = body.toString("utf8");
    expect(text).toContain('name="chat_id"\r\n\r\n2');
    expect(text).toContain('name="caption"\r\n\r\nvới ảnh');
    expect(text).toContain('name="parse_mode"\r\n\r\nHTML');
    // Field file phải có
    expect(text).toContain('name="photo"; filename="qr.png"');
    expect(text).toContain("Content-Type: image/png");
    // Bytes "PNG" có trong body
    expect(text).toContain("PNG");
  });

  test("photo là { buffer, filename, contentType } → multipart với metadata custom", async () => {
    await sendTelegramPhoto({
      chat_id: "3",
      photo: {
        buffer: Buffer.from("JPGDATA"),
        filename: "custom.jpg",
        contentType: "image/jpeg",
      },
    });
    expect(postMultipart).toHaveBeenCalledTimes(1);
    const [, body] = postMultipart.mock.calls[0];
    const text = body.toString("utf8");
    expect(text).toContain('name="photo"; filename="custom.jpg"');
    expect(text).toContain("Content-Type: image/jpeg");
    expect(text).toContain("JPGDATA");
  });

  test("reply_markup object → JSON string trong multipart", async () => {
    const keyboard = { inline_keyboard: [[{ text: "Copy", copy_text: { text: "x" } }]] };
    await sendTelegramPhoto({
      chat_id: "4",
      photo: Buffer.from("P"),
      reply_markup: keyboard,
    });
    const [, body] = postMultipart.mock.calls[0];
    const text = body.toString("utf8");
    expect(text).toContain('name="reply_markup"\r\n\r\n' + JSON.stringify(keyboard));
  });
});
