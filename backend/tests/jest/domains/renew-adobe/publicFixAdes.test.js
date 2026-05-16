const {
  __test__,
} = require("../../../../src/domains/renew-adobe/controller/publicFixAdes");

describe("publicFixAdes status normalization", () => {
  it("maps active statuses to có gói", () => {
    expect(__test__.mapAdesStatusToTracking("active")).toBe("có gói");
    expect(__test__.mapAdesStatusToTracking("processing")).toBe("có gói");
  });

  it("maps non-active statuses to hết gói", () => {
    expect(__test__.mapAdesStatusToTracking("inactive")).toBe("hết gói");
    expect(__test__.mapAdesStatusToTracking("anything-else")).toBe("hết gói");
  });

  it("normalizes not-active payloads to ok=true for renew flow", () => {
    const normalized = __test__.normalizeCheckResultForRenewFlow({
      ok: false,
      status: 400,
      data: { status: "not active", message: "Account is not active yet" },
    });

    expect(normalized.ok).toBe(true);
    expect(normalized.data.status).toBe("not active");
  });

  it("adds order_id scope when tracking row has order", () => {
    const calls = [];
    const query = {
      whereRaw(...args) {
        calls.push(["whereRaw", ...args]);
        return this;
      },
      where(...args) {
        calls.push(["where", ...args]);
        return this;
      },
      andWhere(...args) {
        calls.push(["andWhere", ...args]);
        return this;
      },
    };

    __test__.applyFixAdesTrackingFilter(query, "mail@example.com", {
      order_id: "ORD-123",
    });

    expect(calls).toEqual([
      [
        "whereRaw",
        "LOWER(TRIM(COALESCE(??, ''))) = ?",
        ["account", "mail@example.com"],
      ],
      ["where", "system_note", "fix_ades"],
      ["andWhere", "order_id", "ORD-123"],
    ]);
  });
});
