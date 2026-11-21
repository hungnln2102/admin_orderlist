const { TABLES } = require("../tables");

exports.up = async (knex) => {
  await knex.raw(`ALTER TABLE ?? ADD COLUMN account_slot_id bigint REFERENCES ?? (id) ON DELETE CASCADE`,
    [TABLES.PACKAGE_PRODUCT, TABLES.ACCOUNT_SLOTS]);
  await knex.raw(`
    UPDATE ?? AS package SET account_slot_id = matched.slot_id
    FROM (
      SELECT pp.id, min(ss.id) AS slot_id
      FROM ?? pp JOIN ?? ss ON ss.account_id = pp.account_id AND ss.name_id = pp.product_name_id
      GROUP BY pp.id HAVING count(*) = 1
    ) matched WHERE package.id = matched.id
  `, [TABLES.PACKAGE_PRODUCT, TABLES.PACKAGE_PRODUCT, TABLES.ACCOUNT_SLOTS]);
  await knex.raw("CREATE INDEX ON ?? (account_slot_id)", [TABLES.PACKAGE_PRODUCT]);
  await knex.raw("ALTER TABLE ?? ADD CONSTRAINT package_requires_warehouse_slot CHECK (account_slot_id IS NOT NULL) NOT VALID",
    [TABLES.PACKAGE_PRODUCT]);
};

exports.down = (knex) => knex.raw("ALTER TABLE ?? DROP COLUMN account_slot_id", [TABLES.PACKAGE_PRODUCT]);
