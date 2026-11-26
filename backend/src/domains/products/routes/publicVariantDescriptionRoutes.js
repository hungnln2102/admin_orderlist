const express = require("express");
const { getPublicDescription } = require("../services/variantDescriptionEditorialService");

const router = express.Router();

router.get("/:displayName", async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const description = await getPublicDescription(req.params.displayName);
    return description ? res.json(description) : res.status(404).end();
  } catch (error) {
    console.error("[Products] Public description read failed", { name: error.name, code: error.code });
    return res.status(500).end();
  }
});

module.exports = router;
