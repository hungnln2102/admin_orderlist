/**
 * Add package_warehouse to the persisted GPT account lookup slot without
 * overwriting any other portal configuration selected by the administrator.
 */
const SYSTEM_SCHEMA = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";
const CONFIG_KEY = "OTP_PORTAL_SLOTS_CONFIG";
const PROVIDER_KEY = "package_warehouse";

function normalizeAssignedServices(slot) {
  const assigned = Array.isArray(slot.assigned_services) && slot.assigned_services.length > 0
    ? slot.assigned_services
    : [slot.primary_service_key, slot.fallback_service_key];
  return assigned.filter((serviceKey) => typeof serviceKey === "string" && serviceKey.trim());
}

exports.up = async (knex) => {
  const hasSystemConfigs = await knex.schema.withSchema(SYSTEM_SCHEMA).hasTable("system_configs");
  if (!hasSystemConfigs) return;

  const existing = await knex.withSchema(SYSTEM_SCHEMA).table("system_configs").where("config_key", CONFIG_KEY).first();
  if (!existing?.config_value) return;

  let slots;
  try {
    slots = JSON.parse(existing.config_value);
  } catch {
    return;
  }
  if (!Array.isArray(slots)) return;

  let changed = false;
  const updatedSlots = slots.map((slot) => {
    if (slot?.slot_key !== "gpt_account") return slot;
    const assignedServices = normalizeAssignedServices(slot);
    if (assignedServices.includes(PROVIDER_KEY)) return slot;
    changed = true;
    const mergedServices = [PROVIDER_KEY, ...assignedServices];
    return {
      ...slot,
      assigned_services: mergedServices,
      primary_service_key: mergedServices[0],
      fallback_service_key: mergedServices[1] || null,
    };
  });

  if (changed) {
    await knex.withSchema(SYSTEM_SCHEMA).table("system_configs").where("config_key", CONFIG_KEY).update({
      config_value: JSON.stringify(updatedSlots),
      updated_by: "SYSTEM",
      updated_at: knex.fn.now(),
    });
  }
};

exports.down = async (knex) => {
  const hasSystemConfigs = await knex.schema.withSchema(SYSTEM_SCHEMA).hasTable("system_configs");
  if (!hasSystemConfigs) return;

  const existing = await knex.withSchema(SYSTEM_SCHEMA).table("system_configs").where("config_key", CONFIG_KEY).first();
  if (!existing?.config_value) return;

  let slots;
  try {
    slots = JSON.parse(existing.config_value);
  } catch {
    return;
  }
  if (!Array.isArray(slots)) return;

  const updatedSlots = slots.map((slot) => {
    if (slot?.slot_key !== "gpt_account") return slot;
    const assignedServices = normalizeAssignedServices(slot).filter((serviceKey) => serviceKey !== PROVIDER_KEY);
    return {
      ...slot,
      assigned_services: assignedServices,
      primary_service_key: assignedServices[0] || null,
      fallback_service_key: assignedServices[1] || null,
    };
  });

  await knex.withSchema(SYSTEM_SCHEMA).table("system_configs").where("config_key", CONFIG_KEY).update({
    config_value: JSON.stringify(updatedSlots),
    updated_by: "SYSTEM",
    updated_at: knex.fn.now(),
  });
};