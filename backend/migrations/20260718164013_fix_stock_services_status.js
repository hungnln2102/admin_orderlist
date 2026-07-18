/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Update all 'AVAILABLE' to 'Tồn Kho'
  await knex.withSchema("warehouse").table("stock_services").where("status", "AVAILABLE").update({ status: "Tồn Kho" });

  // 2. Identify services that are currently assigned to a package_product
  // And update their status to 'Đang Sử Dụng'
  const usedServices = await knex("warehouse.stock_services")
    .join("product.package_product", "warehouse.stock_services.id", "product.package_product.stock_service_id")
    .select("warehouse.stock_services.id")
    .distinct();

  const usedServiceIds = usedServices.map(s => s.id);

  if (usedServiceIds.length > 0) {
    await knex
      .withSchema("warehouse")
      .table("stock_services")
      .whereIn("id", usedServiceIds)
      .update({ status: "Đang Sử Dụng" });
  }

  // 3. Optional: Map other legacy statuses if there were any 'Tồn'
  await knex.withSchema("warehouse").table("stock_services").where("status", "Tồn").update({ status: "Tồn Kho" });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Revert back to AVAILABLE if needed, but not strictly necessary since Tồn Kho is the correct domain language
};
