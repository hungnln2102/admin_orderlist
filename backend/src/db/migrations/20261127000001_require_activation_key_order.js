function tables(knex) {
  const orders = process.env.DB_SCHEMA_ORDERS || process.env.SCHEMA_ORDERS || "business";
  const warehouse = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";
  const qualified = (schema, name) => knex.raw("??.??", [schema, name]).toQuery();
  return {
    orders: qualified(orders, "order_list"),
    keys: qualified(warehouse, "activation_keys"),
  };
}

exports.up = async (knex) => {
  const { orders, keys } = tables(knex);
  await knex.raw(`
    ALTER TABLE ${orders} ADD CONSTRAINT uq_order_list_activation_key_reference UNIQUE (id_order);

    ALTER TABLE ${keys}
      ALTER COLUMN id_order SET NOT NULL,
      ADD CONSTRAINT ck_activation_key_order_not_blank CHECK (btrim(id_order) <> ''),
      ADD CONSTRAINT uq_activation_key_order UNIQUE (id_order),
      ADD CONSTRAINT fk_activation_key_order FOREIGN KEY (id_order)
        REFERENCES ${orders} (id_order) ON UPDATE CASCADE ON DELETE RESTRICT;
  `);
};

exports.down = async (knex) => {
  const { orders, keys } = tables(knex);
  await knex.raw(`
    ALTER TABLE ${keys}
      DROP CONSTRAINT fk_activation_key_order,
      DROP CONSTRAINT uq_activation_key_order,
      DROP CONSTRAINT ck_activation_key_order_not_blank,
      ALTER COLUMN id_order DROP NOT NULL;

    ALTER TABLE ${orders} DROP CONSTRAINT uq_order_list_activation_key_reference;
  `);
};
