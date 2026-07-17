require("module-alias/register");
const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");
const { registerFinancialMetricsSubscribers } = require("@/events/subscribers/financialMetricsSubscriber");
const knex = require("@/db/knexClient");
const { pool } = require("@/config/database");

async function test() {
  registerFinancialMetricsSubscribers();

  const monthKey = new Date().toISOString().slice(0, 7);

  console.log('--- GETTING INITIAL STATE ---');
  let summaryBefore = await knex('dashboard.dashboard_monthly_summary').where('month_key', monthKey).first();
  let bankBefore = await knex('admin.shop_bank_accounts').where('id', 1).first();
  console.log('Before Summary Revenue:', summaryBefore?.total_revenue, 'Profit:', summaryBefore?.total_profit, 'Estimated Bank:', summaryBefore?.estimated_bank_balance);
  console.log('Before Bank Balance:', bankBefore?.balance);

  console.log('\n--- EMITTING SEPAY_MONEY_IN EVENT ---');
  eventBus.emit(EVENTS.SEPAY_MONEY_IN, {
    transactionId: 999,
    amount: 500000,
    cost: 150000, // profit should be 350000
    monthKey: monthKey,
    orderCode: 'MOCK-ORDER-1',
    bankAccountId: 1,
    isOrderPayment: true,
    isRenewal: false
  });

  await new Promise(r => setTimeout(r, 2000));

  console.log('\n--- GETTING NEW STATE ---');
  let summaryAfter = await knex('dashboard.dashboard_monthly_summary').where('month_key', monthKey).first();
  let bankAfter = await knex('admin.shop_bank_accounts').where('id', 1).first();

  console.log('After Summary Revenue:', summaryAfter?.total_revenue, 'Profit:', summaryAfter?.total_profit, 'Estimated Bank:', summaryAfter?.estimated_bank_balance);
  console.log('After Bank Balance:', bankAfter?.balance);

  console.log('\n--- DELTAS ---');
  console.log('Revenue Delta:', Number(summaryAfter?.total_revenue) - Number(summaryBefore?.total_revenue || 0));
  console.log('Profit Delta:', Number(summaryAfter?.total_profit) - Number(summaryBefore?.total_profit || 0));
  console.log('Bank Summary Delta:', Number(summaryAfter?.estimated_bank_balance) - Number(summaryBefore?.estimated_bank_balance || 0));
  console.log('Bank Table Balance Delta:', Number(bankAfter?.balance) - Number(bankBefore?.balance || 0));

  await pool.end();
  await knex.destroy();
}

test();
