require('module-alias/register');
const { buildRenewalQuery } = require('@/scheduler/tasks/shared');
const { getOrderPrefixes } = require('@/utils/orderHelpers');

async function testQueryConstruction() {
  console.log("--- TEST buildRenewalQuery ---");
  try {
    const prefixes = await getOrderPrefixes();
    const importPrefix = String(prefixes.import || "MAVN").trim().toUpperCase();
    const giftPrefix = String(prefixes.gift || "MAVT").trim().toUpperCase();

    console.log("Prefixes loaded:", { importPrefix, giftPrefix });

    const query4Days = buildRenewalQuery('CURRENT_DATE', 4, [importPrefix, giftPrefix]);
    console.log("\nGenerated 4-days Query:\n", query4Days);

    const query0Days = buildRenewalQuery('CURRENT_DATE', 0, [importPrefix, giftPrefix]);
    console.log("\nGenerated 0-days Query:\n", query0Days);

    if (query4Days.includes("NOT LIKE 'MAVN%'") && query4Days.includes("NOT LIKE 'MAVT%'")) {
      console.log("\nSUCCESS: Query correct!");
    } else {
      console.error("\nFAILURE: Query missing exclusions!");
    }
  } catch (err) {
    console.error("Test failed with error:", err);
  }
}

async function testImports() {
  console.log("\n--- TEST IMPORTS ---");
  try {
    require('@/scheduler/tasks/notifyFourDays');
    require('@/scheduler/tasks/notifyZeroDays');
    require('@/scheduler/tasks/updateDatabaseTask');
    require('@/scheduler/tasks/shared/openRenewalSlots');
    require('@/scheduler/tasks/shared/resolveRenewalNotifyPrice');
    console.log("SUCCESS: All imports loaded successfully!");
  } catch (err) {
    console.error("Import failed with error:", err);
  }
}

async function main() {
  await testQueryConstruction();
  await testImports();
  process.exit(0);
}

main();
