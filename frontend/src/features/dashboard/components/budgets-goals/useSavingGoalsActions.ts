import { useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { showAppNotification } from "@/lib/notifications";
import type { Goal } from "./types";

export const useSavingGoalsActions = ({
  savingGoals,
  onRefetchGoals,
}: {
  savingGoals: Goal[];
  onRefetchGoals?: () => void;
}) => {
  const handleReorder = useCallback(
    async (goalId: number, direction: "up" | "down") => {
      const currentGoal = savingGoals.find((goal) => goal.id === goalId);
      if (!currentGoal) return;

      const newPriority =
        direction === "down"
          ? (currentGoal.priority || 0) + 1
          : (currentGoal.priority || 0) - 1;

      const conflictingGoal = savingGoals.find(
        (goal) => goal.id !== goalId && goal.priority === newPriority
      );

      try {
        const updates = [
          apiFetch(`/api/saving-goals/${currentGoal.id}/priority`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priority: newPriority }),
          }),
        ];

        if (conflictingGoal) {
          const conflictingNewPriority =
            direction === "down"
              ? conflictingGoal.priority - 1
              : conflictingGoal.priority + 1;

          updates.push(
            apiFetch(`/api/saving-goals/${conflictingGoal.id}/priority`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ priority: conflictingNewPriority }),
            })
          );
        }

        await Promise.all(updates);
        onRefetchGoals?.();
      } catch (error) {
        console.error("Error reordering goal:", error);
        const { handleNetworkError } = await import("@/lib/errorHandler");
        showAppNotification({
          type: "error",
          title: "Lỗi sắp xếp mục tiêu",
          message: handleNetworkError(error),
        });
      }
    },
    [onRefetchGoals, savingGoals]
  );

  const handleDelete = useCallback(
    async (goalId: number) => {
      try {
        const response = await apiFetch(`/api/saving-goals/${goalId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete goal");
        }

        onRefetchGoals?.();
      } catch (error) {
        console.error("Error deleting goal:", error);
        const { handleNetworkError } = await import("@/lib/errorHandler");
        showAppNotification({
          type: "error",
          title: "Lỗi xóa mục tiêu",
          message: handleNetworkError(error),
        });
      }
    },
    [onRefetchGoals]
  );

  const handleUpdateTargetAmount = useCallback(
    async (goalId: number, targetAmount: number) => {
      try {
        const response = await apiFetch(`/api/saving-goals/${goalId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_amount: targetAmount }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error || "Không thể cập nhật mục tiêu");
        }

        onRefetchGoals?.();
      } catch (error) {
        console.error("Error updating goal target amount:", error);
        const { handleNetworkError } = await import("@/lib/errorHandler");
        showAppNotification({
          type: "error",
          title: "Lỗi cập nhật mục tiêu",
          message: handleNetworkError(error),
        });
        throw error;
      }
    },
    [onRefetchGoals]
  );

  return {
    handleReorder,
    handleDelete,
    handleUpdateTargetAmount,
  };
};
