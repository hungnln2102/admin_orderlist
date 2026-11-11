const STANDARD_PACKAGE_CATEGORIES = [
  { name: "Adobe", product_id: 1 },
  { name: "GoogleOne", product_id: 3 },
  { name: "Canva", product_id: 17 },
  { name: "Netflix", product_id: 29 },
  { name: "Youtube", product_id: 44 },
  { name: "Gemini", product_id: 94 },
];

async function ensureStandardPackageCategories(db, tableName) {
  const createdIds = [];
  const existing = await db(tableName).select("id", "name");
  const existingNames = new Set(existing.map((row) => String(row.name).toLowerCase()));

  for (const category of STANDARD_PACKAGE_CATEGORIES) {
    if (existingNames.has(category.name.toLowerCase())) continue;
    const [created] = await db(tableName)
      .insert({
        name: category.name,
        category: category.name,
        product_id: category.product_id,
        is_active: true,
        is_package: true,
        requires_storage: false,
      })
      .returning("id");
    createdIds.push(created.id);
  }

  return async function cleanupStandardPackageCategories() {
    if (createdIds.length) await db(tableName).whereIn("id", createdIds).del();
  };
}

async function ensureYoutubeLoginUrl(db, tableName) {
  const rows = await db(tableName)
    .whereRaw("LOWER(name) LIKE ?", ["%youtube%"])
    .select("id", "login_url");
  const originalRows = rows.map((row) => ({ id: row.id, login_url: row.login_url }));

  if (rows.length === 0) {
    const [created] = await db(tableName)
      .insert({ name: "Youtube Premium", category: "Youtube", login_url: "https://accounts.google.com" })
      .returning("id");
    return async function cleanupYoutubeLoginUrl() {
      await db(tableName).where("id", created.id).del();
    };
  }

  await db(tableName)
    .whereIn("id", rows.map((row) => row.id))
    .update({ login_url: "https://accounts.google.com" });

  return async function cleanupYoutubeLoginUrl() {
    for (const row of originalRows) {
      await db(tableName).where("id", row.id).update({ login_url: row.login_url });
    }
  };
}

module.exports = { STANDARD_PACKAGE_CATEGORIES, ensureStandardPackageCategories, ensureYoutubeLoginUrl };
