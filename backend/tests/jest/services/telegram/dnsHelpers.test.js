/**
 * Tests cho preferIpv4Lookup — đảm bảo:
 *   - KHÔNG forward các field options không hợp lệ (localAddress: undefined,
 *     family: 0, ...) xuống dns.lookup → bug "Invalid IP address: undefined".
 *   - Ưu tiên IPv4; fallback all:true khi IPv4 fail.
 *   - Hỗ trợ cả 3-arg và 2-arg (lookup(hostname, cb)).
 *   - Tôn trọng options.all === true (trả mảng cho Node's https.Agent).
 *   - Reject hostname rỗng / invalid.
 */

const dns = require("dns");

jest.mock("dns");

const {
  preferIpv4Lookup,
} = require("../../../../src/services/telegramOrderNotificationLib/dnsHelpers");

beforeEach(() => {
  jest.clearAllMocks();
});

describe("preferIpv4Lookup", () => {
  test("Forward chỉ hints/verbatim — KHÔNG truyền localAddress:undefined (bug fix)", (done) => {
    dns.lookup.mockImplementation((hostname, opts, cb) => {
      // Khẳng định options KHÔNG có field độc hại từ https.Agent.
      expect(opts).not.toHaveProperty("localAddress");
      expect(opts).not.toHaveProperty("port");
      expect(opts).not.toHaveProperty("agent");
      // Hỗ trợ hints/verbatim được forward.
      expect(opts.hints).toBe(32); // ADDRCONFIG-like
      expect(opts.verbatim).toBe(true);
      cb(null, "203.0.113.5", 4);
    });

    preferIpv4Lookup(
      "img.vietqr.io",
      {
        localAddress: undefined, // ⬅ field khiến bug trước đó
        port: undefined,
        family: 0,
        hints: 32,
        verbatim: true,
        agent: { fake: true },
      },
      (err, address, family) => {
        try {
          expect(err).toBeNull();
          expect(address).toBe("203.0.113.5");
          expect(family).toBe(4);
          done();
        } catch (e) {
          done(e);
        }
      }
    );
  });

  test("Ưu tiên IPv4: lookup lần đầu với family:4, all:false", (done) => {
    dns.lookup.mockImplementationOnce((hostname, opts, cb) => {
      expect(opts.family).toBe(4);
      expect(opts.all).toBe(false);
      cb(null, "1.2.3.4", 4);
    });

    preferIpv4Lookup("example.com", {}, (err, address, family) => {
      try {
        expect(err).toBeNull();
        expect(address).toBe("1.2.3.4");
        expect(family).toBe(4);
        expect(dns.lookup).toHaveBeenCalledTimes(1);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  test("IPv4 fail (ENOTFOUND) → fallback all:true, chọn IPv4 trong mảng", (done) => {
    dns.lookup
      .mockImplementationOnce((hostname, opts, cb) => {
        // family:4 fail
        cb(Object.assign(new Error("getaddrinfo ENOTFOUND"), { code: "ENOTFOUND" }));
      })
      .mockImplementationOnce((hostname, opts, cb) => {
        expect(opts.all).toBe(true);
        cb(null, [
          { address: "::1", family: 6 },
          { address: "10.0.0.1", family: 4 },
        ]);
      });

    preferIpv4Lookup("example.com", {}, (err, address, family) => {
      try {
        expect(err).toBeNull();
        expect(address).toBe("10.0.0.1");
        expect(family).toBe(4);
        expect(dns.lookup).toHaveBeenCalledTimes(2);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  test("Cả IPv4 lẫn all=true đều trả empty → cb với Error", (done) => {
    dns.lookup
      .mockImplementationOnce((hostname, opts, cb) => cb(null, "", 0))
      .mockImplementationOnce((hostname, opts, cb) => cb(null, [], 0));

    preferIpv4Lookup("example.com", {}, (err) => {
      try {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toMatch(/no valid address|DNS lookup returned/);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  test("Tôn trọng options.all === true: cb nhận MẢNG addresses", (done) => {
    dns.lookup.mockImplementationOnce((hostname, opts, cb) => {
      expect(opts.all).toBe(false); // lần đầu vẫn yêu cầu single
      cb(null, "1.1.1.1", 4);
    });

    preferIpv4Lookup("example.com", { all: true }, (err, result) => {
      try {
        expect(err).toBeNull();
        expect(Array.isArray(result)).toBe(true);
        expect(result).toEqual([{ address: "1.1.1.1", family: 4 }]);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  test("API 2-arg: preferIpv4Lookup(hostname, cb)", (done) => {
    dns.lookup.mockImplementationOnce((hostname, opts, cb) => {
      cb(null, "8.8.8.8", 4);
    });

    preferIpv4Lookup("example.com", (err, address, family) => {
      try {
        expect(err).toBeNull();
        expect(address).toBe("8.8.8.8");
        expect(family).toBe(4);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  test("Hostname rỗng → callback với TypeError (không gọi dns.lookup)", (done) => {
    preferIpv4Lookup("", {}, (err) => {
      try {
        expect(err).toBeInstanceOf(TypeError);
        expect(dns.lookup).not.toHaveBeenCalled();
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  test("Address dạng object { address, family } cũng được normalize", (done) => {
    dns.lookup.mockImplementationOnce((hostname, opts, cb) => {
      cb(null, { address: "192.168.1.1", family: 4 }, 4);
    });

    preferIpv4Lookup("example.com", {}, (err, address, family) => {
      try {
        expect(err).toBeNull();
        expect(address).toBe("192.168.1.1");
        expect(family).toBe(4);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  test("Throw TypeError khi không truyền callback", () => {
    expect(() => preferIpv4Lookup("example.com", {})).toThrow(TypeError);
  });
});
