require('module-alias/register'); 
require('./src/db').db.raw("SELECT ss.id, ss.product_id, pn.name, v.display_name, v.variant_name FROM warehouse.stock_services ss LEFT JOIN warehouse.product_names pn ON ss.name_id = pn.id LEFT JOIN product.variant v ON ss.product_id = v.id LIMIT 10").then(r => console.log(r.rows)).finally(() => process.exit());
