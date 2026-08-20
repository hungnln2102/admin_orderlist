exports.up = async function up(knex) {
  // 1. Add original_order_code column to billing.payment_receipt
  await knex.schema.alterTable("billing.payment_receipt", (table) => {
    table.text("original_order_code").nullable();
  });

  // 2. Create index on original_order_code
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_payment_receipt_original_order_code 
    ON billing.payment_receipt (original_order_code);
  `);

  // 3. Backfill non-split receipts: set original_order_code = id_order where id_order is present
  await knex.raw(`
    UPDATE billing.payment_receipt 
    SET original_order_code = id_order 
    WHERE id_order IS NOT NULL AND original_order_code IS NULL;
  `);

  // 4. Backfill split receipts: match based on '[Tách dư GD #<parentId>]' pattern in note
  await knex.raw(`
    UPDATE billing.payment_receipt pr_child
    SET original_order_code = pr_parent.id_order
    FROM billing.payment_receipt pr_parent
    WHERE pr_child.note LIKE '[Tách dư GD #%'
      AND pr_child.original_order_code IS NULL
      AND pr_parent.id = SUBSTRING(pr_child.note FROM '\\[Tách dư GD #([0-9]+)\\]')::integer;
  `);
};

exports.down = async function down(knex) {
  // Drop index and column
  await knex.raw(`
    DROP INDEX IF EXISTS idx_payment_receipt_original_order_code;
  `);
  await knex.schema.alterTable("billing.payment_receipt", (table) => {
    table.dropColumn("original_order_code");
  });
};
