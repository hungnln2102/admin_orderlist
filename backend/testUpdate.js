require('module-alias/register');
const db = require('./src/db').db;
const { updateWarehouse } = require('./src/domains/warehouse/controller/index');

const req = {
  params: { id: 36 },
  body: {
    account: "murciaCelos@gmail.com",
    services: [
      {
        id: 27,
        category: "Mail",
        password: "qhw12ybv4o",
        backup_email: "dybalagallivangb760@outlook.com"
      },
      {
        product_id: "102",
        category: "Youtube Premium",
        password: "qhw12ybv4o",
        expires_at: "2026-07-14T00:00:00.000Z"
      }
    ]
  }
};

const res = {
  status: (code) => ({
    json: (data) => console.log(`Status ${code}:`, JSON.stringify(data, null, 2))
  }),
  json: (data) => console.log('Result:', JSON.stringify(data, null, 2))
};

updateWarehouse(req, res).catch(console.error).finally(()=>process.exit());
