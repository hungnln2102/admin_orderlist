const schema = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";

exports.up = async (knex) => {
  const config = () => knex.withSchema(schema).table("system_configs")
    .where("config_key", "OTP_PORTAL_SLOTS_CONFIG");
  const row = await config().forUpdate().first("config_value");
  if (!row?.config_value) return;
  const slots = JSON.parse(row.config_value);
  if (!Array.isArray(slots)) throw new Error("OTP_PORTAL_SLOTS_CONFIG_INVALID");
  const updated = slots.map((slot) => {
    if (!slot || !Object.hasOwn(slot, "default_service_key")) return slot;
    const { default_service_key, ...rest } = slot;
    return rest;
  });
  if (updated.some((slot, index) => slot !== slots[index])) {
    await config().update({ config_value: JSON.stringify(updated) });
  }
};

// Previous operator choices cannot be reconstructed after removal.
exports.down = async () => {};
