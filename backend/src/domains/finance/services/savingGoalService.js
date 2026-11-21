const { db, TABLES, withTransaction } = require("@/db");
const toNumber = require("./financeNumber");

async function getSavingGoalsOverview() {
  const latestLedger = await db(TABLES.SAVING_FUND_LEDGER)
    .orderBy("id", "desc")
    .first();
  const currentFund = latestLedger ? toNumber(latestLedger.balance_after) : 0;

  const activeRows = await db(TABLES.SAVING_GOALS)
    .where("status", "ACTIVE")
    .orderBy("target_amount", "asc");

  const completedRows = await db(TABLES.SAVING_GOALS)
    .where("status", "COMPLETED")
    .orderBy("updated_at", "desc");

  let nextFocusAssigned = false;
  const activeGoals = activeRows.map((g) => {
    const target = toNumber(g.target_amount);
    const isReached = currentFund >= target;
    const progressPercent = target > 0 ? Math.min(100, Math.round((currentFund / target) * 100)) : 100;
    const missingAmount = Math.max(0, target - currentFund);

    let isNextFocus = false;
    if (!isReached && !nextFocusAssigned) {
      isNextFocus = true;
      nextFocusAssigned = true;
    }

    return {
      id: Number(g.id),
      name: g.name,
      targetAmount: target,
      status: g.status,
      note: g.note || "",
      isReached,
      isNextFocus,
      progressPercent,
      missingAmount,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
    };
  });

  const completedGoals = completedRows.map((g) => ({
    id: Number(g.id),
    name: g.name,
    targetAmount: toNumber(g.target_amount),
    status: g.status,
    note: g.note || "",
    isReached: true,
    isNextFocus: false,
    progressPercent: 100,
    missingAmount: 0,
    createdAt: g.created_at,
    updatedAt: g.updated_at,
  }));

  const recentTransactions = await db(TABLES.SAVING_FUND_LEDGER)
    .leftJoin(TABLES.SAVING_GOALS, `${TABLES.SAVING_FUND_LEDGER}.goal_id`, `${TABLES.SAVING_GOALS}.id`)
    .select(
      `${TABLES.SAVING_FUND_LEDGER}.*`,
      `${TABLES.SAVING_GOALS}.name as goal_name`
    )
    .orderBy(`${TABLES.SAVING_FUND_LEDGER}.id`, "desc")
    .limit(15);

  const transactions = recentTransactions.map((t) => ({
    id: Number(t.id),
    actionType: t.action_type,
    amount: toNumber(t.amount),
    balanceBefore: toNumber(t.balance_before),
    balanceAfter: toNumber(t.balance_after),
    goalId: t.goal_id ? Number(t.goal_id) : null,
    goalName: t.goal_name || null,
    note: t.note || "",
    createdAt: t.created_at,
  }));

  return {
    currentFund,
    totalGoalsCount: activeGoals.length + completedGoals.length,
    activeGoalsCount: activeGoals.length,
    reachedGoalsCount: activeGoals.filter((g) => g.isReached).length,
    completedGoalsCount: completedGoals.length,
    activeGoals,
    completedGoals,
    recentTransactions: transactions,
  };
}

async function createSavingGoal(payload) {
  const name = String(payload.name || "").trim();
  if (!name) throw new Error("Vui lòng nhập tên mục tiêu");
  const targetAmount = toNumber(payload.targetAmount || payload.target_amount);
  if (targetAmount <= 0) throw new Error("Số tiền mục tiêu phải lớn hơn 0");

  const [created] = await db(TABLES.SAVING_GOALS)
    .insert({
      name,
      target_amount: targetAmount,
      status: "ACTIVE",
      note: payload.note || "",
    })
    .returning("*");

  return {
    id: Number(created.id),
    name: created.name,
    targetAmount: toNumber(created.target_amount),
    status: created.status,
    note: created.note || "",
    createdAt: created.created_at,
  };
}

async function updateSavingGoal(id, payload) {
  const updateData = { updated_at: db.fn.now() };
  if (payload.name !== undefined) {
    const name = String(payload.name).trim();
    if (!name) throw new Error("Tên mục tiêu không được rỗng");
    updateData.name = name;
  }
  if (payload.targetAmount !== undefined || payload.target_amount !== undefined) {
    const targetAmount = toNumber(payload.targetAmount ?? payload.target_amount);
    if (targetAmount <= 0) throw new Error("Số tiền mục tiêu phải lớn hơn 0");
    updateData.target_amount = targetAmount;
  }
  if (payload.note !== undefined) updateData.note = payload.note;
  if (payload.status !== undefined) updateData.status = payload.status;

  const [updated] = await db(TABLES.SAVING_GOALS)
    .where("id", id)
    .update(updateData)
    .returning("*");

  if (!updated) return null;

  return {
    id: Number(updated.id),
    name: updated.name,
    targetAmount: toNumber(updated.target_amount),
    status: updated.status,
    note: updated.note || "",
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

async function deleteSavingGoal(id) {
  return await db(TABLES.SAVING_GOALS).where("id", id).del();
}

async function executeSavingGoal(id, payload = {}) {
  const { deductFund, note } = payload;
  return await withTransaction(async (trx) => {
    const goal = await trx(TABLES.SAVING_GOALS).where("id", id).first();
    if (!goal) throw new Error("Không tìm thấy mục tiêu");

    let newBalance = null;

    if (deductFund) {
      const latest = await trx(TABLES.SAVING_FUND_LEDGER)
        .orderBy("id", "desc")
        .forUpdate()
        .first();
      const balanceBefore = latest ? toNumber(latest.balance_after) : 0;
      const targetAmount = toNumber(goal.target_amount);

      if (targetAmount > balanceBefore) {
        throw new Error(`Số dư quỹ hiện tại (${balanceBefore.toLocaleString("vi-VN")} ₫) không đủ để thực hiện mục tiêu này (${targetAmount.toLocaleString("vi-VN")} ₫)`);
      }

      const balanceAfter = balanceBefore - targetAmount;
      await trx(TABLES.SAVING_FUND_LEDGER).insert({
        action_type: "EXECUTE_GOAL",
        amount: targetAmount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        goal_id: id,
        note: note || `Thực hiện mục tiêu: ${goal.name}`,
      });
      newBalance = balanceAfter;
    }

    const [updated] = await trx(TABLES.SAVING_GOALS)
      .where("id", id)
      .update({
        status: "COMPLETED",
        updated_at: trx.fn.now(),
      })
      .returning("*");

    return {
      goal: {
        id: Number(updated.id),
        name: updated.name,
        targetAmount: toNumber(updated.target_amount),
        status: updated.status,
        note: updated.note || "",
      },
      deducted: Boolean(deductFund),
      newBalance,
    };
  });
}

async function depositSavingFund(payload) {
  const amount = toNumber(payload.amount);
  if (amount <= 0) throw new Error("Số tiền nạp phải lớn hơn 0");

  return await withTransaction(async (trx) => {
    const latest = await trx(TABLES.SAVING_FUND_LEDGER)
      .orderBy("id", "desc")
      .forUpdate()
      .first();
    const balanceBefore = latest ? toNumber(latest.balance_after) : 0;
    const balanceAfter = balanceBefore + amount;

    const [created] = await trx(TABLES.SAVING_FUND_LEDGER)
      .insert({
        action_type: "DEPOSIT",
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        goal_id: payload.goalId ? Number(payload.goalId) : null,
        note: payload.note || "Nạp tiền vào quỹ tích lũy mục tiêu",
      })
      .returning("*");

    return {
      transactionId: Number(created.id),
      amount,
      balanceBefore,
      balanceAfter,
    };
  });
}

async function withdrawSavingFund(payload) {
  const amount = toNumber(payload.amount);
  if (amount <= 0) throw new Error("Số tiền rút phải lớn hơn 0");

  return await withTransaction(async (trx) => {
    const latest = await trx(TABLES.SAVING_FUND_LEDGER)
      .orderBy("id", "desc")
      .forUpdate()
      .first();
    const balanceBefore = latest ? toNumber(latest.balance_after) : 0;

    if (amount > balanceBefore) {
      throw new Error(`Số dư quỹ không đủ (${balanceBefore.toLocaleString("vi-VN")} ₫) để rút ${amount.toLocaleString("vi-VN")} ₫`);
    }

    const balanceAfter = balanceBefore - amount;

    const [created] = await trx(TABLES.SAVING_FUND_LEDGER)
      .insert({
        action_type: "WITHDRAW",
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        goal_id: payload.goalId ? Number(payload.goalId) : null,
        note: payload.note || "Trích rút tiền từ quỹ tích lũy mục tiêu",
      })
      .returning("*");

    return {
      transactionId: Number(created.id),
      amount,
      balanceBefore,
      balanceAfter,
    };
  });
}

module.exports = {
  getSavingGoalsOverview,
  createSavingGoal,
  updateSavingGoal,
  deleteSavingGoal,
  executeSavingGoal,
  depositSavingFund,
  withdrawSavingFund,
};
