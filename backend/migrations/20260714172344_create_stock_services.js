/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Create stock_services table in product schema
  await knex.schema.withSchema('product').createTable('stock_services', (table) => {
    table.increments('id').primary();
    table.integer('stock_id').unsigned().references('id').inTable('product.product_stocks').onDelete('CASCADE');
    table.string('product_type');
    table.string('password_encrypted');
    table.timestamp('expires_at');
    table.string('status').defaultTo('AVAILABLE');
    table.timestamps(true, true);
  });

  // 2. Add stock_service_id to package_product in product schema
  await knex.schema.withSchema('product').alterTable('package_product', (table) => {
    table.integer('stock_service_id').unsigned().references('id').inTable('product.stock_services').onDelete('SET NULL');
  });

  // 3. Migrate data from product_stocks to stock_services
  const existingStocks = await knex.withSchema('product').table('product_stocks').select(
    'id', 'product_type', 'password_encrypted', 'expires_at', 'created_at', 'updated_at'
  );

  for (const stock of existingStocks) {
    if (stock.product_type) {
      const [newService] = await knex.withSchema('product').table('stock_services').insert({
        stock_id: stock.id,
        product_type: stock.product_type,
        password_encrypted: stock.password_encrypted,
        expires_at: stock.expires_at,
        created_at: stock.created_at || knex.fn.now(),
        updated_at: stock.updated_at || knex.fn.now()
      }).returning('id');

      const serviceId = newService.id !== undefined ? newService.id : newService;

      // 4. Update legacy package_product links to point to this new service
      await knex.withSchema('product').table('package_product')
        .where('stock_id', stock.id)
        .update({ stock_service_id: serviceId }); 
    }
  }

  // 5. Drop deprecated columns from product_stocks
  await knex.schema.withSchema('product').alterTable('product_stocks', (table) => {
    table.dropColumn('product_type');
    table.dropColumn('password_encrypted');
    table.dropColumn('expires_at');
  });
};

exports.down = async function(knex) {
  // 1. Restore columns to product_stocks
  await knex.schema.withSchema('product').alterTable('product_stocks', (table) => {
    table.string('product_type');
    table.string('password_encrypted');
    table.timestamp('expires_at');
  });

  // 2. Try to restore data backwards (1 to 1 mapping limitation)
  const services = await knex.withSchema('product').table('stock_services').select('*');
  for (const service of services) {
    await knex.withSchema('product').table('product_stocks').where('id', service.stock_id).update({
      product_type: service.product_type,
      password_encrypted: service.password_encrypted,
      expires_at: service.expires_at
    });
  }

  // 3. Drop stock_service_id from package_product
  await knex.schema.withSchema('product').alterTable('package_product', (table) => {
    table.dropColumn('stock_service_id');
  });

  // 4. Drop stock_services table
  await knex.schema.withSchema('product').dropTable('stock_services');
};
