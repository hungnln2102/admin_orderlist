import type { UserOrdersTableActionProps } from "./types";

type RowActionState = {
  isActive: boolean;
  showAdesRenew: boolean;
  showAdobeFix: boolean;
};

export const getRowActionState = (
  displayStatus: UserOrdersTableActionProps["displayStatus"],
  systemNote: string | null | undefined,
  accountId: number,
  canFixUser: boolean
): RowActionState => {
  const isActive = displayStatus === "active" || displayStatus === "paid";
  return {
    isActive,
    showAdesRenew: !isActive && systemNote === "fix_ades",
    showAdobeFix: !isActive && systemNote !== "fix_ades" && accountId === 0 && canFixUser,
  };
};
