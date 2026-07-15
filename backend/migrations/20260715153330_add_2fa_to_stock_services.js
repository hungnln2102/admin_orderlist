exports.up = async function(knex) {
  await knex.schema.withSchema('product').alterTable('stock_services', (table) => {
    table.string('backup_email');
    table.string('two_fa_encrypted');
  });

  // Migrate existing backup_email and two_fa_encrypted from product_stocks if needed
  // This is safe to skip if no data exists, but we'll try to sync just in case
  const stocks = await knex.withSchema('product').table('product_stocks').select('id', 'backup_email', 'two_fa_encrypted');
  for (const stock of stocks) {
    if (stock.backup_email || stock.two_fa_encrypted) {
      await knex.withSchema('product').table('stock_services')
        .where('stock_id', stock.id)
        .update({
          backup_email: stock.backup_email,
          two_fa_encrypted: stock.two_fa_encrypted
        });
    }
  }

  await knex.schema.withSchema('product').alterTable('product_stocks', (table) => {
    table.dropColumn('backup_email');
    table.dropColumn('two_fa_encrypted');
  });
};

exports.down = async function(knex) {
  await knex.schema.withSchema('product').alterTable('product_stocks', (table) => {
    table.string('backup_email');
    table.string('two_fa_encrypted');
  });

  await knex.schema.withSchema('product').alterTable('stock_services', (table) => {
    table.dropColumn('backup_email');
    table.dropColumn('two_fa_encrypted');
  });
};
