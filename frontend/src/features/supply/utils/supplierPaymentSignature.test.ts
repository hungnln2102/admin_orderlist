import { describe, expect, it } from "vitest";
import { encodeSupplierSignature } from "./supplierPaymentSignature";

describe("encodeSupplierSignature", () => {
  it("subtracts a stable 1-100 VND offset from supplier payout", () => {
    expect(encodeSupplierSignature(1_400_000, 0)).toBe(1_399_999);
    expect(encodeSupplierSignature(1_400_000, 1)).toBe(1_399_999);
    expect(encodeSupplierSignature(1_400_000, 99)).toBe(1_399_901);
    expect(encodeSupplierSignature(1_400_000, 100)).toBe(1_399_900);
    expect(encodeSupplierSignature(1_400_000, 101)).toBe(1_399_999);
  });

  it("never returns zero or negative for small positive amounts", () => {
    expect(encodeSupplierSignature(50, 99)).toBe(1);
  });
});
