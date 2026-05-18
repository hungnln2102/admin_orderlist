import type { UserOrdersTableActionProps } from "./types";

type RowActionState = {
  isActive: boolean;
  canFixViaAdes: boolean;
  canFixViaAdobe: boolean;
  showFixButton: boolean;
};

export const getRowActionState = (
  displayStatus: UserOrdersTableActionProps["displayStatus"],
  systemNote: string | null | undefined,
  accountId: number,
  canFixUser: boolean
): RowActionState => {
  const isActive = displayStatus === "active" || displayStatus === "paid";
  const canFixViaAdes = !isActive && systemNote === "fix_ades";
  const canFixViaAdobe = !isActive && systemNote !== "fix_ades" && accountId === 0 && canFixUser;
  return {
    isActive,
    canFixViaAdes,
    canFixViaAdobe,
    showFixButton: true,
  };
};
