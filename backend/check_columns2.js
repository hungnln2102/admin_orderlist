require('module-alias/register'); 
require('./src/db').db.raw("SELECT column_name FROM information_schema.columns WHERE table_schema='warehouse' AND table_name='stock_services'").then(r => console.log(r.rows)).finally(() => process.exit());
