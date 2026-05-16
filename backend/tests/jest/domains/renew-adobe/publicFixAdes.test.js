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
});
