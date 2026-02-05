const { db } = require("../../db");
const { normalizeTextInput } = require("../../utils/normalizers");
const { categoryCols, TABLES } = require("../ProductsController/constants");
const logger = require("../../utils/logger");

const listCategories = async (_req, res) => {
  try {
    // Use Knex query builder instead of raw SQL for better maintainability
    const rows = await db(TABLES.category)
      .select("*")
      .orderBy(categoryCols.name, "asc");
    
    const categories = rows
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
    
    res.json(categories);
  } catch (error) {
    logger.error("Query failed (GET /api/categories)", { error: error.message, stack: error.stack });
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
    logger.error("Insert failed (POST /api/categories)", { error: error.message, stack: error.stack });
    return res.status(500).json({ error: "Cannot create category." });
  }
};

const updateCategory = async (req, res) => {
  const id = Number(req.params?.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid category ID." });
  }

  const name = normalizeTextInput(req.body?.name);
  const color = normalizeTextInput(req.body?.color) || null;

  if (!name && color === null) {
    return res.status(400).json({ error: "At least one field (name or color) is required." });
  }

  try {
    const updatePayload = {};
    if (name) {
      updatePayload[categoryCols.name] = name;
    }
    if (categoryCols.color) {
      updatePayload[categoryCols.color] = color;
    }

    const returningCols = [categoryCols.id, categoryCols.name];
    if (categoryCols.color) {
      returningCols.push(categoryCols.color);
    }

    const result = await db(TABLES.category)
      .where(categoryCols.id, id)
      .update(updatePayload)
      .returning(returningCols);

    if (!result || result.length === 0) {
      return res.status(404).json({ error: "Category not found." });
    }

    const row = result[0];
    const updated = {
      id: Number(row[categoryCols.id] ?? row.id),
      name: String(row[categoryCols.name] ?? row.name ?? "").trim(),
      color: row[categoryCols.color] ?? row.color ?? null,
    };

    return res.json(updated);
  } catch (error) {
    logger.error(`Update failed (PUT /api/categories/${id})`, { error: error.message, stack: error.stack });
    return res.status(500).json({ error: "Cannot update category." });
  }
};

const deleteCategory = async (req, res) => {
  const id = Number(req.params?.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid category ID." });
  }

  try {
    const deleted = await db(TABLES.category)
      .where(categoryCols.id, id)
      .del();

    if (deleted === 0) {
      return res.status(404).json({ error: "Category not found." });
    }

    return res.status(204).send();
  } catch (error) {
    logger.error(`Delete failed (DELETE /api/categories/${id})`, { error: error.message, stack: error.stack });
    return res.status(500).json({ error: "Cannot delete category." });
  }
};

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
