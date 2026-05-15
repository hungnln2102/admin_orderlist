import {
  API_ENDPOINTS,
  ORDER_CODE_PREFIXES,
  ORDER_FIELDS,
  ORDER_STATUSES,
  type Order,
} from "@/constants";
import { apiFetch } from "@/shared/api/client";
import { emitRefresh } from "@/lib/refreshBus";
import { showAppNotification } from "@/lib/notifications";
import { parseErrorResponse } from "../../utils/ordersHelpers";

type PaymentHandlerArgs = {
  fetchOrders: () => Promise<void>;
  setRenewingOrderCode: (code: string | null) => void;
  setCompletingOrderCode: (code: string | null) => void;
};

const renewOrderByCode = async (orderCode: string) => {
  const response = await apiFetch(API_ENDPOINTS.ORDER_RENEW(orderCode), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ forceRenewal: true }),
  });
  if (!response.ok) {
    const errorMessage = await parseErrorResponse(response);
    throw new Error(errorMessage || "Không thể gia hạn thủ công cho đơn hàng.");
  }
  return (await response.json().catch(() => ({}))) as {
    details?: { MAVN_STOCK_SYNC?: { updated?: number; reason?: string | null } };
  };
};

const showRenewMavnMessage = (
  title: string,
  sync?: { updated?: number; reason?: string | null }
) => {
  const stockUpdated = Number(sync?.updated ?? 0);
  showAppNotification({
    type: stockUpdated > 0 ? "success" : "warning",
    title,
    message:
      stockUpdated > 0
        ? "Đơn MAVN đã gia hạn và chuyển Đã thanh toán. Đã đồng bộ ngày hết hạn trên kho."
        : `Đơn MAVN đã gia hạn (Đã thanh toán) nhưng không cập nhật được expires_at kho${
            sync?.reason ? ` (${sync.reason}).` : ". "
          } Kiểm tra information_order trên đơn trùng account_username trên kho (cùng gói).`,
  });
};

export const buildMarkPaidHandler =
  ({ fetchOrders, setRenewingOrderCode, setCompletingOrderCode }: PaymentHandlerArgs) =>
  async (order: Order) => {
    if (!order || !order.id) return;
    const statusText = String(order[ORDER_FIELDS.STATUS] || "").trim();

    if (statusText === ORDER_STATUSES.CHUA_THANH_TOAN) {
      try {
        const response = await apiFetch(API_ENDPOINTS.ORDER_BY_ID(order.id), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [ORDER_FIELDS.STATUS]: ORDER_STATUSES.DANG_XU_LY }),
        });
        if (!response.ok) {
          const errorMessage = await parseErrorResponse(response);
          throw new Error(errorMessage || "Lỗi khi cập nhật trạng thái từ máy chủ");
        }
        await fetchOrders();
        emitRefresh(["orders", "dashboard"]);
      } catch (error) {
        showAppNotification({
          type: "error",
          title: "Lỗi cập nhật thanh toán",
          message: `Không thể đánh dấu đã thanh toán: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
      return;
    }

    if (statusText === ORDER_STATUSES.CAN_GIA_HAN) {
      const orderCode = String(order[ORDER_FIELDS.ID_ORDER] || "").trim();
      if (!orderCode) return;
      setRenewingOrderCode(orderCode);
      try {
        const renewBody = await renewOrderByCode(orderCode);
        await fetchOrders();
        emitRefresh(["orders", "dashboard", "warehouse", "package-product"]);
        if (orderCode.trim().toUpperCase().startsWith(ORDER_CODE_PREFIXES.IMPORT)) {
          showRenewMavnMessage("Đã thanh toán (nhập hàng)", renewBody?.details?.MAVN_STOCK_SYNC);
        }
      } catch (error) {
        showAppNotification({
          type: "error",
          title: "Lỗi gia hạn",
          message: `Không thể gia hạn đơn hàng: ${error instanceof Error ? error.message : String(error)}`,
        });
      } finally {
        setRenewingOrderCode(null);
      }
      return;
    }

    if (statusText !== ORDER_STATUSES.DANG_XU_LY) return;

    const orderCode = String(order[ORDER_FIELDS.ID_ORDER] || "").trim();
    setCompletingOrderCode(orderCode || String(order.id));
    try {
      const response = await apiFetch(API_ENDPOINTS.ORDER_COMPLETE_MANUAL_WEBHOOK(order.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage || "Không thể hoàn thành đơn bằng webhook thủ công.");
      }
      const data = (await response.json().catch(() => ({}))) as { mavn_import_only?: boolean };
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
        message: `Không thể hoàn thành đơn hàng: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setCompletingOrderCode(null);
    }
  };

export const buildRenewOrderHandler =
  ({ fetchOrders, setRenewingOrderCode }: Omit<PaymentHandlerArgs, "setCompletingOrderCode">) =>
  async (order: Order) => {
    if (!order) return;
    const orderCode = String(order[ORDER_FIELDS.ID_ORDER] || "").trim();
    if (!orderCode) return;
    setRenewingOrderCode(orderCode);
    try {
      const renewBody = await renewOrderByCode(orderCode);
      await fetchOrders();
      emitRefresh(["orders", "dashboard", "warehouse", "package-product"]);
      if (orderCode.trim().toUpperCase().startsWith(ORDER_CODE_PREFIXES.IMPORT)) {
        showRenewMavnMessage("Gia hạn thành công", renewBody?.details?.MAVN_STOCK_SYNC);
      } else {
        showAppNotification({
          type: "success",
          title: "Gia hạn thành công",
          message: "Gia hạn đơn hàng thành công.\nĐơn đã được xử lý renewal thủ công.",
        });
      }
    } catch (error) {
      showAppNotification({
        type: "error",
        title: "Lỗi gia hạn",
        message: `Không thể gia hạn đơn hàng: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setRenewingOrderCode(null);
    }
  };

export const buildConfirmRefundHandler =
  ({ fetchOrders }: Pick<PaymentHandlerArgs, "fetchOrders">) =>
  async (order: Order) => {
    if (!order || !order.id) return;
    try {
      const response = await apiFetch(API_ENDPOINTS.ORDER_CANCELED_REFUND(order.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorMessage = await parseErrorResponse(response);
        throw new Error(errorMessage || "Lỗi khi xác nhận hoàn tiền từ máy chủ");
      }
      await fetchOrders();
      emitRefresh(["orders", "dashboard"]);
    } catch (error) {
      showAppNotification({
        type: "error",
        title: "Lỗi xác nhận hoàn tiền",
        message: `Lỗi khi xác nhận hoàn tiền: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };
