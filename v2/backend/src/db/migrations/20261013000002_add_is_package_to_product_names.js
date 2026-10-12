/**
 * Migration 20261013000002: Add is_package flag to warehouse.product_names
 * Indicates whether the product / service name is managed in Package Products (Kho Gói Sản Phẩm).
 */

exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE warehouse.product_names
    ADD COLUMN IF NOT EXISTS is_package BOOLEAN DEFAULT false;
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE warehouse.product_names
    DROP COLUMN IF EXISTS is_package;
  `);
};
