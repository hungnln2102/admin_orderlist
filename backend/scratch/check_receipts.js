require("module-alias/register");
const { db } = require("../src/db");
const { TABLES } = require("../src/domains/payments/controller/shared/constants");

async function check() {
  try {
    const rows = await db(TABLES.paymentReceipt)
      .select("id", "amount", "sender", "receiver", "note", "payment_date")
      .orderBy("payment_date", "desc")
      .limit(10);
    console.log("LAST 10 RECEIPTS:");
    console.log(JSON.stringify(rows, null, 2));
    
    const negativeRows = await db(TABLES.paymentReceipt)
      .where("amount", "<", 0)
      .limit(5);
    console.log("NEGATIVE RECEIPTS:");
    console.log(JSON.stringify(negativeRows, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("Error querying receipts:", error);
    process.exit(1);
  }
}

check();
