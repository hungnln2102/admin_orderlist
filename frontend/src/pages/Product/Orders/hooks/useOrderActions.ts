import { useCallback, useState } from "react";
import {
  API_ENDPOINTS,
  ORDER_FIELDS,
  ORDER_STATUSES,
  VIRTUAL_FIELDS,
  Order,
} from "../../../../constants";
import { API_BASE_URL } from "../../../../lib/api";
import { emitRefresh } from "../../../../lib/refreshBus";
import { showAppNotification } from "@/lib/notifications";
import { parseErrorResponse } from "../utils/ordersHelpers";
import type { EditableOrder } from "../types";

const API_BASE = API_BASE_URL;

export type OrderActionsDeps = {
  fetchOrders: () => Promise<void>;
  closeCreateModal: () => void;
  closeEditModal: () => void;
  closeModal: () => void;
  handleViewOrder: (order: Order, source: "create" | "view") => void;
  orderToDelete: Order | null;
  setOrderToDelete: (order: Order | null) => void;
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
};

export function useOrderActions(deps: OrderActionsDeps) {
  const {
    fetchOrders,
    closeCreateModal,
    closeEditModal,
    closeModal,
    handleViewOrder,
    orderToDelete,
    setOrderToDelete,
    setOrders,
  } = deps;

  const [renewingOrderCode, setRenewingOrderCode] = useState<string | null>(null);

  type CreateOrderPayload = Partial<EditableOrder> | EditableOrder;

  const handleSaveNewOrder = useCallback(
    async (newOrderData: CreateOrderPayload) => {
      closeCreateModal();

      try {
        const response = await fetch(`${API_BASE}${API_ENDPOINTS.ORDERS}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(newOrderData),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Lỗi khi tạo đơn hàng mới từ Máy chủ"
          );
        }
        await fetchOrders();
        const createdOrder: Order = await response.json();
        handleViewOrder(createdOrder, "create");
        emitRefresh(["orders", "dashboard"]);
      } catch (error) {
        console.error("Lỗi khi tạo đơn hàng:", error);
        showAppNotification({
          type: "error",
          title: "Lỗi tạo đơn hàng",
          message: `Lỗi khi tạo đơn hàng: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    },
    [closeCreateModal, fetchOrders, handleViewOrder]
  );

  const handleMarkPaid = useCallback(
    async (order: Order) => {
      if (!order || !order.id) return;
      const statusText = String(order[ORDER_FIELDS.STATUS] || "").trim();
      let payload: Partial<Order> | null = null;
      if (statusText === ORDER_STATUSES.CHUA_THANH_TOAN) {
        payload = {
          [ORDER_FIELDS.STATUS]: ORDER_STATUSES.DANG_XU_LY,
        };
      } else if (statusText === ORDER_STATUSES.DANG_XU_LY) {
        payload = {
          [ORDER_FIELDS.STATUS]: ORDER_STATUSES.DA_THANH_TOAN,
        };
      }

      if (!payload) return;
      try {
        const response = await fetch(
          `${API_BASE}${API_ENDPOINTS.ORDER_BY_ID(order.id)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          }
        );
        if (!response.ok) {
          const errorMessage = await parseErrorResponse(response);
          throw new Error(
            errorMessage || "Lỗi khi cập nhật trạng thái từ máy chủ"
          );
        }
        await fetchOrders();
        emitRefresh(["orders", "dashboard"]);
      } catch (error) {
        console.error("Lỗi khi đánh dấu đã thanh toán:", error);
        showAppNotification({
          type: "error",
          title: "Lỗi cập nhật thanh toán",
          message: `Không thể đánh dấu đã thanh toán: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    },
    [fetchOrders]
  );

  const handleRenewOrder = useCallback(
    async (order: Order) => {
      if (!order) return;

      const orderCode = String(order[ORDER_FIELDS.ID_ORDER] || "").trim();
      if (!orderCode) return;

      setRenewingOrderCode(orderCode);

      try {
        const response = await fetch(
          `${API_BASE}${API_ENDPOINTS.ORDER_RENEW(orderCode)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ forceRenewal: true }),
          }
        );

        if (!response.ok) {
          const errorMessage = await parseErrorResponse(response);
          throw new Error(
            errorMessage || "Không thể gia hạn thủ công cho đơn hàng."
          );
        }

        await fetchOrders();
        emitRefresh(["orders", "dashboard"]);
        showAppNotification({
          type: "success",
          title: "Gia hạn thành công",
          message:
            "Gia hạn đơn hàng thành công.\nĐơn đã được xử lý renewal thủ công.",
        });
      } catch (error) {
        console.error("Lỗi khi chạy gia hạn thủ công:", error);
        showAppNotification({
          type: "error",
          title: "Lỗi gia hạn",
          message: `Không thể gia hạn đơn hàng: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      } finally {
        setRenewingOrderCode(null);
      }
    },
    [fetchOrders]
  );

  const handleConfirmRefund = useCallback(
    async (order: Order) => {
      if (!order || !order.id) return;
      try {
        const response = await fetch(
          `${API_BASE}${API_ENDPOINTS.ORDER_CANCELED_REFUND(order.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          }
        );
        if (!response.ok) {
          const errorMessage = await parseErrorResponse(response);
          throw new Error(
            errorMessage || "Lỗi khi xác nhận hoàn tiền từ máy chủ"
          );
        }
        await fetchOrders();
        emitRefresh(["orders", "dashboard"]);
      } catch (error) {
        console.error("Lỗi khi xác nhận hoàn tiền:", error);
        showAppNotification({
          type: "error",
          title: "Lỗi xác nhận hoàn tiền",
          message: `Lỗi khi xác nhận hoàn tiền: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    },
    [fetchOrders]
  );

  const handleSaveEdit = useCallback(
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
        const response = await fetch(
          `${API_BASE}${API_ENDPOINTS.ORDER_BY_ID(Number(updatedOrder.id))}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(dbFields),
          }
        );

        if (!response.ok) {
          const errorMessage = await parseErrorResponse(response);
          throw new Error(errorMessage || "Lỗi khi cập nhật đơn hàng từ Máy chủ");
        }
        await fetchOrders();
        emitRefresh(["orders", "dashboard"]);
      } catch (error) {
        console.error("Lỗi khi cập nhật đơn hàng:", error);
        showAppNotification({
          type: "error",
          title: "Lỗi cập nhật đơn hàng",
          message: `Lỗi khi cập nhật đơn hàng: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    },
    [closeEditModal, fetchOrders]
  );

  const confirmDelete = useCallback(async () => {
    if (!orderToDelete) return;
    closeModal();

    try {
      const response = await fetch(
        `${API_BASE}${API_ENDPOINTS.ORDER_BY_ID(orderToDelete.id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            can_hoan: orderToDelete[VIRTUAL_FIELDS.GIA_TRI_CON_LAI],
            gia_tri_con_lai: orderToDelete[VIRTUAL_FIELDS.GIA_TRI_CON_LAI],
          }),
        }
      );

      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage || "Lỗi khi xóa đơn hàng từ Máy chủ");
      }

      setOrders((prevOrders) =>
        prevOrders.filter((order) => order.id !== orderToDelete.id)
      );
      emitRefresh(["orders", "dashboard"]);
    } catch (error) {
      console.error("Lỗi khi xóa đơn hàng:", error);
      showAppNotification({
        type: "error",
        title: "Lỗi xóa đơn hàng",
        message: `Lỗi khi xóa đơn hàng: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    } finally {
      setOrderToDelete(null);
    }
  }, [closeModal, orderToDelete, setOrderToDelete, setOrders]);

  return {
    handleSaveNewOrder,
    handleMarkPaid,
    handleRenewOrder,
    handleConfirmRefund,
    handleSaveEdit,
    confirmDelete,
    renewingOrderCode,
  };
}
