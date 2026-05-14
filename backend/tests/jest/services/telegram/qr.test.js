/**
 * Tests cho qr.js: buildQrProviderUrls + fetchQrImageBytes (timeout,
 * multi-provider fallback, cache, content-type guard).
 *
 * Inject `deps.httpsGetBuffer` để mock — không gọi mạng thật.
 */

const path = require("path");
const MODULE_PATH = path.resolve(
  __dirname,
  "../../../../src/services/telegramOrderNotificationLib/qr.js"
);

const requireFreshQr = () => {
  jest.resetModules();
  return require(MODULE_PATH);
};

describe("qr (URL builders + fetcher)", () => {
  describe("buildQrProviderUrls", () => {
    test("Có bank + acc → trả 2 provider URLs (vietqr.io, sepay.vn)", () => {
      const { buildQrProviderUrls } = requireFreshQr();
      const urls = buildQrProviderUrls({
        bankCode: "VPB",
        accountNumber: "12345",
        amount: 149000,
        addInfo: "Thanh toan MAVL001",
        accountName: "MAVRYK STORE",
      });
      expect(urls).toHaveLength(2);
      expect(urls[0]).toMatch(/^https:\/\/img\.vietqr\.io\/image\/VPB-12345-compact\.png\?/);
      expect(urls[0]).toContain("amount=149000");
      expect(urls[0]).toContain("addInfo=Thanh+toan+MAVL001");
      expect(urls[0]).toContain("accountName=MAVRYK+STORE");
      expect(urls[1]).toMatch(/^https:\/\/qr\.sepay\.vn\/img\?/);
      expect(urls[1]).toContain("acc=12345");
      expect(urls[1]).toContain("bank=VPB");
      expect(urls[1]).toContain("amount=149000");
    });

    test("Thiếu cả bank lẫn acc (args + env mặc định rỗng) → trả mảng rỗng", () => {
      // QR_BANK_CODE mặc định = "VPB" trong constants nhưng QR_ACCOUNT_NUMBER
      // mặc định rỗng → truyền args không có acc và không set env → empty.
      const prevAcc = process.env.ORDER_QR_ACCOUNT_NUMBER;
      const prevBank = process.env.ORDER_QR_BANK_CODE;
      delete process.env.ORDER_QR_ACCOUNT_NUMBER;
      process.env.ORDER_QR_BANK_CODE = "";
      try {
        const { buildQrProviderUrls } = requireFreshQr();
        expect(buildQrProviderUrls({})).toEqual([]);
        expect(buildQrProviderUrls({ accountNumber: "" })).toEqual([]);
        expect(buildQrProviderUrls({ bankCode: "VPB" })).toEqual([]);
      } finally {
        if (prevAcc === undefined) delete process.env.ORDER_QR_ACCOUNT_NUMBER;
        else process.env.ORDER_QR_ACCOUNT_NUMBER = prevAcc;
        if (prevBank === undefined) delete process.env.ORDER_QR_BANK_CODE;
        else process.env.ORDER_QR_BANK_CODE = prevBank;
      }
    });

    test("Không có amount → không thêm tham số amount", () => {
      const { buildQrProviderUrls } = requireFreshQr();
      const [vietqr, sepay] = buildQrProviderUrls({
        bankCode: "VPB",
        accountNumber: "12345",
      });
      expect(vietqr).not.toContain("amount=");
      expect(sepay).not.toContain("amount=");
    });
  });

  describe("fetchQrImageBytes — orchestration", () => {
    const ARGS = {
      bankCode: "VPB",
      accountNumber: "12345",
      amount: 100000,
      addInfo: "Thanh toan TEST",
    };

    test("Provider 1 OK → trả buffer ngay, không gọi provider 2", async () => {
      const { fetchQrImageBytes } = requireFreshQr();
      const httpsGetBuffer = jest.fn().mockResolvedValueOnce(Buffer.from("png-bytes-1"));
      const result = await fetchQrImageBytes(ARGS, {
        deps: { httpsGetBuffer },
      });
      expect(result).not.toBeNull();
      expect(result.buffer.toString()).toBe("png-bytes-1");
      expect(result.cached).toBe(false);
      expect(httpsGetBuffer).toHaveBeenCalledTimes(1);
      expect(httpsGetBuffer.mock.calls[0][0]).toMatch(/img\.vietqr\.io/);
    });

    test("Provider 1 fail (timeout) → fallback sang provider 2 (sepay)", async () => {
      const { fetchQrImageBytes } = requireFreshQr();
      const httpsGetBuffer = jest
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" }))
        .mockResolvedValueOnce(Buffer.from("sepay-bytes"));

      const result = await fetchQrImageBytes(ARGS, {
        deps: { httpsGetBuffer },
      });
      expect(result.buffer.toString()).toBe("sepay-bytes");
      expect(httpsGetBuffer).toHaveBeenCalledTimes(2);
      expect(httpsGetBuffer.mock.calls[0][0]).toMatch(/img\.vietqr\.io/);
      expect(httpsGetBuffer.mock.calls[1][0]).toMatch(/qr\.sepay\.vn/);
    });

    test("Cả hai provider đều fail → throw với providerErrors chi tiết", async () => {
      const { fetchQrImageBytes } = requireFreshQr();
      const httpsGetBuffer = jest
        .fn()
        .mockRejectedValueOnce(new Error("vietqr down"))
        .mockRejectedValueOnce(new Error("sepay 500"));

      await expect(fetchQrImageBytes(ARGS, { deps: { httpsGetBuffer } }))
        .rejects.toMatchObject({
          message: "All QR providers failed",
          providerErrors: [
            { url: expect.stringMatching(/vietqr/), error: "vietqr down" },
            { url: expect.stringMatching(/sepay/), error: "sepay 500" },
          ],
        });
    });

    test("Provider 1 trả buffer rỗng → coi như fail, fallback provider 2", async () => {
      const { fetchQrImageBytes } = requireFreshQr();
      const httpsGetBuffer = jest
        .fn()
        .mockResolvedValueOnce(Buffer.alloc(0))
        .mockResolvedValueOnce(Buffer.from("ok"));

      const result = await fetchQrImageBytes(ARGS, { deps: { httpsGetBuffer } });
      expect(result.buffer.toString()).toBe("ok");
      expect(httpsGetBuffer).toHaveBeenCalledTimes(2);
    });

    test("Không có bank/acc → trả null (không gọi network)", async () => {
      const { fetchQrImageBytes } = requireFreshQr();
      const httpsGetBuffer = jest.fn();
      const result = await fetchQrImageBytes(
        { amount: 100, addInfo: "x" },
        { deps: { httpsGetBuffer } }
      );
      expect(result).toBeNull();
      expect(httpsGetBuffer).not.toHaveBeenCalled();
    });
  });

  describe("fetchQrImageBytes — cache", () => {
    const ARGS = {
      bankCode: "VPB",
      accountNumber: "999",
      amount: 50000,
      addInfo: "cache test",
    };

    test("Hit cache lần 2 với cùng URL → không gọi httpsGetBuffer", async () => {
      const { fetchQrImageBytes, clearCache } = requireFreshQr();
      clearCache();
      const httpsGetBuffer = jest.fn().mockResolvedValue(Buffer.from("cached-bytes"));

      const first = await fetchQrImageBytes(ARGS, { deps: { httpsGetBuffer } });
      expect(first.cached).toBe(false);
      expect(httpsGetBuffer).toHaveBeenCalledTimes(1);

      const second = await fetchQrImageBytes(ARGS, { deps: { httpsGetBuffer } });
      expect(second.cached).toBe(true);
      expect(second.buffer.toString()).toBe("cached-bytes");
      expect(httpsGetBuffer).toHaveBeenCalledTimes(1);
    });

    test("Khác args → URL khác → không hit cache", async () => {
      const { fetchQrImageBytes, clearCache } = requireFreshQr();
      clearCache();
      const httpsGetBuffer = jest
        .fn()
        .mockResolvedValueOnce(Buffer.from("a"))
        .mockResolvedValueOnce(Buffer.from("b"));

      const first = await fetchQrImageBytes(
        { ...ARGS, amount: 1 },
        { deps: { httpsGetBuffer } }
      );
      const second = await fetchQrImageBytes(
        { ...ARGS, amount: 2 },
        { deps: { httpsGetBuffer } }
      );
      expect(first.buffer.toString()).toBe("a");
      expect(second.buffer.toString()).toBe("b");
      expect(httpsGetBuffer).toHaveBeenCalledTimes(2);
    });
  });
});
