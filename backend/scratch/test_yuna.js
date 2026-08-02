require("module-alias/register");
const yunaOtpService = require("@/services/otp/yunaOtpService");

async function main() {
  const orderCode = "adb1mmavryk1507";
  console.log(`=== Fetching order: ${orderCode} ===`);
  const result = await yunaOtpService.fetchYunaOrder(orderCode);
  console.log("Result:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
