/**
 * VPBank Mailbox Controller
 * 
 * Endpoints cho cấu hình Mailbox VPBank, bắt tay test kết nối socket,
 * và trigger reload worker.
 */

const {
  getMaskedConfig,
  saveMailboxConfig,
  testImapConnection,
} = require("../services/vpbankMailboxConfigService");
const { reloadWorker } = require("../workers/vpbankImapWorker");

async function getMailboxConfigHandler(req, res) {
  try {
    const config = await getMaskedConfig();
    return res.json({ success: true, data: config });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function updateMailboxConfigHandler(req, res) {
  try {
    const payload = req.body || {};
    const updated = await saveMailboxConfig(payload, {
      onConfigChanged: () => {
        void reloadWorker();
      },
    });
    return res.json({
      success: true,
      message: "Lưu cấu hình Mailbox thành công!",
      data: updated,
    });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
}

async function testConnectionHandler(req, res) {
  try {
    const payload = req.body || {};
    const result = await testImapConnection(payload);
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
}

module.exports = {
  getMailboxConfigHandler,
  testConnectionHandler,
  updateMailboxConfigHandler,
};

