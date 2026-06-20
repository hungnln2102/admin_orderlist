const logger = require("../../../utils/logger");
const { writeUserEventLog } = require("../../renew-adobe/services/systemEventLogService");
const {
  listSavingGoals: listSavingGoalsUseCase,
  createSavingGoal: createSavingGoalUseCase,
  updateSavingGoal: updateSavingGoalUseCase,
  deleteSavingGoal: deleteSavingGoalUseCase,
  reorderSavingGoal: reorderSavingGoalUseCase,
} = require("../use-cases/savingGoalsUseCases");

const listSavingGoals = async (_req, res) => {
  try {
    const payload = await listSavingGoalsUseCase();
    res.json(payload);
  } catch (error) {
    logger.error("Error fetching saving goals", {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể tải danh sách mục tiêu." });
  }
};

const createSavingGoal = async (req, res) => {
  try {
    const createdGoal = await createSavingGoalUseCase({
      goal_name: req.body.goal_name,
      target_amount: req.body.target_amount,
    });
    writeUserEventLog(req, {
      action: "Thêm mục tiêu tiết kiệm",
      entity: "Mục tiêu tiết kiệm",
      entityId: createdGoal.id,
      message: `Thêm mục tiêu tiết kiệm ${createdGoal.goal_name} - số tiền: ${createdGoal.target_amount}`,
      source: "finance.saving_goals",
      metadata: {
        goalId: createdGoal.id,
        goalName: createdGoal.goal_name,
        targetAmount: createdGoal.target_amount,
      },
    });
    res.status(201).json(createdGoal);
  } catch (error) {
    logger.error("Error creating saving goal", {
      error: error.message,
      stack: error.stack,
    });
    res.status(error.statusCode || 500).json({
      error: error.userMessage || "Không thể tạo mục tiêu mới.",
    });
  }
};

const updateSavingGoal = async (req, res) => {
  try {
    const updatedGoal = await updateSavingGoalUseCase({
      goalId: Number(req.params.id),
      goal_name: req.body.goal_name,
      target_amount: req.body.target_amount,
    });
    if (!updatedGoal) {
      return res.status(404).json({ error: "Không tìm thấy mục tiêu." });
    }
    res.json(updatedGoal);
  } catch (error) {
    logger.error("Error updating saving goal", {
      goalId: req.params.id,
      error: error.message,
      stack: error.stack,
    });
    res.status(error.statusCode || 500).json({
      error: error.userMessage || "Không thể cập nhật mục tiêu.",
    });
  }
};

const deleteSavingGoal = async (req, res) => {
  try {
    const deleted = await deleteSavingGoalUseCase({ goalId: Number(req.params.id) });
    if (!deleted) {
      return res.status(404).json({ error: "Không tìm thấy mục tiêu." });
    }
    res.json({ message: "Đã xóa mục tiêu thành công." });
  } catch (error) {
    logger.error("Error deleting saving goal", {
      goalId: req.params.id,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: "Không thể xóa mục tiêu." });
  }
};

const reorderSavingGoal = async (req, res) => {
  try {
    const updatedGoal = await reorderSavingGoalUseCase({
      goalId: Number(req.params.id),
      requestedPriority: req.body.priority,
    });
    if (!updatedGoal) {
      return res.status(404).json({ error: "Không tìm thấy mục tiêu." });
    }
    res.json(updatedGoal);
  } catch (error) {
    logger.error("Error updating goal priority", {
      goalId: req.params.id,
      error: error.message,
      stack: error.stack,
    });
    res.status(error.statusCode || 500).json({
      error: error.userMessage || "Không thể cập nhật thứ tự ưu tiên.",
    });
  }
};

module.exports = {
  listSavingGoals,
  createSavingGoal,
  updateSavingGoal,
  deleteSavingGoal,
  reorderSavingGoal,
};
