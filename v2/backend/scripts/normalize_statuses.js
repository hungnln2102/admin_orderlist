require('dotenv').config();
const knex = require('knex');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});

async function run() {
  console.log('Normalizing order statuses...');

  console.log('Updating Hết Hạn -> EXPIRED:', await db('business.order_list').where('status', 'LIKE', '%Hết Hạn%').update({ status: 'EXPIRED' }));
  console.log('Updating Chưa Thanh Toán -> UNPAID:', await db('business.order_list').where('status', 'LIKE', '%Chưa Thanh Toán%').update({ status: 'UNPAID' }));
  console.log('Updating Đã Hoàn -> REFUNDED:', await db('business.order_list').where('status', 'LIKE', '%Đã Hoàn%').update({ status: 'REFUNDED' }));
  console.log('Updating Đã Thanh Toán -> PAID:', await db('business.order_list').where('status', 'LIKE', '%Đã Thanh Toán%').update({ status: 'PAID' }));
  console.log('Updating Cần Gia Hạn -> RENEW_REQUIRED:', await db('business.order_list').where('status', 'LIKE', '%Cần Gia Hạn%').update({ status: 'RENEW_REQUIRED' }));

  const remaining = await db('business.order_list').select('status').groupBy('status');
  console.log('Remaining statuses:', remaining);

  await db.destroy();
  process.exit(0);
}

run().catch(console.error);
