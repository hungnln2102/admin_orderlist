const { db, TABLES } = require("./src/db");

async function main() {
  const o = await db(TABLES.ORDER_LIST).where({ id: 1422 }).first();
  const r = await db(TABLES.PAYMENT_RECEIPT).where({ id: 43 }).first();
  const a = await db(TABLES.PAYMENT_RECEIPT_ALLOCATIONS).where({ receipt_id: 43 });
  console.log("Order 1422:", {
    id: o.id,
    id_order: o.id_order,
    customer: o.customer,
    price: o.price,
    gross_selling_price: o.gross_selling_price,
    status: o.status,
    was_paid: o.was_paid,
  });
  console.log("Receipt 43:", {
    id: r.id,
    sepay_transaction_id: r.sepay_transaction_id,
    amount: r.amount,
    unallocated_amount: r.unallocated_amount,
    status: r.status,
  });
  console.log("Allocations:", a);
}

main().catch(console.error).finally(() => process.exit());
