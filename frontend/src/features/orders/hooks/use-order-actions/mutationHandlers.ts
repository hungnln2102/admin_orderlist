import {
  API_ENDPOINTS,
  ORDER_FIELDS,
  VIRTUAL_FIELDS,
  type Order,
} from "@/constants";
import { apiFetch } from "@/lib/api";
import { emitRefresh } from "@/lib/refreshBus";
import { showAppNotification } from "@/lib/notifications";
import { parseErrorResponse } from "../../utils/ordersHelpers";
import type { EditableOrder } from "../../types";
import type { Dispatch, SetStateAction } from "react";

type BuildSaveEditHandlerArgs = {
  closeEditModal: () => void;
  fetchOrders: () => Promise<void>;
};

export const buildSaveEditHandler =
  ({ closeEditModal, fetchOrders }: BuildSaveEditHandlerArgs) =>
  async (updatedOrder: EditableOrder) => {
    closeEditModal();
    const dbFields: Partial<Order> = {
      [ORDER_FIELDS.ID_ORDER]: updatedOrder.id_order,
      [ORDER_FIELDS.ID_PRODUCT]: updatedOrder.id_product,
      [ORDER_FIELDS.INFORMATION_ORDER]: updatedOrder.information_order,
      [ORDER_FIELDS.CUSTOMER]: updatedOrder.customer,
      [ORDER_FIELDS.CONTACT]: updatedOrder.contact,
      [ORDER_FIELDS.SLOT]: updatedOrder.slot,
      [ORDER_FIELDS.SUPPLY]: updatedOrder.supply,
      [ORDER_FIELDS.COST]: Number(updatedOrder.cost ?? 0) || 0,
      [ORDER_FIELDS.PRICE]: Number(updatedOrder.price ?? 0) || 0,
      [ORDER_FIELDS.NOTE]: updatedOrder.note,
      [ORDER_FIELDS.STATUS]: updatedOrder.status,
    };

    try {
      const response = await apiFetch(API_ENDPOINTS.ORDER_BY_ID(Number(updatedOrder.id)), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbFields),
      });
      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage || "Lỗi khi cập nhật đơn hàng từ Máy chủ");
      }
      await fetchOrders();
      emitRefresh(["orders", "dashboard"]);
    } catch (error) {
      showAppNotification({
        type: "error",
        title: "Lỗi cập nhật đơn hàng",
        message: `Lỗi khi cập nhật đơn hàng: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

type BuildConfirmDeleteHandlerArgs = {
  closeModal: () => void;
  orderToDelete: Order | null;
  setOrderToDelete: (order: Order | null) => void;
  setOrders: Dispatch<SetStateAction<Order[]>>;
};

export const buildConfirmDeleteHandler =
  ({ closeModal, orderToDelete, setOrderToDelete, setOrders }: BuildConfirmDeleteHandlerArgs) =>
  async () => {
    if (!orderToDelete) return;
    closeModal();
    try {
      const response = await apiFetch(API_ENDPOINTS.ORDER_BY_ID(orderToDelete.id), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          can_hoan: orderToDelete[VIRTUAL_FIELDS.GIA_TRI_CON_LAI],
          gia_tri_con_lai: orderToDelete[VIRTUAL_FIELDS.GIA_TRI_CON_LAI],
        }),
      });
      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage || "Lỗi khi xóa đơn hàng từ Máy chủ");
      }
      setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderToDelete.id));
      emitRefresh(["orders", "dashboard"]);
    } catch (error) {
      showAppNotification({
        type: "error",
        title: "Lỗi xóa đơn hàng",
        message: `Lỗi khi xóa đơn hàng: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setOrderToDelete(null);
    }
  };
