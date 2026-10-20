const { db, TABLES } = require("../v2/backend/src/db");

async function fixBalances() {
  try {
    console.log("Fixing negative balances...");
    const updatedBanks = await db(TABLES.SHOP_BANK_ACCOUNTS)
      .where("balance", "<", 0)
      .update({ balance: 0 });
    console.log(`Fixed ${updatedBanks} bank accounts with negative balance.`);

    const updatedUsdt = await db(TABLES.USDT_WALLETS)
      .where("balance", "<", 0)
      .update({ balance: 0 });
    console.log(`Fixed ${updatedUsdt} USDT wallets with negative balance.`);

    process.exit(0);
  } catch (err) {
    console.error("Error fixing balances:", err);
    process.exit(1);
  }
}

fixBalances();
