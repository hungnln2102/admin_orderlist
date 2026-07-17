const express = require("express");
const {
  listSavingGoals,
  createSavingGoal,
  updateSavingGoal,
  deleteSavingGoal,
  reorderSavingGoal,
} = require("@/domains/saving-goals/controller");
const {
  goalIdParam,
  createGoalRules,
  updatePriorityRules,
} = require("@/domains/saving-goals/validators/savingGoalValidator");

const router = express.Router();

router.get("/", listSavingGoals);
router.post("/", ...createGoalRules, createSavingGoal);
router.put("/:id", ...goalIdParam, updateSavingGoal);
router.delete("/:id", ...goalIdParam, deleteSavingGoal);
router.put("/:id/priority", ...updatePriorityRules, reorderSavingGoal);

module.exports = router;
