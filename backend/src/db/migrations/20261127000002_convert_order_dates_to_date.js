const schemaOrders =
  process.env.DB_SCHEMA_ORDERS ||
  process.env.SCHEMA_ORDERS ||
  process.env.DB_SCHEMA_BUSINESS ||
  "business";

const DATE_COLUMNS = ["order_date", "expired_at"];

exports.config = { transaction: true };

exports.up = async (knex) => {
  await knex.raw("LOCK TABLE ??.?? IN ACCESS EXCLUSIVE MODE", [
    schemaOrders,
    "order_list",
  ]);

  for (const col of DATE_COLUMNS) {
    const colInfo = await knex("information_schema.columns")
      .where({
        table_schema: schemaOrders,
        table_name: "order_list",
        column_name: col,
      })
      .first("data_type");

    if (!colInfo || colInfo.data_type === "date") {
      continue;
    }

    const checkRes = await knex.raw(
      `SELECT COUNT(*)::int AS cnt
       FROM ??.??
       WHERE ?? IS NOT NULL
         AND (?? AT TIME ZONE 'Asia/Ho_Chi_Minh')::time <> '00:00:00'`,
      [schemaOrders, "order_list", col, col]
    );
    const nonMidnightCount = Number(checkRes?.rows?.[0]?.cnt || 0);
    if (nonMidnightCount > 0) {
      throw new Error(
        `Cannot convert ${schemaOrders}.order_list.${col} to DATE: ${nonMidnightCount} row(s) have non-midnight Asia/Ho_Chi_Minh time`
      );
    }

    await knex.raw(
      `ALTER TABLE ??.??
       ALTER COLUMN ?? TYPE date
       USING to_char(?? AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')::date`,
      [schemaOrders, "order_list", col, col]
    );
  }
};

exports.down = async (knex) => {
  await knex.raw("LOCK TABLE ??.?? IN ACCESS EXCLUSIVE MODE", [
    schemaOrders,
    "order_list",
  ]);

  for (const col of DATE_COLUMNS) {
    const colInfo = await knex("information_schema.columns")
      .where({
        table_schema: schemaOrders,
        table_name: "order_list",
        column_name: col,
      })
      .first("data_type");

    if (!colInfo || colInfo.data_type !== "date") {
      continue;
    }

    await knex.raw(
      `ALTER TABLE ??.??
       ALTER COLUMN ?? TYPE timestamp with time zone
       USING (??::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')`,
      [schemaOrders, "order_list", col, col]
    );
  }
};
