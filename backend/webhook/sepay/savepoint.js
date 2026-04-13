/**
 * Chạy fn trong SAVEPOINT để lỗi SQL chỉ hủy phần lồng ghép,
 * không làm "abort" cả transaction ngoài (tránh lỗi
 * "current transaction is aborted, commands ignored until end of transaction block").
 */
async function withSavepoint(client, savepointId, fn) {
  const sp = `sp_${String(savepointId).replace(/[^a-zA-Z0-9_]/g, "_")}`;
  await client.query(`SAVEPOINT ${sp}`);
  try {
    const out = await fn();
    await client.query(`RELEASE SAVEPOINT ${sp}`);
    return out;
  } catch (err) {
    await client.query(`ROLLBACK TO SAVEPOINT ${sp}`);
    await client.query(`RELEASE SAVEPOINT ${sp}`);
    throw err;
  }
}

module.exports = { withSavepoint };
