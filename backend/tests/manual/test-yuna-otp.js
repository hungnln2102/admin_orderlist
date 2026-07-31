#!/usr/bin/env node

require("module-alias/register");
const yunaOtpService = require("@/services/yunaOtpService");

async function main() {
  const args = process.argv.slice(2);
  const orderIndex = args.indexOf("--order");
  const orderCode = orderIndex !== -1 ? args[orderIndex + 1] : "DH123456";

  console.log(`=== TESTING YUNAGRP ORDER LOOKUP FOR: ${orderCode} ===`);
  try {
    const orderResult = await yunaOtpService.fetchYunaOrder(orderCode);
    console.log("Lookup result:", JSON.stringify(orderResult, null, 2));

    if (args.includes("--report")) {
      const emailIndex = args.indexOf("--email");
      const email = emailIndex !== -1 ? args[emailIndex + 1] : "test@domain.com";
      const groupIndex = args.indexOf("--group");
      const group = groupIndex !== -1 ? args[groupIndex + 1] : "Adobe Creative Cloud";

      console.log(`\n=== TESTING YUNAGRP REPORT ERROR FOR: ${email} (${group}) ===`);
      const reportResult = await yunaOtpService.reportYunaError(orderCode, group, email);
      console.log("Report result:", JSON.stringify(reportResult, null, 2));
    }
  } catch (error) {
    console.error("Test failed with error:", error);
  }
}

main().then(() => {
  console.log("\n=== TEST COMPLETED ===");
  process.exit(0);
});
