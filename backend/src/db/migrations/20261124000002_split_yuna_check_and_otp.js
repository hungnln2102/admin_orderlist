exports.up = async (knex) => {
  const system = process.env.DB_SCHEMA_SYSTEM || process.env.DB_SCHEMA_RENEW_ADOBE || "system_automation";
  const product = process.env.DB_SCHEMA_PRODUCT || process.env.SCHEMA_PRODUCT || process.env.DB_SCHEMA_BUSINESS || "business";
  const warehouse = process.env.DB_SCHEMA_WAREHOUSE || process.env.SCHEMA_WAREHOUSE || "warehouse";
  const table = (schema, name) => knex.withSchema(schema).table(name);
  const names = { yuna_2fa: "yuna_check", yuna_mail: "yuna_otp" };
  const isLookup = (slot) => slot === "adobe_check" || slot?.endsWith("_account");
  const remap = (key) => names[key] || key;
  const rules = () => table(system, "portal_slot_routing_rules");

  const legacyRules = await rules().whereIn("provider_key", Object.keys(names))
    .orderByRaw("(slot_key = ?) ASC", ["adobe_account"]).orderBy("id");
  for (const row of legacyRules) {
    const provider = remap(row.provider_key);
    const slot = row.slot_key === "adobe_account" && provider === "yuna_check" ? "adobe_check" : row.slot_key;
    const peers = await rules().where({
      slot_key: slot, variant_id: row.variant_id, supplier_id: row.supplier_id,
    }).modify((query) => {
      if (row.variant_id == null) query.where("product_name_id", row.product_name_id);
    }).whereNot("id", row.id);
    if (peers.some((peer) => peer.provider_key === provider)) {
      await rules().where("id", row.id).delete();
      continue;
    }
    if (row.slot_key !== slot && peers.some((peer) => peer.is_active && remap(peer.provider_key) !== provider)) {
      await rules().where("id", row.id).update({ provider_key: provider, is_active: false });
      continue;
    }
    await rules().where("id", row.id).update({
      slot_key: slot, provider_key: provider,
      is_active: row.is_active && (provider !== "yuna_check" || isLookup(slot)),
    });
  }

  const mappings = () => table(product, "product_api_configs");
  for (const row of await mappings().whereIn("provider_key", Object.keys(names))) {
    const provider = remap(row.provider_key);
    if (await mappings().where({ product_id: row.product_id, provider_key: provider }).first("id")) {
      await mappings().where("id", row.id).delete();
    } else {
      await mappings().where("id", row.id).update({ provider_key: provider });
    }
  }
  const slots = () => table(warehouse, "account_slots");
  await slots().where("provider_key", "yuna_mail").update({ provider_key: "yuna_otp" });
  await slots().where("provider_key", "yuna_2fa").update({ provider_key: null });
  await slots().where("status_provider_key", "yuna_2fa").update({ status_provider_key: "yuna_check" });

  const packages = () => table(warehouse, "package_products");
  for (const row of await packages().whereNotNull("provider_by_slot").select("id", "provider_by_slot")) {
    const entries = Object.entries(row.provider_by_slot);
    if (!entries.some(([, provider]) => Object.hasOwn(names, provider))) continue;
    const providers = Object.fromEntries(entries.map(([slot, provider]) => [slot, remap(provider)])
      .filter(([slot, provider]) => provider !== "yuna_check" || isLookup(slot)));
    await packages().where("id", row.id).update({ provider_by_slot: providers });
  }

  const configs = () => table(system, "system_configs");
  const slotsConfig = await configs().where("config_key", "OTP_PORTAL_SLOTS_CONFIG").first("config_value");
  if (slotsConfig) {
    const values = JSON.parse(slotsConfig.config_value);
    const check = values.find((slot) => slot.slot_key === "adobe_check");
    const legacy = values.find((slot) => slot.slot_key === "adobe_account");
    const services = (slot) => slot?.assigned_services || [slot?.primary_service_key, slot?.fallback_service_key];
    for (const slot of values) {
      const keys = services(slot).filter(Boolean).map(remap);
      if (slot === check && services(legacy).some((key) => remap(key) === "yuna_check")) keys.push("yuna_check");
      slot.assigned_services = [...new Set(keys.filter((key) => key !== "yuna_check" || isLookup(slot.slot_key)))];
      for (const field of ["primary_service_key", "fallback_service_key"]) {
        if (Object.hasOwn(slot, field)) {
          const key = remap(slot[field]);
          slot[field] = key === "yuna_check" && !isLookup(slot.slot_key) ? null : key;
        }
      }
    }
    await configs().where("config_key", "OTP_PORTAL_SLOTS_CONFIG").update({ config_value: JSON.stringify(values) });
  }
  const display = await configs().where("config_key", "OTP_PROVIDER_DISPLAY_NAMES").first("config_value");
  if (display) {
    const labels = JSON.parse(display.config_value);
    delete labels.yuna_2fa;
    delete labels.yuna_mail;
    labels.yuna_check ||= "Yuna Check";
    labels.yuna_otp ||= "Yuna OTP";
    await configs().where("config_key", "OTP_PROVIDER_DISPLAY_NAMES").update({ config_value: JSON.stringify(labels) });
  }
};

exports.down = async () => {
  throw new Error("Yuna routing migration merges legacy rules and cannot be reversed automatically.");
};
