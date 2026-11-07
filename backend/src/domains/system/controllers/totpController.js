const { generateTotp } = require("../services/totpService");

async function generate(req, res) {
  try {
    res.json(generateTotp(req.body?.secret));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

module.exports = { generate };