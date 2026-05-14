import type { DisplayStatus, UserOrderRow } from "@/features/renew-adobe/user-orders/types";

export type UserOrdersTableActionProps = {
  row: UserOrderRow;
  displayStatus: DisplayStatus;
  onDeleteUser?: (accountId: number, userEmail: string) => void;
  deletingId?: string | null;
  onFixUser?: (userEmail: string) => void;
  fixingId?: string | null;
  fixAllProgress?: { current: number; total: number } | null;
  deletingTrackingId: string | null;
  adesRenewingId: string | null;
  onOpenEdit: (row: UserOrderRow) => void;
  onOpenDeleteTracking: (row: UserOrderRow) => void;
  onOpenAdesRenew: (row: UserOrderRow) => void;
};
