const { EventEmitter } = require("events");

describe("telegramOrderNotificationLib httpClient", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();

    if (typeof originalFetch === "undefined") {
      delete global.fetch;
    } else {
      global.fetch = originalFetch;
    }
  });

  it("sends a Telegram payload once through https and does not call fetch", async () => {
    const httpsRequest = jest.fn((options, callback) => {
      const req = new EventEmitter();
      req.setTimeout = jest.fn();
      req.write = jest.fn();
      req.end = jest.fn(() => {
        const res = new EventEmitter();
        res.statusCode = 200;
        callback(res);
        process.nextTick(() => {
          res.emit("data", "ok");
          res.emit("end");
        });
      });
      req.destroy = jest.fn((err) => req.emit("error", err));
      return req;
    });

    jest.doMock("https", () => ({
      request: httpsRequest,
      Agent: jest.fn(() => ({})),
    }));
    jest.doMock("dns", () => ({
      lookup: jest.fn((_hostname, _options, cb) => cb(null, "127.0.0.1", 4)),
    }));

    global.fetch = jest.fn();

    const { postJson } = require("../../services/telegramOrderNotificationLib/httpClient");
    const response = await postJson("https://api.telegram.org/botTOKEN/sendMessage", {
      text: "test",
    });

    expect(response).toBe("ok");
    expect(global.fetch).not.toHaveBeenCalled();
    expect(httpsRequest).toHaveBeenCalledTimes(1);
  });
});
