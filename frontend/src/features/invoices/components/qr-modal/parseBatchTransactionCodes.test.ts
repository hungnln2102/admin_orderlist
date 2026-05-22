import { describe, expect, test } from "vitest";
import {
  normalizeBatchTransactionToken,
  parseBatchTransactionCodes,
} from "./parseBatchTransactionCodes";

describe("parseBatchTransactionCodes", () => {
  test("accepts 8-char transaction codes", () => {
    expect(parseBatchTransactionCodes("A1B2C3D4, X9Y8Z7W6")).toEqual([
      "A1B2C3D4",
      "X9Y8Z7W6",
    ]);
  });

  test("rejects MAV order codes and MAVG batch codes", () => {
    expect(normalizeBatchTransactionToken("MAVC7MN92")).toBe("");
    expect(normalizeBatchTransactionToken("MAVGC7F12")).toBe("");
    expect(parseBatchTransactionCodes("MAVC7MN92\nMAVGC7F12F4F")).toEqual([]);
  });
});
