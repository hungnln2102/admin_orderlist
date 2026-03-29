import { ORDER_STATUS } from "@shared/orderStatuses";

const ORDER_STATUS_META: Record<
  string,
  { color: string; priority: number }
> = {
  [ORDER_STATUS.EXPIRED]: { color: "bg-red-600 text-white", priority: 1 },
  [ORDER_STATUS.RENEWAL]: { color: "bg-orange-500 text-white", priority: 2 },
  [ORDER_STATUS.UNPAID]: { color: "bg-yellow-500 text-slate-900", priority: 3 },
  [ORDER_STATUS.PROCESSING]: { color: "bg-sky-500 text-white", priority: 4 },
  [ORDER_STATUS.PAID]: { color: "bg-green-600 text-white", priority: 5 },
  [ORDER_STATUS.PENDING_REFUND]: { color: "bg-rose-500 text-white", priority: 6 },
  [ORDER_STATUS.REFUNDED]: { color: "bg-slate-600 text-white", priority: 7 },
};

const getStatusMeta = (status: string) =>
  ORDER_STATUS_META[status?.trim()] || {
    color: "bg-slate-600 text-white",
    priority: 5,
  };

export const getStatusColor = (status: string): string => {
  return getStatusMeta(status).color;
};

export const getStatusPriority = (status: string): number => {
  return getStatusMeta(status).priority;
};
