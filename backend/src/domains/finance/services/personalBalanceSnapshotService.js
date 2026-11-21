const { db, TABLES, withTransaction } = require("@/db");
const toNumber = require("./financeNumber");

async function getPersonalBalanceSnapshots() {
  const rows = await db(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
    .orderBy("snapshot_date", "desc")
    .orderBy("id", "desc");

  const snapshots = rows.map((r) => {
    let detail = r.balances_detail;
    if (typeof detail === "string") {
      try {
        detail = JSON.parse(detail);
      } catch {
        detail = [];
      }
    }
    const totalBal = toNumber(r.total_balance);
    const personalBal = r.personal_balance !== undefined && r.personal_balance !== null
      ? toNumber(r.personal_balance)
      : totalBal;
    const shopBal = toNumber(r.shop_balance || 0);

    return {
      id: Number(r.id),
      snapshotDate: r.snapshot_date instanceof Date ? r.snapshot_date.toISOString().slice(0, 10) : String(r.snapshot_date),
      totalBalance: totalBal,
      personalBalance: personalBal,
      shopBalance: shopBal,
      previousBalance: toNumber(r.previous_balance),
      deltaAmount: toNumber(r.delta_amount),
      deltaPercent: toNumber(r.delta_percent),
      balancesDetail: Array.isArray(detail) ? detail : [],
      note: r.note || "",
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });

  let latestComparison = null;
  if (snapshots.length >= 1) {
    const latest = snapshots[0];
    const previous = snapshots.length >= 2 ? snapshots[1] : null;
    const deltaAmount = previous ? (latest.totalBalance - previous.totalBalance) : 0;
    const deltaPercent = (previous && previous.totalBalance > 0)
      ? Number(((deltaAmount / previous.totalBalance) * 100).toFixed(2))
      : 0;

    latestComparison = {
      latest,
      previous,
      deltaAmount,
      deltaPercent,
      isIncrease: deltaAmount >= 0,
    };
  }

  return { snapshots, latestComparison };
}

async function createPersonalBalanceSnapshot(payload) {
  const snapshotDate = payload.snapshotDate || new Date().toISOString().slice(0, 10);
  const items = Array.isArray(payload.items) ? payload.items : [];
  const note = payload.note || "";
  const autoSync = payload.autoSyncCurrentBalance !== false;

  const personalBalance = items.length > 0
    ? items.reduce((sum, item) => sum + toNumber(item.amount), 0)
    : toNumber(payload.personalBalance || 0);

  return await withTransaction(async (trx) => {
    // Tự động lấy số dư ví Shop nếu client không truyền
    let shopBalance = 0;
    if (payload.shopBalance !== undefined && payload.shopBalance !== null) {
      shopBalance = toNumber(payload.shopBalance);
    } else {
      const shopWallets = await trx(TABLES.FINANCIAL_ACCOUNTS)
        .where("is_deleted", false)
        .where("is_active", true)
        .whereNot("account_scope", "PERSONAL")
        .select(trx.raw("COALESCE(SUM(balance), 0)::numeric as total_balance"))
        .first();
      shopBalance = toNumber(shopWallets?.total_balance || 0);
    }

    const totalBalance = personalBalance + shopBalance;

    const prev = await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
      .where("snapshot_date", "<", snapshotDate)
      .orderBy("snapshot_date", "desc")
      .first();

    const previousBalance = prev ? toNumber(prev.total_balance) : 0;
    const deltaAmount = prev ? (totalBalance - previousBalance) : 0;
    const deltaPercent = (prev && previousBalance > 0)
      ? Number(((deltaAmount / previousBalance) * 100).toFixed(2))
      : 0;

    const existing = await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
      .where("snapshot_date", snapshotDate)
      .first();

    let savedRecord = null;
    if (existing) {
      const [updated] = await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
        .where("id", existing.id)
        .update({
          personal_balance: personalBalance,
          shop_balance: shopBalance,
          total_balance: totalBalance,
          previous_balance: previousBalance,
          delta_amount: deltaAmount,
          delta_percent: deltaPercent,
          balances_detail: JSON.stringify(items),
          note,
          updated_at: trx.fn.now(),
        })
        .returning("*");
      savedRecord = updated;
    } else {
      const [created] = await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
        .insert({
          snapshot_date: snapshotDate,
          personal_balance: personalBalance,
          shop_balance: shopBalance,
          total_balance: totalBalance,
          previous_balance: previousBalance,
          delta_amount: deltaAmount,
          delta_percent: deltaPercent,
          balances_detail: JSON.stringify(items),
          note,
        })
        .returning("*");
      savedRecord = created;
    }


    const next = await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
      .where("snapshot_date", ">", snapshotDate)
      .orderBy("snapshot_date", "asc")
      .first();

    if (next) {
      const nextTotal = toNumber(next.total_balance);
      const nextDelta = nextTotal - totalBalance;
      const nextPercent = totalBalance > 0 ? Number(((nextDelta / totalBalance) * 100).toFixed(2)) : 0;
      await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
        .where("id", next.id)
        .update({
          previous_balance: totalBalance,
          delta_amount: nextDelta,
          delta_percent: nextPercent,
          updated_at: trx.fn.now(),
        });
    }

    if (autoSync && items.length > 0) {
      for (const item of items) {
        const itemAmount = toNumber(item.amount);
        if (item.bankAccountId) {
          await trx(TABLES.SHOP_BANK_ACCOUNTS)
            .where("id", item.bankAccountId)
            .where("account_scope", "PERSONAL")
            .update({
              balance: itemAmount,
              updated_at: trx.fn.now(),
            });
        } else if (item.assetId) {
          await trx(TABLES.PERSONAL_SAVINGS)
            .where("id", item.assetId)
            .update({
              amount: itemAmount,
              updated_at: trx.fn.now(),
            });
        }
      }
    }

    return {
      id: Number(savedRecord.id),
      snapshotDate: savedRecord.snapshot_date instanceof Date ? savedRecord.snapshot_date.toISOString().slice(0, 10) : String(savedRecord.snapshot_date),
      totalBalance: toNumber(savedRecord.total_balance),
      personalBalance: toNumber(savedRecord.personal_balance !== undefined ? savedRecord.personal_balance : personalBalance),
      shopBalance: toNumber(savedRecord.shop_balance !== undefined ? savedRecord.shop_balance : shopBalance),
      previousBalance: toNumber(savedRecord.previous_balance),
      deltaAmount: toNumber(savedRecord.delta_amount),
      deltaPercent: toNumber(savedRecord.delta_percent),
      balancesDetail: items,
      note: savedRecord.note || "",
    };
  });
}

async function updatePersonalBalanceSnapshot(id, payload) {
  const existing = await db(TABLES.PERSONAL_BALANCE_SNAPSHOTS).where("id", id).first();
  if (!existing) return null;

  const snapshotDate = payload.snapshotDate || (existing.snapshot_date instanceof Date ? existing.snapshot_date.toISOString().slice(0, 10) : String(existing.snapshot_date));
  const items = Array.isArray(payload.items) ? payload.items : (typeof existing.balances_detail === "string" ? JSON.parse(existing.balances_detail) : existing.balances_detail);
  const note = payload.note !== undefined ? payload.note : existing.note;
  const autoSync = payload.autoSyncCurrentBalance === true;

  const totalBalance = items.reduce((sum, item) => sum + toNumber(item.amount), 0);

  return await withTransaction(async (trx) => {
    const prev = await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
      .where("snapshot_date", "<", snapshotDate)
      .whereNot("id", id)
      .orderBy("snapshot_date", "desc")
      .first();

    const previousBalance = prev ? toNumber(prev.total_balance) : 0;
    const deltaAmount = prev ? (totalBalance - previousBalance) : 0;
    const deltaPercent = (prev && previousBalance > 0)
      ? Number(((deltaAmount / previousBalance) * 100).toFixed(2))
      : 0;

    const [updated] = await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
      .where("id", id)
      .update({
        snapshot_date: snapshotDate,
        total_balance: totalBalance,
        previous_balance: previousBalance,
        delta_amount: deltaAmount,
        delta_percent: deltaPercent,
        balances_detail: JSON.stringify(items),
        note,
        updated_at: trx.fn.now(),
      })
      .returning("*");

    const next = await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
      .where("snapshot_date", ">", snapshotDate)
      .whereNot("id", id)
      .orderBy("snapshot_date", "asc")
      .first();

    if (next) {
      const nextTotal = toNumber(next.total_balance);
      const nextDelta = nextTotal - totalBalance;
      const nextPercent = totalBalance > 0 ? Number(((nextDelta / totalBalance) * 100).toFixed(2)) : 0;
      await trx(TABLES.PERSONAL_BALANCE_SNAPSHOTS)
        .where("id", next.id)
        .update({
          previous_balance: totalBalance,
          delta_amount: nextDelta,
          delta_percent: nextPercent,
          updated_at: trx.fn.now(),
        });
    }

    if (autoSync && items.length > 0) {
      for (const item of items) {
        const itemAmount = toNumber(item.amount);
        if (item.bankAccountId) {
          await trx(TABLES.SHOP_BANK_ACCOUNTS)
            .where("id", item.bankAccountId)
            .where("account_scope", "PERSONAL")
            .update({
              balance: itemAmount,
              updated_at: trx.fn.now(),
            });
        } else if (item.assetId) {
          await trx(TABLES.PERSONAL_SAVINGS)
            .where("id", item.assetId)
            .update({
              amount: itemAmount,
              updated_at: trx.fn.now(),
            });
        }
      }
    }

    return {
      id: Number(updated.id),
      snapshotDate: updated.snapshot_date instanceof Date ? updated.snapshot_date.toISOString().slice(0, 10) : String(updated.snapshot_date),
      totalBalance: toNumber(updated.total_balance),
      previousBalance: toNumber(updated.previous_balance),
      deltaAmount: toNumber(updated.delta_amount),
      deltaPercent: toNumber(updated.delta_percent),
      balancesDetail: items,
      note: updated.note || "",
    };
  });
}

async function deletePersonalBalanceSnapshot(id) {
  return await db(TABLES.PERSONAL_BALANCE_SNAPSHOTS).where("id", id).del();
}

// --- SAVING GOALS & FUND (MILESTONE TARGET LADDER) ---

module.exports = {
  getPersonalBalanceSnapshots,
  createPersonalBalanceSnapshot,
  updatePersonalBalanceSnapshot,
  deletePersonalBalanceSnapshot,
};
