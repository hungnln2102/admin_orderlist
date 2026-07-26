require('module-alias/register'); 
require('./src/db').db.raw("SELECT column_name FROM information_schema.columns WHERE table_name = 'supplier_payments'").then(r => console.log(r.rows.map(x => x.column_name))).catch(console.error).finally(() => process.exit())
