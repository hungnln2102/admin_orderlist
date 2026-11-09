/**
 * Persists daily vacant-slot cost logs atomically and returns the finance delta.
 */
const { TABLES, withTransaction } = require("@/db");

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

async function persistDailySlotCostLogs({ date, logs, totalVacantCost }) {
  return withTransaction(async (trx) => {
    const existingLogs = await trx(TABLES.PACKAGE_SLOT_DAILY_LOGS)
      .where("log_date", date)
      .select("vacant_cost");

    const previousTotalVacantCost = existingLogs.reduce(
      (sum, row) => sum + toNumber(row.vacant_cost),
      0
    );

    for (const log of logs) {
      await trx.raw(
        `
        INSERT INTO ${TABLES.PACKAGE_SLOT_DAILY_LOGS} (
          log_date,
          package_product_id,
          import_order_id,
          import_order_code,
          account_username,
          total_slots,
          occupied_slots,
          vacant_slots,
          cost_per_slot_day,
          vacant_cost,
          note,
          metadata,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON CONFLICT (log_date, package_product_id, import_order_id)
        DO UPDATE SET
          total_slots = EXCLUDED.total_slots,
          occupied_slots = EXCLUDED.occupied_slots,
          vacant_slots = EXCLUDED.vacant_slots,
          cost_per_slot_day = EXCLUDED.cost_per_slot_day,
          vacant_cost = EXCLUDED.vacant_cost,
          note = EXCLUDED.note,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
      `,
        [
          log.log_date,
          log.package_product_id,
          log.import_order_id,
          log.import_order_code,
          log.account_username,
          log.total_slots,
          log.occupied_slots,
          log.vacant_slots,
          log.cost_per_slot_day,
          log.vacant_cost,
          log.note,
          log.metadata,
        ]
      );
    }

    const costDelta = Math.round((totalVacantCost - previousTotalVacantCost) * 100) / 100;
    return { previousTotalVacantCost, costDelta };
  });
}

module.exports = { persistDailySlotCostLogs };
