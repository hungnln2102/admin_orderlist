import type { Order } from "@/constants";
import type { EditableOrder } from "../../types";
import type { RefundCreatePrefill } from "../useOrdersModals";
import type { Dispatch, SetStateAction } from "react";

export type OrderActionsDeps = {
  fetchOrders: () => Promise<void>;
  closeCreateModal: () => void;
  closeEditModal: () => void;
  closeModal: () => void;
  openCreateModal: (prefill?: RefundCreatePrefill | null) => void;
  handleViewOrder: (order: Order, source: "create" | "view") => void;
  orderToDelete: Order | null;
  setOrderToDelete: (order: Order | null) => void;
  setOrders: Dispatch<SetStateAction<Order[]>>;
};

export type CreateOrderPayload = Partial<EditableOrder> | EditableOrder;

export type CreateOrderPayloadInput = CreateOrderPayload | CreateOrderPayload[];
