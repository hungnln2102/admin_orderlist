require('module-alias/register'); 
require('./src/db').db.raw("SELECT table_schema, column_name FROM information_schema.columns WHERE table_name='product_stocks'").then(r => console.log(r.rows)).finally(() => process.exit());
