import { useCallback, useRef, useState } from "react";
import {
  API_ENDPOINTS,
  ORDER_CODE_PREFIXES,
  ORDER_FIELDS,
  ORDER_STATUSES,
  VIRTUAL_FIELDS,
  Order,
} from "@/constants";
import { apiFetch } from "@/lib/api";
import { emitRefresh } from "@/lib/refreshBus";
import { showAppNotification } from "@/lib/notifications";
import { parseErrorResponse, formatCurrency } from "../utils/ordersHelpers";
import type { EditableOrder } from "../types";
import type { RefundCreatePrefill } from "./useOrdersModals";

export type OrderActionsDeps = {
  fetchOrders: () => Promise<void>;
  closeCreateModal: () => void;
  closeEditModal: () => void;
  closeModal: () => void;
  openCreateModal: (prefill?: RefundCreatePrefill | null) => void;
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
    openCreateModal,
    handleViewOrder,
    orderToDelete,
    setOrderToDelete,
    setOrders,
  } = deps;

  const [renewingOrderCode, setRenewingOrderCode] = useState<string | null>(null);
  const [completingOrderCode, setCompletingOrderCode] = useState<string | null>(null);

  /** Chống double-submit: nếu đã gọi tạo đơn thì bỏ qua lần gọi tiếp theo (tránh 2 đơn trùng mã) */
  const isCreatingOrderRef = useRef(false);

  type CreateOrderPayload = Partial<EditableOrder> | EditableOrder;

  const handleSaveNewOrder = useCallback(
    async (newOrderData: CreateOrderPayload) => {
      if (isCreatingOrderRef.current) return;
      isCreatingOrderRef.current = true;

      closeCreateModal();

      const outgoing: Record<string, unknown> = {
        ...(newOrderData as unknown as Record<string, unknown>),
      };
      const creditSnap = Math.max(0, Number(outgoing.__credit_avail_snapshot) || 0);
      const creditApply = Math.max(0, Number(outgoing.refund_credit_apply_amount) || 0);
      const creditNoteId = Number(outgoing.refund_credit_note_id) || 0;
      delete outgoing.__credit_avail_snapshot;

      try {
        const response = await apiFetch(API_ENDPOINTS.ORDERS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(outgoing),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Lỗi khi tạo đơn hàng mới từ Máy chủ"
          );
        }
        const createdOrder: Order = await response.json();
        await fetchOrders();
        handleViewOrder(createdOrder, "create");
        emitRefresh(["orders", "dashboard"]);
        if (creditNoteId > 0 && creditApply > 0) {
          const remaining = Math.max(0, creditSnap - creditApply);
          showAppNotification({
            type: "success",
            title: "Đã tạo đơn",
            message:
              creditSnap > 0
                ? `Đã áp dụng ${formatCurrency(
                    creditApply
                  )} credit. Dư trên phiếu (ước tính khi gửi form): ${formatCurrency(
                    remaining
                  )}.`
                : `Đã áp dụng ${formatCurrency(creditApply)} credit vào đơn.`,
          });
        }
      } catch (error) {
        console.error("Lỗi khi tạo đơn hàng:", error);
        showAppNotification({
          type: "error",
          title: "Lỗi tạo đơn hàng",
          message: `Lỗi khi tạo đơn hàng: ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      } finally {
        isCreatingOrderRef.current = false;
      }
    },
    [closeCreateModal, fetchOrders, handleViewOrder]
  );

  const handleCreateTopupOrderFromRefund = useCallback(
    async (order: Order) => {
      if (!order || !order.id) return;
      try {
        const response = await apiFetch(
          API_ENDPOINTS.ORDER_REFUND_CREDIT_ENSURE(order.id),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );
        if (!response.ok) {
          const errorMessage = await parseErrorResponse(response);
          throw new Error(errorMessage || "Không thể khởi tạo credit bù đơn.");
        }

        const data = (await response.json()) as {
          credit_note?: {
            id?: number | string;
            available_amount?: number | string;
          };
          preview_order_code?: string;
        };

        const creditNoteId = Number(data?.credit_note?.id || 0);
        if (!Number.isFinite(creditNoteId) || creditNoteId <= 0) {
          throw new Error("Không tìm thấy phiếu credit hợp lệ.");
        }

        const creditAvailableAmount = Math.max(
          0,
          Number(data?.credit_note?.available_amount || 0) || 0
        );
        const basePrice = Math.max(0, Number(order[ORDER_FIELDS.PRICE] || 0) || 0);
        const creditApplyAmount = Math.min(basePrice, creditAvailableAmount);
        // Không prefill sản phẩm / nguồn / thông tin sản phẩm: khách có thể mua gói khác; tự chọn rồi tính giá.

        const prefill: RefundCreatePrefill = {
          initialFormData: {
            [ORDER_FIELDS.ID_PRODUCT]: "",
            [ORDER_FIELDS.INFORMATION_ORDER]: "",
            [ORDER_FIELDS.CUSTOMER]: order[ORDER_FIELDS.CUSTOMER] || "",
            [ORDER_FIELDS.CONTACT]: order[ORDER_FIELDS.CONTACT] || "",
            [ORDER_FIELDS.SLOT]: "",
            [ORDER_FIELDS.SUPPLY]: "",
            [ORDER_FIELDS.COST]: 0,
            [ORDER_FIELDS.PRICE]: 0,
            [ORDER_FIELDS.NOTE]: "",
          },
          creditNoteId,
          creditAvailableAmount,
          creditApplyAmount,
          sourceOrderListPrice: basePrice,
          creditSourceOrderId: Number(order.id),
          creditSourceOrderCode: String(order[ORDER_FIELDS.ID_ORDER] || "").trim(),
          reservedOrderCode: String(data?.preview_order_code || "").trim() || null,
        };

        openCreateModal(prefill);
      } catch (error) {
        showAppNotification({
          type: "error",
          title: "Lỗi khởi tạo bù đơn",
          message:
            error instanceof Error
              ? error.message
              : "Không thể mở form tạo đơn từ credit hoàn tiền.",
        });
      }
    },
    [openCreateModal]
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
      } else if (statusText === ORDER_STATUSES.CAN_GIA_HAN) {
        const orderCode = String(order[ORDER_FIELDS.ID_ORDER] || "").trim();
        if (!orderCode) return;
        setRenewingOrderCode(orderCode);
        try {
          const response = await apiFetch(API_ENDPOINTS.ORDER_RENEW(orderCode), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ forceRenewal: true }),
          });
          if (!response.ok) {
            const errorMessage = await parseErrorResponse(response);
            throw new Error(
              errorMessage || "Không thể gia hạn thủ công cho đơn hàng."
            );
          }
          const renewBody = (await response.json().catch(() => ({}))) as {
            details?: { MAVN_STOCK_SYNC?: { updated?: number; reason?: string | null } };
          };
          await fetchOrders();
          emitRefresh(["orders", "dashboard", "warehouse", "package-product"]);
          const upperCode = orderCode.trim().toUpperCase();
          if (upperCode.startsWith(ORDER_CODE_PREFIXES.IMPORT)) {
            const sync = renewBody?.details?.MAVN_STOCK_SYNC;
            const stockUpdated = Number(sync?.updated ?? 0);
            showAppNotification({
              type: stockUpdated > 0 ? "success" : "warning",
              title: "Đã thanh toán (nhập hàng)",
              message:
                stockUpdated > 0
                  ? "Đơn MAVN đã gia hạn và chuyển Đã thanh toán. Đã đồng bộ ngày hết hạn trên kho."
                  : `Đơn MAVN đã gia hạn (Đã thanh toán) nhưng không cập nhật được expires_at kho${
                      sync?.reason ? ` (${sync.reason}).` : ". "
                    } Kiểm tra information_order trên đơn trùng account_username trên kho (cùng gói).`,
            });
          }
        } catch (error) {
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
        return;
      } else if (statusText === ORDER_STATUSES.DANG_XU_LY) {
        const orderCode = String(order[ORDER_FIELDS.ID_ORDER] || "").trim();
        setCompletingOrderCode(orderCode || String(order.id));
        try {
          const response = await apiFetch(
            API_ENDPOINTS.ORDER_COMPLETE_MANUAL_WEBHOOK(order.id),
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            }
          );
          if (!response.ok) {
            const errorMessage = await parseErrorResponse(response);
            throw new Error(
              errorMessage || "Không thể hoàn thành đơn bằng webhook thủ công."
            );
          }
          const data = (await response.json().catch(() => ({}))) as {
            mavn_import_only?: boolean;
          };
          await fetchOrders();
          emitRefresh(["orders", "dashboard", "payments", "supplies"]);
          showAppNotification({
            type: "success",
            title: "Hoàn thành đơn",
            message: data?.mavn_import_only
              ? "Đơn MAVN nhập hàng đã chuyển Đã thanh toán (không tạo receipt / không qua webhook)."
              : "Đã tạo receipt và hoàn thành đơn bằng webhook thủ công.",
          });
        } catch (error) {
          showAppNotification({
            type: "error",
            title: "Lỗi hoàn thành đơn",
            message: `Không thể hoàn thành đơn hàng: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        } finally {
          setCompletingOrderCode(null);
        }
        return;
      }

      if (!payload) return;
      try {
        const response = await apiFetch(
          API_ENDPOINTS.ORDER_BY_ID(order.id),
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
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
        const response = await apiFetch(
          API_ENDPOINTS.ORDER_RENEW(orderCode),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ forceRenewal: true }),
          }
        );

        if (!response.ok) {
          const errorMessage = await parseErrorResponse(response);
          throw new Error(
            errorMessage || "Không thể gia hạn thủ công cho đơn hàng."
          );
        }

        const renewBody = (await response.json().catch(() => ({}))) as {
          details?: { MAVN_STOCK_SYNC?: { updated?: number; reason?: string | null } };
        };

        await fetchOrders();
        emitRefresh(["orders", "dashboard", "warehouse", "package-product"]);
        const upperRenewCode = orderCode.trim().toUpperCase();
        if (upperRenewCode.startsWith(ORDER_CODE_PREFIXES.IMPORT)) {
          const sync = renewBody?.details?.MAVN_STOCK_SYNC;
          const stockUpdated = Number(sync?.updated ?? 0);
          showAppNotification({
            type: stockUpdated > 0 ? "success" : "warning",
            title: "Gia hạn thành công",
            message:
              stockUpdated > 0
                ? "Đơn MAVN đã gia hạn và chuyển Đã thanh toán. Đã đồng bộ ngày hết hạn trên kho."
                : `Đơn MAVN đã gia hạn (Đã thanh toán) nhưng không cập nhật được expires_at kho${
                    sync?.reason ? ` (${sync.reason}).` : ". "
                  } Kiểm tra information_order trên đơn trùng account_username trên kho (cùng gói).`,
          });
        } else {
          showAppNotification({
            type: "success",
            title: "Gia hạn thành công",
            message:
              "Gia hạn đơn hàng thành công.\nĐơn đã được xử lý renewal thủ công.",
          });
        }
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
        const response = await apiFetch(
          API_ENDPOINTS.ORDER_CANCELED_REFUND(order.id),
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
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
        const response = await apiFetch(
          API_ENDPOINTS.ORDER_BY_ID(Number(updatedOrder.id)),
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
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
      const response = await apiFetch(
        API_ENDPOINTS.ORDER_BY_ID(orderToDelete.id),
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
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
    handleCreateTopupOrderFromRefund,
    handleConfirmRefund,
    handleSaveEdit,
    confirmDelete,
    renewingOrderCode,
    completingOrderCode,
  };
}
