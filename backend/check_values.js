require('module-alias/register'); 
require('./src/db').db.raw("SELECT id, product_type_old, product_id FROM warehouse.stock_services LIMIT 10").then(r => console.log(r.rows)).finally(() => process.exit());
