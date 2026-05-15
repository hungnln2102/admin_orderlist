/**
 * DEBT-CR-1: thay marker text [REFUNDED_CASHOUT] bằng cột rõ nghĩa.
 * - add receipt.refund_credit_notes.refunded_cashout_at (TIMESTAMPTZ, nullable)
 * - backfill từ dữ liệu cũ đang dùng marker trong note
 */

exports.up = async function up(knex) {
  const hasTable = await knex.schema.withSchema("receipt").hasTable("refund_credit_notes");
  if (!hasTable) return;

  const hasColumn = await knex.schema
    .withSchema("receipt")
    .hasColumn("refund_credit_notes", "refunded_cashout_at");

  if (!hasColumn) {
    await knex.schema.withSchema("receipt").alterTable("refund_credit_notes", (table) => {
      table.timestamp("refunded_cashout_at", { useTz: true }).nullable();
    });
  }

  await knex.raw(`
    UPDATE receipt.refund_credit_notes
    SET refunded_cashout_at = COALESCE(refunded_cashout_at, updated_at, NOW())
    WHERE status = 'VOID'
      AND COALESCE(refunded_cashout_at, NULL) IS NULL
      AND COALESCE(note, '') LIKE '%[REFUNDED_CASHOUT]%'
  `);
};

exports.down = async function down(knex) {
  const hasTable = await knex.schema.withSchema("receipt").hasTable("refund_credit_notes");
  if (!hasTable) return;

  const hasColumn = await knex.schema
    .withSchema("receipt")
    .hasColumn("refund_credit_notes", "refunded_cashout_at");

  if (hasColumn) {
    await knex.schema.withSchema("receipt").alterTable("refund_credit_notes", (table) => {
      table.dropColumn("refunded_cashout_at");
    });
  }
};

