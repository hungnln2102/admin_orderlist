const express = require('express');
const router = express.Router();
const { db } = require('../../db');
const { FINANCE_SCHEMA, SCHEMA_FINANCE, tableName } = require('../../config/dbSchema');
const logger = require('../../utils/logger');

const SAVING_GOALS_TABLE = tableName(FINANCE_SCHEMA.SAVING_GOALS.TABLE, SCHEMA_FINANCE);
const COLS = FINANCE_SCHEMA.SAVING_GOALS.COLS;

/**
 * GET /api/saving-goals
 * Fetch all saving goals with total target amount
 */
router.get('/', async (req, res) => {
  try {
    const goals = await db(SAVING_GOALS_TABLE)
      .select(
        `${COLS.ID} as id`,
        `${COLS.GOAL_NAME} as goal_name`,
        `${COLS.TARGET_AMOUNT} as target_amount`,
        `${COLS.PRIORITY} as priority`,
        `${COLS.CREATED_AT} as created_at`
      )
      .orderBy(COLS.PRIORITY, 'asc')
      .orderBy(COLS.CREATED_AT, 'asc');

    // Calculate total target amount
    const totalTarget = goals.reduce((sum, goal) => {
      return sum + (Number(goal.target_amount) || 0);
    }, 0);

    res.json({
      goals,
      totalTarget,
    });
  } catch (error) {
    logger.error('Error fetching saving goals', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Không thể tải danh sách mục tiêu.' });
  }
});

/**
 * POST /api/saving-goals
 * Create a new saving goal
 */
router.post('/', async (req, res) => {
  try {
    const { goal_name, target_amount } = req.body;

    // Validation
    if (!goal_name || !goal_name.trim()) {
      return res.status(400).json({ error: 'Tên mục tiêu không được để trống.' });
    }

    const amount = Number(target_amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Số tiền mục tiêu phải lớn hơn 0.' });
    }

    // Get max priority to assign new goal
    const maxPriorityResult = await db(SAVING_GOALS_TABLE)
      .max(`${COLS.PRIORITY} as maxPriority`)
      .first();
    
    const maxPriority = maxPriorityResult?.maxPriority || 0;
    const newPriority = maxPriority + 1;

    const [newGoal] = await db(SAVING_GOALS_TABLE)
      .insert({
        [COLS.GOAL_NAME]: goal_name.trim(),
        [COLS.TARGET_AMOUNT]: amount,
        [COLS.PRIORITY]: newPriority,
      })
      .returning([
        `${COLS.ID} as id`,
        `${COLS.GOAL_NAME} as goal_name`,
        `${COLS.TARGET_AMOUNT} as target_amount`,
        `${COLS.PRIORITY} as priority`,
        `${COLS.CREATED_AT} as created_at`,
      ]);

    res.status(201).json(newGoal);
  } catch (error) {
    logger.error('Error creating saving goal', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Không thể tạo mục tiêu mới.' });
  }
});

/**
 * PUT /api/saving-goals/:id
 * Update an existing saving goal
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { goal_name, target_amount } = req.body;

    const goalId = Number(id);
    if (!goalId) {
      return res.status(400).json({ error: 'ID không hợp lệ.' });
    }

    const updateData = {};

    if (goal_name !== undefined) {
      if (!goal_name.trim()) {
        return res.status(400).json({ error: 'Tên mục tiêu không được để trống.' });
      }
      updateData[COLS.GOAL_NAME] = goal_name.trim();
    }

    if (target_amount !== undefined) {
      const amount = Number(target_amount);
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Số tiền mục tiêu phải lớn hơn 0.' });
      }
      updateData[COLS.TARGET_AMOUNT] = amount;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Không có dữ liệu để cập nhật.' });
    }

    const [updatedGoal] = await db(SAVING_GOALS_TABLE)
      .where(COLS.ID, goalId)
      .update(updateData)
      .returning([
        `${COLS.ID} as id`,
        `${COLS.GOAL_NAME} as goal_name`,
        `${COLS.TARGET_AMOUNT} as target_amount`,
        `${COLS.CREATED_AT} as created_at`,
      ]);

    if (!updatedGoal) {
      return res.status(404).json({ error: 'Không tìm thấy mục tiêu.' });
    }

    res.json(updatedGoal);
  } catch (error) {
    logger.error('Error updating saving goal', { goalId, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Không thể cập nhật mục tiêu.' });
  }
});

/**
 * DELETE /api/saving-goals/:id
 * Delete a saving goal and adjust priorities
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const goalId = Number(id);
    if (!goalId) {
      return res.status(400).json({ error: 'ID không hợp lệ.' });
    }

    // Get the goal to be deleted
    const goalToDelete = await db(SAVING_GOALS_TABLE)
      .where(COLS.ID, goalId)
      .first();

    if (!goalToDelete) {
      return res.status(404).json({ error: 'Không tìm thấy mục tiêu.' });
    }

    const deletedPriority = goalToDelete[COLS.PRIORITY] || 0;

    // Delete the goal
    await db(SAVING_GOALS_TABLE)
      .where(COLS.ID, goalId)
      .delete();

    // Decrement priority of all goals with priority > deleted goal's priority
    // This fills the gap left by the deleted goal
    await db(SAVING_GOALS_TABLE)
      .where(COLS.PRIORITY, '>', deletedPriority)
      .decrement(COLS.PRIORITY, 1);

    res.json({ message: 'Đã xóa mục tiêu thành công.' });
  } catch (error) {
    logger.error('Error deleting saving goal', { goalId, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Không thể xóa mục tiêu.' });
  }
});

/**
 * PUT /api/saving-goals/:id/priority
 * Update goal priority for reordering
 */
router.put('/:id/priority', async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;

    const goalId = Number(id);
    if (!goalId) {
      return res.status(400).json({ error: 'ID không hợp lệ.' });
    }

    if (priority === undefined || priority === null) {
      return res.status(400).json({ error: 'Priority không được để trống.' });
    }

    const priorityValue = Number(priority);
    if (isNaN(priorityValue)) {
      return res.status(400).json({ error: 'Priority phải là số.' });
    }

    const [updatedGoal] = await db(SAVING_GOALS_TABLE)
      .where(COLS.ID, goalId)
      .update({ [COLS.PRIORITY]: priorityValue })
      .returning([
        `${COLS.ID} as id`,
        `${COLS.GOAL_NAME} as goal_name`,
        `${COLS.TARGET_AMOUNT} as target_amount`,
        `${COLS.PRIORITY} as priority`,
        `${COLS.CREATED_AT} as created_at`,
      ]);

    if (!updatedGoal) {
      return res.status(404).json({ error: 'Không tìm thấy mục tiêu.' });
    }

    res.json(updatedGoal);
  } catch (error) {
    logger.error('Error updating goal priority', { goalId, error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Không thể cập nhật thứ tự ưu tiên.' });
  }
});

module.exports = router;
