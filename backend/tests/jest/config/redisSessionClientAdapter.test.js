const {
  createConnectRedisClientAdapter,
} = require("../../../src/config/redisSessionClientAdapter");

describe("redisSessionClientAdapter", () => {
  it("maps node-redis set expiration options to ioredis EX syntax", async () => {
    const ioredisMock = {
      set: jest.fn().mockResolvedValue("OK"),
    };
    const adapter = createConnectRedisClientAdapter(ioredisMock);

    await adapter.set("sess:key", '{"ok":true}', {
      expiration: { type: "EX", value: 3600 },
    });

    expect(ioredisMock.set).toHaveBeenCalledWith(
      "sess:key",
      '{"ok":true}',
      "EX",
      3600
    );
  });

  it("supports scanIterator contract used by connect-redis", async () => {
    const ioredisMock = {
      scan: jest
        .fn()
        .mockResolvedValueOnce(["1", ["sess:a"]])
        .mockResolvedValueOnce(["0", ["sess:b"]]),
    };
    const adapter = createConnectRedisClientAdapter(ioredisMock);

    const chunks = [];
    for await (const keys of adapter.scanIterator({ MATCH: "sess:*", COUNT: 100 })) {
      chunks.push(keys);
    }

    expect(chunks).toEqual([["sess:a"], ["sess:b"]]);
    expect(ioredisMock.scan).toHaveBeenNthCalledWith(
      1,
      "0",
      "MATCH",
      "sess:*",
      "COUNT",
      100
    );
  });
});
