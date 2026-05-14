import { describe, it, expect, vi } from "vitest";
import {
  orderBelongsToPackageByProduct,
  orderMatchesPackageLink,
  computeAugmentationForPackage,
} from "./packageMatchUtils";
import type { PackageRow, NormalizedOrderRecord } from "./packageHelpers";
import { enhancePackageRow, readSlotLinkPrefs } from "./packageHelpers";

const baseOrder = (over: Partial<NormalizedOrderRecord["base"]> = {}): NormalizedOrderRecord => ({
  base: { id: 1, id_order: "O1", id_product: "GOOGLE2000", ...over },
  productKey: "google2000",
  productLettersKey: "google",
  infoKey: "a",
  infoLettersKey: "a",
  slotDisplay: "acc@x.com",
  slotKey: "acc@x.com",
  slotMatchKey: "acc@x.com",
  informationDisplay: "info@x.com",
  informationKey: "info@x.com",
  informationMatchKey: "info@x.com",
  customerDisplay: "c",
  productCodeNormalized: "google2000",
  lineProductId: 3,
});

describe("orderBelongsToPackageByProduct", () => {
  it("khớp khi lineProductId = productId (cùng product)", () => {
    const row = { package: "GoogleOne", productId: 3 } as PackageRow;
    const o = baseOrder();
    expect(orderBelongsToPackageByProduct({ ...o, lineProductId: 3, productCodeNormalized: "other" }, row)).toBe(
      true
    );
  });

  it("không khớp product khi lineProductId khác productId", () => {
    const row = { package: "GoogleOne", productId: 3, normalizedProductCodes: [] } as PackageRow;
    const o = { ...baseOrder(), lineProductId: 9, productCodeNormalized: "zzz" };
    expect(orderBelongsToPackageByProduct(o, row)).toBe(false);
  });
});

describe("orderMatchesPackageLink", () => {
  it("chế độ slot: so slot với tài khoản gói (informationUser)", () => {
    const item: PackageRow = {
      id: 1,
      package: "GoogleOne",
      informationUser: "acc@x.com",
      slotLinkMode: "slot",
    } as PackageRow;
    const o = baseOrder();
    expect(orderMatchesPackageLink(o, item)).toBe(true);
  });

  it("chế độ information: so information_order với tài khoản kích hoạt (accountUser)", () => {
    const item: PackageRow = {
      id: 1,
      package: "GoogleOne",
      informationUser: "root@other.com",
      accountUser: "info@x.com",
      slotLinkMode: "information",
    } as PackageRow;
    const o = baseOrder();
    expect(orderMatchesPackageLink(o, item)).toBe(true);
  });

  it("chế độ information: vẫn khớp khi chỉ có tài khoản kho gói (informationUser), chưa có kho lưu (accountUser)", () => {
    const item: PackageRow = {
      id: 1,
      package: "Netflix",
      informationUser: "info@x.com",
      accountUser: null,
      slotLinkMode: "information",
    } as PackageRow;
    const o = baseOrder();
    expect(orderMatchesPackageLink(o, item)).toBe(true);
  });
});

describe("computeAugmentationForPackage", () => {
  it("vẫn tính match khi package rỗng nhưng có productId (nhánh phạm vi product)", () => {
    const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const order = baseOrder();
    const orderMatchers: NormalizedOrderRecord[] = [order];
    const ordersByProductCode = new Map<string, NormalizedOrderRecord[]>();

    const item = enhancePackageRow(
      {
        id: 1,
        package: "", // tên lỗi dữ liệu — trước fix hay làm shouldMatchOrders = false
        productId: 3,
        productCodes: [] as string[],
        match: "slot",
        informationUser: "acc@x.com",
        slot: 4,
        storageTotal: 2000,
        hasCapacityField: true,
      } as PackageRow,
      readSlotLinkPrefs()
    );

    const out = computeAugmentationForPackage({
      item: { ...item, package: "" },
      orderMatchers,
      ordersByProductCode,
      ordersReady: true,
    });

    expect(out.slotUsed).toBe(1);
    expect(out.matchedOrders.length).toBe(1);
    consoleSpy.mockRestore();
  });
});
