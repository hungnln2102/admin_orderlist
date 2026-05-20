import { describe, expect, test } from "vitest";
import {
  bankFieldsFromSelection,
  orphanBankOption,
} from "./applyBankSelection";

describe("applyBankSelection", () => {
  test("maps bank list item to form fields", () => {
    expect(
      bankFieldsFromSelection({
        bin: "970432",
        name: "VPBank",
        code: "VPB",
        fullName: "VP Bank",
      })
    ).toEqual({
      bankBin: "970432",
      bankShortCode: "VPB",
      bankDisplayName: "VP Bank",
    });
  });

  test("orphan option for saved BIN not in list", () => {
    expect(
      orphanBankOption({
        bankBin: "970415",
        bankShortCode: "VIB",
        bankDisplayName: "VIB",
      })
    ).toEqual({
      bin: "970415",
      name: "VIB",
      code: "VIB",
      fullName: "VIB",
    });
  });
});
