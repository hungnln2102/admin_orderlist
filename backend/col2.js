require('module-alias/register'); 
require('./src/db').db.raw("SELECT table_schema, column_name FROM information_schema.columns WHERE table_name = 'supplier_payments'").then(r => console.log(r.rows)).catch(console.error).finally(() => process.exit())
