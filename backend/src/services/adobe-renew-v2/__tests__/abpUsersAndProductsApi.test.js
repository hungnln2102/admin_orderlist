const { extractCcpSeatProductIdsFromOrgProductsList } = require("../shared/accessChecks");
const { extractAbpUserProductRefs, mapAbpUserToSnapshotUser } = require("../shared/usersListApi");

describe("JIL products API (longName) → CCP id", () => {
  it("chỉ lấy id Creative Cloud Pro, bỏ gói thành viên miễn phí", () => {
    const list = [
      { id: "EEE93E34A537E93AFD7A", longName: "Creative Cloud Pro" },
      {
        id: "390A484B6EECB5583A8A",
        longName: "Gói thành viên miễn phí dành cho nhóm",
      },
    ];
    const ids = extractCcpSeatProductIdsFromOrgProductsList(list);
    expect(ids).toEqual(["EEE93E34A537E93AFD7A"]);
  });
});

describe("ABP users → productIds", () => {
  it("đọc resources[].productId", () => {
    const refs = extractAbpUserProductRefs({
      username: "a@x.com",
      resources: [{ productId: "EEE93E34A537E93AFD7A" }],
    });
    expect(refs.map((r) => r.id)).toEqual(["EEE93E34A537E93AFD7A"]);
  });

  it("đọc productAssignments trên account", () => {
    const refs = extractAbpUserProductRefs({
      username: "b@x.com",
      account: {
        productAssignments: [{ productId: "P1" }],
      },
    });
    expect(refs.map((r) => r.id)).toEqual(["P1"]);
  });

  it("map snapshot user có email và products", () => {
    const u = mapAbpUserToSnapshotUser({
      id: "u1",
      username: "luongthanhlong501@gmail.com",
      resources: [{ productId: "EEE93E34A537E93AFD7A" }],
    });
    expect(u.email).toBe("luongthanhlong501@gmail.com");
    expect(u.products.map((p) => p.id)).toEqual(["EEE93E34A537E93AFD7A"]);
  });
});
