const schema = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";

exports.up = async (knex) => {
  const config = () => knex.withSchema(schema).table("system_configs")
    .where("config_key", "OTP_PORTAL_SLOTS_CONFIG");
  const row = await config().forUpdate().first("config_value");
  if (!row?.config_value) return;

  const slots = JSON.parse(row.config_value);
  if (!Array.isArray(slots)) throw new Error("OTP_PORTAL_SLOTS_CONFIG_INVALID");
  let changed = false;
  const updated = slots.map((slot) => {
    if (!slot || Object.hasOwn(slot, "default_service_key")) return slot;
    const assigned = Array.isArray(slot.assigned_services)
      ? slot.assigned_services : [slot.primary_service_key, slot.fallback_service_key];
    const defaultService = assigned.find((key) =>
      typeof key === "string" && key.trim() && key.trim() !== "none"
    )?.trim();
    if (!defaultService) return slot;
    changed = true;
    return { ...slot, default_service_key: defaultService };
  });
  if (changed) await config().update({ config_value: JSON.stringify(updated) });
};

// Older dispatchers ignore the extra field.
exports.down = async () => {};
