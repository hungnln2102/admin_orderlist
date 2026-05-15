describe("sendOrderCreatedNotification chat routing", () => {
  function buildHarness({
    isImport,
    defaultChatId = "-100-default",
  }) {
    jest.resetModules();

    const sendTelegramMessage = jest.fn().mockResolvedValue(undefined);
    const sendTelegramPhoto = jest.fn().mockResolvedValue(undefined);
    const sendWithRetry = jest
      .fn()
      .mockImplementation(async ({ buildPayload, sendFn }) => {
        const payload = buildPayload({
          includeTopic: true,
          includeButtons: true,
          includePhoto: true,
        });
        await sendFn(payload);
        return { sent: true };
      });

    jest.doMock("../../../../src/utils/orderHelpers", () => ({
      isMavnImportOrder: jest.fn(() => isImport),
    }));
    jest.doMock(
      "../../../../src/services/telegramOrderNotificationLib/constants",
      () => ({
        SEND_ORDER_NOTIFICATION: true,
        TELEGRAM_BOT_TOKEN: "token",
        TELEGRAM_CHAT_ID: defaultChatId,
        TELEGRAM_ORDER_TOPIC_ID: NaN,
        TELEGRAM_IMPORT_ORDER_TOPIC_ID: NaN,
        SEND_ORDER_TO_TOPIC: true,
        SEND_ORDER_COPY_BUTTONS: false,
        QR_NOTE_PREFIX: "Thanh toan",
        QR_ACCOUNT_NUMBER: "",
        QR_BANK_CODE: "VPB",
        QR_ACCOUNT_NAME: "",
      })
    );
    jest.doMock(
      "../../../../src/services/telegramOrderNotificationLib/messageBuilders",
      () => ({
        buildOrderCreatedMessage: jest.fn(() => "<b>order</b>"),
        buildImportOrderCreatedMessage: jest.fn(() => "<b>import</b>"),
        buildCopyKeyboard: jest.fn(() => null),
      })
    );
    jest.doMock("../../../../src/services/telegramOrderNotificationLib/qr", () => ({
      buildSepayQrUrl: jest.fn(() => null),
      fetchQrImageBytes: jest.fn().mockResolvedValue(null),
    }));
    jest.doMock(
      "../../../../src/services/telegramOrderNotificationLib/telegramApi",
      () => ({
        sendTelegramMessage,
        sendTelegramPhoto,
      })
    );
    jest.doMock(
      "../../../../src/services/telegramOrderNotificationLib/sendWithRetry",
      () => ({
        sendWithRetry,
      })
    );
    jest.doMock("../../../../src/utils/logger", () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }));

    const {
      sendOrderCreatedNotification,
    } = require("../../../../src/services/telegramOrderNotificationLib/sendOrderCreated");

    return {
      sendOrderCreatedNotification,
      sendTelegramMessage,
      sendTelegramPhoto,
      sendWithRetry,
    };
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses TELEGRAM_CHAT_ID for import orders", async () => {
    const { sendOrderCreatedNotification, sendTelegramMessage, sendTelegramPhoto } =
      buildHarness({
        isImport: true,
        defaultChatId: "-100-default",
      });

    await sendOrderCreatedNotification({ id_order: "MAVN0001", price: 120000 });

    expect(sendTelegramPhoto).not.toHaveBeenCalled();
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({ chat_id: "-100-default" })
    );
  });
});
