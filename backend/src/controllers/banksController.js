const { db } = require("../db");
const { DB_SCHEMA, getDefinition, tableName } = require("../config/dbSchema");

const listBanks = async (_req, res) => {
  try {
    const bankDef = getDefinition("BANK_LIST");
    const bankTable = tableName(DB_SCHEMA.BANK_LIST.TABLE);
    const { bin, bankName } = bankDef.columns;
    const rows = await db(bankTable)
      .select(bin, bankName)
      .orderBy(bankName, "asc");
    res.json(rows || []);
  } catch (error) {
    console.error("[banks] Query failed:", error);
    res.status(500).json({ error: "Unable to load banks" });
  }
};

module.exports = {
  listBanks,
};
