import { API_ENDPOINTS, ORDER_FIELDS, type Order } from "@/constants";
import { apiFetch } from "@/shared/api/client";
import { emitRefresh } from "@/lib/refreshBus";
import { showAppNotification } from "@/lib/notifications";
import { createImportPackage } from "@/features/warehouse/api/importPackageApi";
import { formatCurrency, parseErrorResponse } from "../../utils/ordersHelpers";
import type { CreatedOrderBatchView, RefundCreatePrefill } from "../useOrdersModals";
import type { CreateOrderPayload } from "./types";

type ImportPackageMeta = {
  productId?: number | string | null;
  supplierId?: number | string | null;
  importPrice?: number | string | null;
  data?: Record<string, unknown> | null;
};

const toOptionalNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const postImportPackage = async (
  meta: ImportPackageMeta | null | undefined,
  outgoingOrder: Record<string, unknown>
) => {
  const productId = toOptionalNumber(meta?.productId);
  if (!productId) return;

  const data = meta?.data ?? {};
  
  const accountVal = typeof data.account === "string" && data.account 
    ? data.account 
    : (outgoingOrder[ORDER_FIELDS.INFORMATION_ORDER] as string | undefined);
    
  const expiresAtVal = typeof data.expires_at === "string" && data.expires_at 
    ? data.expires_at 
    : (outgoingOrder[ORDER_FIELDS.EXPIRY_DATE] as string | undefined);

  await createImportPackage({
    productId,
    supplierId: toOptionalNumber(meta?.supplierId),
    importPrice: toOptionalNumber(meta?.importPrice),
    account: accountVal ?? null,
    password: typeof data.password === "string" ? data.password : null,
    backup_email: typeof data.backup_email === "string" ? data.backup_email : null,
    two_fa: typeof data.two_fa === "string" ? data.two_fa : null,
    expires_at: expiresAtVal ?? null,
    note: typeof data.note === "string" ? data.note : null,
  });
};

type CreatedReceiptBatch = {
  batchCode: string;
  orderCount: number;
  totalAmount: number;
  baseTotal?: number;
  amountSuffix?: number | null;
};

type BuildSaveNewOrderHandlerArgs = {
  isCreatingOrderRef: React.MutableRefObject<boolean>;
  closeCreateModal: () => void;
  fetchOrders: () => Promise<void>;
  handleViewOrder: (order: Order, source: "create" | "view") => void;
};

const postSingleOrder = async (outgoing: Record<string, unknown>): Promise<Order> => {
  const creditSnap = Math.max(0, Number(outgoing.__credit_avail_snapshot) || 0);
  const creditApply = Math.max(0, Number(outgoing.refund_credit_apply_amount) || 0);
  const creditNoteId = Number(outgoing.refund_credit_note_id) || 0;
  delete outgoing.__credit_avail_snapshot;

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

  return createdOrder;
};

const createReceiptBatchFromCreatedOrders = async (
  createdOrders: Order[]
): Promise<CreatedReceiptBatch | null> => {
  const orderCodes = createdOrders
    .map((order) => String(order?.[ORDER_FIELDS.ID_ORDER] || "").trim().toUpperCase())
    .filter(Boolean);

  if (orderCodes.length < 2) return null;

  const response = await apiFetch("/api/payment-receipts/batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderCodes }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(body?.error || t("orders.batch.create_failed")));
  }

  const batchCode = String(body?.batchCode || "").trim().toUpperCase();
  if (!batchCode) {
    throw new Error(t("orders.batch.missing_code"));
  }

  return {
    batchCode,
    orderCount: Number(body?.orderCount) || orderCodes.length,
    totalAmount: Number(body?.totalAmount) || 0,
    baseTotal: Number(body?.baseTotal) || 0,
    amountSuffix: body?.amountSuffix ?? null,
  };
};

export const buildSaveNewOrderHandler =
  ({ isCreatingOrderRef, closeCreateModal, fetchOrders, handleViewOrder, handleViewCreatedBatch }: BuildSaveNewOrderHandlerArgs) =>
  async (newOrderData: CreateOrderPayload | CreateOrderPayload[]) => {
    if (isCreatingOrderRef.current) return;
    isCreatingOrderRef.current = true;
    closeCreateModal();

    const payloads = Array.isArray(newOrderData) ? newOrderData : [newOrderData];

    try {
      const createdOrders: Order[] = [];
      const failures: string[] = [];

      for (let i = 0; i < payloads.length; i += 1) {
        const outgoing: Record<string, unknown> = {
          ...(payloads[i] as unknown as Record<string, unknown>),
        };
        try {
          const importPackageMeta = outgoing.__import_package as ImportPackageMeta | undefined;
          delete outgoing.__import_package;
          const created = await postSingleOrder(outgoing);
          await postImportPackage(importPackageMeta, outgoing);
          createdOrders.push(created);
        } catch (error) {
          const label = String(outgoing[ORDER_FIELDS.ID_PRODUCT] || `Đơn #${i + 1}`);
          failures.push(
            `${label}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      await fetchOrders();
      emitRefresh(["orders", "dashboard"]);

      if (createdOrders.length === 1) {
        handleViewOrder(createdOrders[0], "create");
      }

      if (createdOrders.length > 1 && failures.length === 0) {
        const totalPrice = createdOrders.reduce(
          (sum, order) => sum + (Number(order[ORDER_FIELDS.PRICE]) || 0),
          0
        );
        const batch = await createReceiptBatchFromCreatedOrders(createdOrders);
        if (batch) {
          handleViewCreatedBatch({
            batchCode: batch.batchCode,
            orders: createdOrders,
            totalPrice,
            totalAmount: batch.totalAmount,
            baseTotal: batch.baseTotal,
            amountSuffix: batch.amountSuffix,
          });
        } else {
          handleViewOrder(createdOrders[createdOrders.length - 1], "create");
        }
        showAppNotification({
          type: "success",
          title: t("orders.batch.created_title", { count: createdOrders.length }),
          message: batch
            ? t("orders.batch.created_message", { totalPrice: formatCurrency(totalPrice), batchCode: batch.batchCode, totalAmount: formatCurrency(batch.totalAmount) })
            : t("orders.batch.total_price_message", { totalPrice: formatCurrency(totalPrice) }),
        });
      } else if (createdOrders.length > 0 && failures.length > 0) {
        showAppNotification({
          type: "error",
          title: "Tạo đơn một phần",
          message: `Thành công ${createdOrders.length}/${payloads.length}. Lỗi: ${failures.join("; ")}`,
        });
      } else if (failures.length > 0) {
        throw new Error(failures.join("; "));
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
