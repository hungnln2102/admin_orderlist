import { API_ENDPOINTS, ORDER_FIELDS, type Order } from "@/constants";
import { apiFetch } from "@/lib/api";
import { emitRefresh } from "@/lib/refreshBus";
import { showAppNotification } from "@/lib/notifications";
import { formatCurrency, parseErrorResponse } from "../../utils/ordersHelpers";
import type { RefundCreatePrefill } from "../useOrdersModals";
import type { CreateOrderPayload } from "./types";

type BuildSaveNewOrderHandlerArgs = {
  isCreatingOrderRef: React.MutableRefObject<boolean>;
  closeCreateModal: () => void;
  fetchOrders: () => Promise<void>;
  handleViewOrder: (order: Order, source: "create" | "view") => void;
};

export const buildSaveNewOrderHandler =
  ({ isCreatingOrderRef, closeCreateModal, fetchOrders, handleViewOrder }: BuildSaveNewOrderHandlerArgs) =>
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
        throw new Error(errorData.error || "Lỗi khi tạo đơn hàng mới từ Máy chủ");
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
              ? `Đã áp dụng ${formatCurrency(creditApply)} credit. Dư trên phiếu (ước tính khi gửi form): ${formatCurrency(remaining)}.`
              : `Đã áp dụng ${formatCurrency(creditApply)} credit vào đơn.`,
        });
      }
    } catch (error) {
      console.error("Lỗi khi tạo đơn hàng:", error);
      showAppNotification({
        type: "error",
        title: "Lỗi tạo đơn hàng",
        message: `Lỗi khi tạo đơn hàng: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      isCreatingOrderRef.current = false;
    }
  };

type BuildTopupHandlerArgs = {
  fetchOrders: () => Promise<void>;
  openCreateModal: (prefill?: RefundCreatePrefill | null) => void;
};

export const buildCreateTopupOrderFromRefundHandler =
  ({ fetchOrders, openCreateModal }: BuildTopupHandlerArgs) =>
  async (order: Order) => {
    if (!order || !order.id) return;
    try {
      const response = await apiFetch(API_ENDPOINTS.ORDER_REFUND_CREDIT_ENSURE(order.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage || "Không thể khởi tạo credit bù đơn.");
      }

      const data = (await response.json()) as {
        credit_note?: { id?: number | string; available_amount?: number | string };
        preview_order_code?: string;
      };
      const creditNoteId = Number(data?.credit_note?.id || 0);
      if (!Number.isFinite(creditNoteId) || creditNoteId <= 0) {
        throw new Error("Không tìm thấy phiếu credit hợp lệ.");
      }

      const creditAvailableAmount = Math.max(0, Number(data?.credit_note?.available_amount || 0) || 0);
      const basePrice = Math.max(0, Number(order[ORDER_FIELDS.PRICE] || 0) || 0);
      const creditApplyAmount = Math.min(basePrice, creditAvailableAmount);

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

      await fetchOrders();
      emitRefresh(["orders", "dashboard"]);
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
  };
