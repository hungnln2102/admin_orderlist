const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require("../../../config/dbSchema");

const SAVING_GOALS_TABLE = tableName(FINANCE_SCHEMA.SAVING_GOALS.TABLE, SCHEMA_FINANCE);
const COLS = FINANCE_SCHEMA.SAVING_GOALS.COLS;

const GOAL_SELECT_COLUMNS = [
  `${COLS.ID} as id`,
  `${COLS.GOAL_NAME} as goal_name`,
  `${COLS.TARGET_AMOUNT} as target_amount`,
  `${COLS.PRIORITY} as priority`,
  `${COLS.CREATED_AT} as created_at`,
];

const GOAL_UPDATE_SELECT_COLUMNS = [
  `${COLS.ID} as id`,
  `${COLS.GOAL_NAME} as goal_name`,
  `${COLS.TARGET_AMOUNT} as target_amount`,
  `${COLS.CREATED_AT} as created_at`,
];

const toGoalResponse = (row) => ({
  id: row.id,
  goal_name: row.goal_name,
  target_amount: row.target_amount,
  priority: row.priority,
  created_at: row.created_at,
});

const lockPriorityRows = async (trx) => {
  await trx(SAVING_GOALS_TABLE)
    .select(COLS.ID)
    .orderBy(COLS.PRIORITY, "asc")
    .forUpdate();
};

const listGoals = async (conn) =>
  conn(SAVING_GOALS_TABLE)
    .select(GOAL_SELECT_COLUMNS)
    .orderBy(COLS.PRIORITY, "asc")
    .orderBy(COLS.CREATED_AT, "asc");

const getMaxPriority = async (trx) => {
  const row = await trx(SAVING_GOALS_TABLE)
    .max(`${COLS.PRIORITY} as maxPriority`)
    .first();
  return Number(row?.maxPriority || 0);
};

const insertGoal = async (trx, { goal_name, target_amount, priority }) => {
  const [created] = await trx(SAVING_GOALS_TABLE)
    .insert({
      [COLS.GOAL_NAME]: goal_name,
      [COLS.TARGET_AMOUNT]: target_amount,
      [COLS.PRIORITY]: priority,
    })
    .returning(GOAL_SELECT_COLUMNS);
  return created;
};

const updateGoalById = async (conn, goalId, updateData) => {
  const payload = {};
  if (updateData.goal_name !== undefined) payload[COLS.GOAL_NAME] = updateData.goal_name;
  if (updateData.target_amount !== undefined) payload[COLS.TARGET_AMOUNT] = updateData.target_amount;
  const [updated] = await conn(SAVING_GOALS_TABLE)
    .where(COLS.ID, goalId)
    .update(payload)
    .returning(GOAL_UPDATE_SELECT_COLUMNS);
  return updated || null;
};

const findGoalByIdForUpdate = async (trx, goalId) => {
  const row = await trx(SAVING_GOALS_TABLE)
    .where(COLS.ID, goalId)
    .first(
      `${COLS.ID} as id`,
      `${COLS.GOAL_NAME} as goal_name`,
      `${COLS.TARGET_AMOUNT} as target_amount`,
      `${COLS.PRIORITY} as priority`,
      `${COLS.CREATED_AT} as created_at`
    )
    .forUpdate();
  return row || null;
};

const deleteGoalById = async (trx, goalId) =>
  trx(SAVING_GOALS_TABLE)
    .where(COLS.ID, goalId)
    .delete();

const decrementPrioritiesAbove = async (trx, deletedPriority) =>
  trx(SAVING_GOALS_TABLE)
    .where(COLS.PRIORITY, ">", deletedPriority)
    .decrement(COLS.PRIORITY, 1);

const countGoals = async (trx) => {
  const row = await trx(SAVING_GOALS_TABLE)
    .count(`${COLS.ID} as count`)
    .first();
  return Number(row?.count || 0);
};

const shiftPrioritiesForReorder = async (trx, { goalId, fromPriority, toPriority }) => {
  if (toPriority < fromPriority) {
    await trx(SAVING_GOALS_TABLE)
      .whereNot(COLS.ID, goalId)
      .andWhere(COLS.PRIORITY, ">=", toPriority)
      .andWhere(COLS.PRIORITY, "<", fromPriority)
      .increment(COLS.PRIORITY, 1);
    return;
  }

  await trx(SAVING_GOALS_TABLE)
    .whereNot(COLS.ID, goalId)
    .andWhere(COLS.PRIORITY, ">", fromPriority)
    .andWhere(COLS.PRIORITY, "<=", toPriority)
    .decrement(COLS.PRIORITY, 1);
};

const updateGoalPriority = async (trx, goalId, priority) => {
  const [updated] = await trx(SAVING_GOALS_TABLE)
    .where(COLS.ID, goalId)
    .update({ [COLS.PRIORITY]: priority })
    .returning(GOAL_SELECT_COLUMNS);
  return updated || null;
};

module.exports = {
  toGoalResponse,
  lockPriorityRows,
  listGoals,
  getMaxPriority,
  insertGoal,
  updateGoalById,
  findGoalByIdForUpdate,
  deleteGoalById,
  decrementPrioritiesAbove,
  countGoals,
  shiftPrioritiesForReorder,
  updateGoalPriority,
};
