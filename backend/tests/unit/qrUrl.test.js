require("module-alias/register");

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildVietQrImageUrl } = require("../../src/utils/qrUrl");

test("buildVietQrImageUrl preserves the compact2 business URL contract", () => {
  assert.equal(
    buildVietQrImageUrl({ bankCode: "970422", accountNumber: "012345", amount: 123456.7, accountName: "Nguyen Van A" }),
    "https://img.vietqr.io/image/970422-012345-compact2.png?amount=123457&accountName=Nguyen%20Van%20A"
  );
});

test("buildVietQrImageUrl preserves optional addInfo for supplier refunds", () => {
  assert.equal(
    buildVietQrImageUrl({ bankCode: "970422", accountNumber: "012345", amount: 50000, accountName: "Shop A", addInfo: "NCC7 HOAN TIEN" }),
    "https://img.vietqr.io/image/970422-012345-compact2.png?amount=50000&accountName=Shop%20A&addInfo=NCC7%20HOAN%20TIEN"
  );
});
