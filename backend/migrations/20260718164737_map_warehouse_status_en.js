/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Translate status to English
  await knex.withSchema("warehouse").table("stock_services").where("status", "Đang Sử Dụng").update({ status: "IN_USE" });
  await knex.withSchema("warehouse").table("stock_services").whereIn("status", ["Tồn Kho", "Tồn"]).update({ status: "AVAILABLE" });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Revert back
  await knex.withSchema("warehouse").table("stock_services").where("status", "IN_USE").update({ status: "Đang Sử Dụng" });
  await knex.withSchema("warehouse").table("stock_services").where("status", "AVAILABLE").update({ status: "Tồn Kho" });
};
