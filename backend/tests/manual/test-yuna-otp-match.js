#!/usr/bin/env node

require("module-alias/register");
const { fetchOtpBySource } = require("@/services/otpProviderService");

async function main() {
  console.log("=== TESTING AUTOMATED OTP MATCHING FOR YUNA ===");
  try {
    const otp = await fetchOtpBySource({
      otpSource: "yuna",
      accountEmail: "adobevipmavrik20@adoobee.biz.id",
      yunaOrderCode: "adobe1mMavryk2107",
    });
    console.log("Match OTP Result:", otp);
    if (otp === null) {
      console.log("SUCCESS: Returned null because there's no OTP yet (which is correct as 'code' is null in the order details).");
    } else {
      console.log("Result:", otp);
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

main().then(() => {
  process.exit(0);
});
