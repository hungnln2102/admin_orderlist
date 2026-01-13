const { db } = require("../../db");
const { quoteIdent } = require("../../utils/sql");
const { normalizeTextInput } = require("../../utils/normalizers");
const { categoryCols, TABLES } = require("../ProductsController/constants");

const listCategories = async (_req, res) => {
  try {
    const query = `
      SELECT *
      FROM ${TABLES.category}
      ORDER BY ${quoteIdent(categoryCols.name)} ASC;
    `;
    const result = await db.raw(query);
    const rows = (result.rows || [])
      .map((row) => {
        const id = Number(row[categoryCols.id] ?? row.id);
        const name = row[categoryCols.name] ?? row.name ?? "";
        const color = row.color ?? row[categoryCols.color] ?? null;
        return {
          id,
          name: String(name || "").trim(),
          color: color || null,
        };
      })
      .filter((row) => Number.isFinite(row.id) && row.id > 0 && row.name);
    res.json(rows);
  } catch (error) {
    console.error("Query failed (GET /api/categories):", error);
    res.status(500).json({ error: "Cannot fetch categories." });
  }
};

const createCategory = async (req, res) => {
  const name = normalizeTextInput(req.body?.name);
  const color = normalizeTextInput(req.body?.color) || null;

  if (!name) {
    return res.status(400).json({ error: "Category name is required." });
  }

  try {
    const insertPayload = {
      [categoryCols.name]: name,
    };
    if (categoryCols.color) {
      insertPayload[categoryCols.color] = color;
    }

    const returningCols = [categoryCols.id, categoryCols.name];
    if (categoryCols.color) {
      returningCols.push(categoryCols.color);
    }

    const result = await db(TABLES.category)
      .insert(insertPayload)
      .returning(returningCols);
    const row = result?.[0] || null;
    const id = Number(row?.[categoryCols.id] ?? row?.id);
    const created = {
      id: Number.isFinite(id) ? id : null,
      name: String(row?.[categoryCols.name] ?? row?.name ?? name).trim(),
      color: row?.[categoryCols.color] ?? row?.color ?? color ?? null,
    };
    return res.status(201).json(created);
  } catch (error) {
    console.error("Insert failed (POST /api/categories):", error);
    return res.status(500).json({ error: "Cannot create category." });
  }
};

module.exports = {
  listCategories,
  createCategory,
};
