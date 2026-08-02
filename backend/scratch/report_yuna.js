require("module-alias/register");
const yunaOtpService = require("@/services/otp/yunaOtpService");

async function main() {
  const orderCode = "adb1mmavryk1507";
  const group = "Adobe Account";
  const name = "adb1mmavryk1507@graphhub.one|hzyunD@OynF5v";

  console.log(`=== Reporting error for: ${name} ===`);
  const reportResult = await yunaOtpService.reportYunaError(orderCode, group, name);
  console.log("Report Result:", JSON.stringify(reportResult, null, 2));

  console.log(`=== Fetching order: ${orderCode} again ===`);
  const result = await yunaOtpService.fetchYunaOrder(orderCode);
  console.log("Result:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
