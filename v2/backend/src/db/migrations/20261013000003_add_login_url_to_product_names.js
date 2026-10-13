/**
 * Migration 20261013000003: Add login_url to warehouse.product_names
 */

exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE warehouse.product_names
    ADD COLUMN IF NOT EXISTS login_url VARCHAR(500) NULL;
  `);

  // Update default login URLs for common services
  const defaultUrls = [
    { namePattern: "%youtube%", url: "https://accounts.google.com" },
    { namePattern: "%google%", url: "https://accounts.google.com" },
    { namePattern: "%gemini%", url: "https://gemini.google.com" },
    { namePattern: "%netflix%", url: "https://www.netflix.com/login" },
    { namePattern: "%adobe%", url: "https://account.adobe.com" },
    { namePattern: "%canva%", url: "https://www.canva.com/login" },
    { namePattern: "%spotify%", url: "https://accounts.spotify.com/login" },
    { namePattern: "%microsoft%", url: "https://login.microsoftonline.com" },
    { namePattern: "%office%", url: "https://login.microsoftonline.com" },
    { namePattern: "%chatgpt%", url: "https://chatgpt.com/auth/login" },
    { namePattern: "%mail%", url: "https://mail.google.com" },
  ];

  for (const item of defaultUrls) {
    await knex.raw(
      `UPDATE warehouse.product_names SET login_url = ? WHERE LOWER(name) LIKE ? AND (login_url IS NULL OR login_url = '');`,
      [item.url, item.namePattern]
    );
  }
};

exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE warehouse.product_names
    DROP COLUMN IF EXISTS login_url;
  `);
};
