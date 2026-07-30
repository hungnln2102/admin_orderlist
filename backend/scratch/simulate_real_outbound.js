// Register module-alias so we can require @/...
require('module-alias/register');

const { parseWebhookTransaction } = require('../webhook/sepay/routes/webhook/parsePhase');
const { processWebhookTransactionAsync } = require('../webhook/sepay/routes/webhook/postHandler');

async function run() {
  const reqBody = {
    id: Date.now(),
    gateway: "mbbank",
    transactionDate: "2026-07-29 23:28:00",
    accountNumber: "0378304963",
    transferType: "out",
    transferAmount: 359987,
    content: "MBCT NGO LE NGOC HUNG chuyen tien D2V565T4/039793",
    description: "MBCT NGO LE NGOC HUNG chuyen tien D2V565T4/039793"
  };

  console.log("=== SIMULATING REAL OUTBOUND TRANSACTION ===");
  const parsed = parseWebhookTransaction(reqBody);
  console.log("Parsed result:", JSON.stringify(parsed, null, 2));

  try {
    await processWebhookTransactionAsync(reqBody, parsed);
    console.log("=== SIMULATION COMPLETED SUCCESSFULLY ===");
  } catch (err) {
    console.error("=== SIMULATION FAILED ===", err);
  } finally {
    process.exit(0);
  }
}

run();
