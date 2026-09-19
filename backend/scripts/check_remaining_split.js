require("module-alias/register");
const { db } = require("@/db");

async function checkRemaining() {
  try {
    const rows = await db("billing.payment_receipt")
      .select("id", "id_order", "original_order_code", "amount", "note", "payment_date", "is_financial_posted")
      .where("note", "like", "%Tách dư%")
      .orderBy("id", "desc");

    console.log(`=== BÁO CÁO CÁC BIÊN LAI CÓ NOTE 'TÁCH DƯ' CÒN LẠI (${rows.length} BẢN GHI) ===`);
    for (const r of rows) {
      console.log(`- ID #${r.id} | id_order: ${r.id_order || 'NULL'} | orig_code: ${r.original_order_code || 'NULL'} | amount: ${r.amount}đ | note: ${r.note}`);
    }
  } catch (err) {
    console.error("Lỗi:", err);
  } finally {
    await db.destroy();
  }
}

checkRemaining();
