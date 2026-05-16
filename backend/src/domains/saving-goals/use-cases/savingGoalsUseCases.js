const { db, withTransaction } = require("../../../db");
const repository = require("../repositories/savingGoalsRepository");

const toUserError = (statusCode, userMessage) => {
  const error = new Error(userMessage);
  error.statusCode = statusCode;
  error.userMessage = userMessage;
  return error;
};

const normalizePriority = (rawPriority, maxPriority) => {
  const parsed = Number(rawPriority);
  if (!Number.isFinite(parsed)) {
    throw toUserError(400, "Priority phải là số.");
  }
  const asInt = Math.trunc(parsed);
  if (asInt < 1) {
    throw toUserError(400, "Priority phải lớn hơn 0.");
  }
  return Math.max(1, Math.min(asInt, maxPriority));
};

const listSavingGoals = async () => {
  const goals = await repository.listGoals(db);
  const totalTarget = goals.reduce((sum, goal) => sum + (Number(goal.target_amount) || 0), 0);
  return { goals, totalTarget };
};

const createSavingGoal = async ({ goal_name, target_amount }) =>
  withTransaction(async (trx) => {
    await repository.lockPriorityRows(trx);
    const maxPriority = await repository.getMaxPriority(trx);
    return repository.insertGoal(trx, {
      goal_name: String(goal_name || "").trim(),
      target_amount: Number(target_amount),
      priority: maxPriority + 1,
    });
  });

const updateSavingGoal = async ({ goalId, goal_name, target_amount }) => {
  const updateData = {};
  if (goal_name !== undefined) {
    const normalizedGoalName = String(goal_name).trim();
    if (!normalizedGoalName) {
      throw toUserError(400, "Tên mục tiêu không được để trống.");
    }
    updateData.goal_name = normalizedGoalName;
  }
  if (target_amount !== undefined) {
    const amount = Number(target_amount);
    if (!amount || amount <= 0) {
      throw toUserError(400, "Số tiền mục tiêu phải lớn hơn 0.");
    }
    updateData.target_amount = amount;
  }
  if (Object.keys(updateData).length === 0) {
    throw toUserError(400, "Không có dữ liệu để cập nhật.");
  }
  return repository.updateGoalById(db, goalId, updateData);
};

const deleteSavingGoal = async ({ goalId }) =>
  withTransaction(async (trx) => {
    await repository.lockPriorityRows(trx);
    const goal = await repository.findGoalByIdForUpdate(trx, goalId);
    if (!goal) {
      return null;
    }
    await repository.deleteGoalById(trx, goalId);
    await repository.decrementPrioritiesAbove(trx, goal.priority);
    return true;
  });

const reorderSavingGoal = async ({ goalId, requestedPriority }) =>
  withTransaction(async (trx) => {
    await repository.lockPriorityRows(trx);
    const goal = await repository.findGoalByIdForUpdate(trx, goalId);
    if (!goal) {
      return null;
    }
    const totalGoals = await repository.countGoals(trx);
    const targetPriority = normalizePriority(requestedPriority, totalGoals);
    const currentPriority = Number(goal.priority) || 1;

    if (targetPriority === currentPriority) {
      return repository.toGoalResponse(goal);
    }

    await repository.shiftPrioritiesForReorder(trx, {
      goalId,
      fromPriority: currentPriority,
      toPriority: targetPriority,
    });
    return repository.updateGoalPriority(trx, goalId, targetPriority);
  });

module.exports = {
  listSavingGoals,
  createSavingGoal,
  updateSavingGoal,
  deleteSavingGoal,
  reorderSavingGoal,
};
