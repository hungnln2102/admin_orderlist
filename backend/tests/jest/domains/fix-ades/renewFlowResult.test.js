const {
  isLikelyNotActivePayload,
  normalizeCheckResultForRenewFlow,
} = require("@/domains/fix-ades/helpers/renewFlowResult");

describe("fix-ades renew flow result helpers", () => {
  test("detects inactive payload hints", () => {
    expect(isLikelyNotActivePayload({ status: "Not Active" })).toBe(true);
    expect(isLikelyNotActivePayload({ user: { status: "chưa kích hoạt" } })).toBe(true);
    expect(isLikelyNotActivePayload({ status: "active" })).toBe(false);
  });

  test("normalizes inactive check failure into renew-flow success payload", () => {
    expect(
      normalizeCheckResultForRenewFlow({
        ok: false,
        status: 404,
        data: { status: " Not Active ", message: "not active" },
      })
    ).toEqual({
      ok: true,
      status: 404,
      data: { status: "not active", message: "not active" },
    });
  });

  test("leaves non-inactive result untouched", () => {
    const result = { ok: false, status: 500, data: { message: "server error" } };
    expect(normalizeCheckResultForRenewFlow(result)).toBe(result);
  });
});
