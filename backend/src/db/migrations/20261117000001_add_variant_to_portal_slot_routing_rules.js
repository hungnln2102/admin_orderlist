/**
 * Store OTP portal routing at the supplier-variant level.
 * Legacy product-level rows remain valid as fallbacks until reconfigured.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const systemSchema = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";
  const productSchema = process.env.DB_SCHEMA_PRODUCT || process.env.SCHEMA_PRODUCT || "business";

  await knex.raw(`
    ALTER TABLE ${systemSchema}.portal_slot_routing_rules
      ADD COLUMN IF NOT EXISTS variant_id BIGINT;

    ALTER TABLE ${systemSchema}.portal_slot_routing_rules
      ALTER COLUMN product_name_id DROP NOT NULL;

    ALTER TABLE ${systemSchema}.portal_slot_routing_rules
      ADD CONSTRAINT portal_slot_routing_rules_variant_id_fkey
      FOREIGN KEY (variant_id)
      REFERENCES ${productSchema}.variant(id)
      ON DELETE CASCADE;

    CREATE INDEX IF NOT EXISTS idx_portal_slot_routing_rules_variant
      ON ${systemSchema}.portal_slot_routing_rules (slot_key, supplier_id, variant_id)
      WHERE variant_id IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS uq_portal_slot_routing_rules_variant_provider
      ON ${systemSchema}.portal_slot_routing_rules (slot_key, supplier_id, provider_key, variant_id)
      WHERE variant_id IS NOT NULL;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const systemSchema = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";

  await knex.raw(`
    DROP INDEX IF EXISTS ${systemSchema}.uq_portal_slot_routing_rules_variant_provider;
    DROP INDEX IF EXISTS ${systemSchema}.idx_portal_slot_routing_rules_variant;
    DELETE FROM ${systemSchema}.portal_slot_routing_rules WHERE variant_id IS NOT NULL;
    ALTER TABLE ${systemSchema}.portal_slot_routing_rules
      DROP CONSTRAINT IF EXISTS portal_slot_routing_rules_variant_id_fkey;
    ALTER TABLE ${systemSchema}.portal_slot_routing_rules
      DROP COLUMN IF EXISTS variant_id;
    ALTER TABLE ${systemSchema}.portal_slot_routing_rules
      ALTER COLUMN product_name_id SET NOT NULL;
  `);
};