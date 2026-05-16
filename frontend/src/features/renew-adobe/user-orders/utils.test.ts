import { describe, expect, it } from "vitest";
import { flattenToUserRows } from "./utils";
import type { OrderInfo } from "./types";

function buildOrder(overrides: Partial<OrderInfo>): OrderInfo {
  return {
    order_code: "ORD-1",
    information_order: "user@example.com",
    customer: "User",
    contact: "0900000000",
    expiry_date: null,
    status: "Đã Thanh Toán",
    tracking_status: null,
    tracking_org_name: null,
    tracking_id_product: null,
    system_note: "renew_adobe",
    adobe_account_id: null,
    admin_license_status: null,
    admin_org_name: null,
    ...overrides,
  };
}

describe("flattenToUserRows - fix_ades package status", () => {
  it("chỉ coi có gói khi tracking_status là có gói", () => {
    const rows = flattenToUserRows([
      buildOrder({ system_note: "fix_ades", tracking_status: "có gói" }),
    ]);
    expect(rows[0]?.display_status).toBe("active");
  });

  it("fix_ades: mọi trạng thái khác có gói đều là không có gói", () => {
    const rows = flattenToUserRows([
      buildOrder({ system_note: "fix_ades", tracking_status: "inactive" }),
      buildOrder({ order_code: "ORD-2", system_note: "fix_ades", tracking_status: "" }),
    ]);
    expect(rows[0]?.display_status).toBe("expired");
    expect(rows[1]?.display_status).toBe("expired");
  });

  it("không ảnh hưởng hệ thống renew_adobe", () => {
    const rows = flattenToUserRows([
      buildOrder({
        system_note: "renew_adobe",
        tracking_status: "",
        adobe_account_id: 0,
      }),
    ]);
    expect(rows[0]?.display_status).toBe("not_added");
  });
});
