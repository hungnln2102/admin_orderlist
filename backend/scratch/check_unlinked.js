// Scratch script to check unlinked expenses
require('module-alias/register');
const { db } = require('../src/db');
const { TABLES } = require('../src/domains/payments/controller/shared/constants');

async function main() {
  try {
    console.log("Querying unlinked expenses from table:", TABLES.storeProfitExpenses);
    
    // Query all unlinked profit withdrawal expenses
    const withdrawals = await db(TABLES.storeProfitExpenses)
      .whereRaw(`(expense_meta->>'payment_receipt_id') IS NULL`)
      .andWhere("expense_type", "withdraw_profit")
      .limit(10);
      
    console.log("\nWithdrawal Profit Expenses:");
    withdrawals.forEach(w => {
      console.log(`- ID: ${w.id}, Amount: ${w.amount}, Expense Type: ${w.expense_type}, Reason: ${w.reason}, Created At: ${w.created_at}`);
    });

    // Query all unlinked external import expenses
    const imports = await db(TABLES.storeProfitExpenses)
      .whereRaw(`(expense_meta->>'payment_receipt_id') IS NULL`)
      .andWhere("expense_type", "external_import")
      .limit(10);
      
    console.log("\nExternal Import Expenses:");
    imports.forEach(i => {
      console.log(`- ID: ${i.id}, Amount: ${i.amount}, Expense Type: ${i.expense_type}, Reason: ${i.reason}, Created At: ${i.created_at}`);
    });
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await db.destroy();
  }
}
main();
