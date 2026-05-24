import { describe, expect, test } from "vitest";
import {
  normalizeBatchOrderToken,
  parseBatchOrderCodes,
} from "./parseBatchOrderCodes";

describe("parseBatchOrderCodes", () => {
  test("accepts MAV order codes", () => {
    expect(parseBatchOrderCodes("MAVCRPZT4, MAVC8LNXQ\nMAVC88QFY")).toEqual([
      "MAVCRPZT4",
      "MAVC8LNXQ",
      "MAVC88QFY",
    ]);
  });

  test("rejects legacy batch codes and 8-char transaction tokens", () => {
    expect(normalizeBatchOrderToken("MAVGC7F12F4F")).toBe("");
    expect(normalizeBatchOrderToken("A1B2C3D4")).toBe("");
    expect(parseBatchOrderCodes("A1B2C3D4\nMAVGC7F12F4F")).toEqual([]);
  });
});
