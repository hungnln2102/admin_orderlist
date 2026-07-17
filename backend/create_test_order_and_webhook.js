require("module-alias/register");
const knex = require("@/db/knexClient");
const axios = require('axios');
const { SEPAY_API_KEY } = require('./webhook/sepay/config');

async function run() {
  const existingOrder = await knex('orders.order_list').whereIn('status', ['unpaid', 'processing']).first();
  if (!existingOrder) {
    console.log('No order found! Creating one manually.');
    // just use a fake code for testing
    return;
  }
  const code = existingOrder.id_order;
  console.log('[1] Using existing order:', code, 'Price:', existingOrder.price);

  console.log('[2] Sending Sepay Webhook for ' + code + '...');
  const payload = {
    id: Date.now(),
    transactionDate: new Date().toISOString(),
    transferAmount: existingOrder.price,
    transaction_content: 'THANH TOAN ' + code,
    accountNumber: "1"
  };

  try {
    const res = await axios.post('http://localhost:5000/api/payment/notify', payload, {
      headers: {
        'Authorization': 'Apikey ' + SEPAY_API_KEY
      }
    });
    console.log('[Webhook Response]', res.data);
  } catch (err) {
    console.error('[Webhook Error]', err.response?.data || err.message);
  }
  
  await new Promise(r => setTimeout(r, 2000));

  console.log('[3] Checking Dashboard Summary...');
  const monthKey = new Date().toISOString().slice(0, 7);
  const summary = await knex('finance.dashboard_monthly_summary').where('month_key', monthKey).first();
  console.log('Dashboard Summary:', summary);
  
  const bank = await knex('admin.shop_bank_accounts').where('id', 1).first();
  console.log('Bank Balance:', bank?.balance);

  await knex.destroy();
}

run();
