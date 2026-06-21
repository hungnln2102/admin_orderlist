/**
 * Đồng bộ sequence public.orders_id_seq với max(orders.order_list.id).
 *
 * Một số luồng cũ/manual insert dùng id tự tính nên sequence PostgreSQL bị tụt,
 * khiến insert dùng default id có thể đụng khóa chính và làm tạo đơn bằng credit fail.
 */
exports.up = async function up(knex) {
  await knex.raw(`
    DO $$
    DECLARE
      seq_name text := 'public.orders_id_seq';
      max_id bigint;
      seq_last bigint;
    BEGIN
      IF to_regclass(seq_name) IS NULL THEN
        RETURN;
      END IF;

      SELECT COALESCE(MAX(id), 0) INTO max_id FROM orders.order_list;
      SELECT last_value INTO seq_last FROM public.orders_id_seq;

      PERFORM setval(seq_name, GREATEST(max_id, seq_last), true);
    END $$;
  `);
};

exports.down = async function down() {
  // Không rollback sequence để tránh phát sinh id trùng.
};
