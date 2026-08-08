require('module-alias/register');
const db = require('../src/db/knexClient');

async function main() {
  const orders = ['MAVLE876G', 'MAVL9AGCY', 'MAVLJ5XSG'];

  console.log("=== ORDER STATUS ===");
  const orderRows = await db('business.order_list').whereIn('id_order', orders);
  console.log(orderRows.map(r => ({
    id_order: r.id_order,
    price: r.price,
    cost: r.cost,
    status: r.status
  })));

  console.log("\n=== BANK ACCOUNT BALANCE ===");
  const bankAccount = await db('finance.financial_accounts').where('account_number', '9183400998').first();
  console.log(bankAccount ? {
    label: bankAccount.label,
    account_number: bankAccount.account_number,
    balance: bankAccount.balance
  } : "Not found");

  console.log("\n=== RECEIPTS ===");
  const receipts = await db('billing.payment_receipt').whereIn('id_order', orders);
  console.log(receipts.map(r => ({
    id: r.id,
    id_order: r.id_order,
    amount: r.amount,
    receiver: r.receiver
  })));

  console.log("\n=== SUPPLIER COST LOGS ===");
  const costLogs = await db('business.supplier_order_cost_log').whereIn('id_order', orders);
  console.log(costLogs.map(c => ({
    id: c.id,
    id_order: c.id_order,
    supply_id: c.supply_id,
    import_cost: c.import_cost,
    ncc_payment_status: c.ncc_payment_status
  })));
}

main()
  .catch(console.error)
  .finally(() => db.destroy());
