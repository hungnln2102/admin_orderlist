import { useCallback } from "react";
import { ORDER_FIELDS } from "../../../../constants";
import { showAppNotification } from "@/lib/notifications";
import { buildOrderPayload, isDraftOrderComplete } from "../buildOrderPayload";
import { CreateOrderPrefillContext, Order, Product } from "../types";
import type { PaymentMethod } from "@/features/usdt-wallets/types";
import type { CreditOrderSelection } from "../buildOrderPayload";

type UseOrderSubmitParams = {
  formData: Partial<Order>;
  isLoading: boolean;
  onSave: (newOrderData: Partial<Order> | Order | Array<Partial<Order> | Order>) => void;
  selectedSupplyId: number | null;
  products: Product[];
  prefillContext?: CreateOrderPrefillContext | null;
  creditOrderSelection: CreditOrderSelection;
  paymentMethod?: PaymentMethod;
  multiOrderEnabled?: boolean;
  collectAllPayloads?: () => Record<string, unknown>[];
};

export const useOrderSubmit = ({
  formData,
  isLoading,
  onSave,
  selectedSupplyId,
  products,
  prefillContext,
  creditOrderSelection,
  paymentMethod = "bank",
  multiOrderEnabled = false,
  collectAllPayloads,
}: UseOrderSubmitParams) => {
  const handleSubmit = useCallback(
    (e: React.FormEvent): boolean => {
      e.preventDefault();

      if (isLoading) return false;

      if (multiOrderEnabled && collectAllPayloads) {
        const payloads = collectAllPayloads();
        if (payloads.length === 0) {
          showAppNotification({
            type: "error",
            title: "Thiếu thông tin",
            message:
              "Chọn sản phẩm, nguồn và điền thông tin sản phẩm cho ít nhất một dòng chi tiết đơn.",
          });
          return false;
        }

        const customerName = String(formData[ORDER_FIELDS.CUSTOMER] || "").trim();
        if (!customerName) {
          showAppNotification({
            type: "error",
            title: "Thiếu thông tin",
            message: "Vui lòng nhập tên khách hàng.",
          });
          return false;
        }

        onSave(payloads as Array<Partial<Order> | Order>);
        return true;
      }

      const requiredFieldsFilled = isDraftOrderComplete(formData, selectedSupplyId);

      if (requiredFieldsFilled) {
        const result = buildOrderPayload({
          formData,
          selectedSupplyId,
          products,
          prefillContext,
          creditOrderSelection,
          paymentMethod,
        });

        if (!result.ok) {
          showAppNotification({
            type: "error",
            title: "Thiếu thông tin",
            message: "Vui lòng điền đầy đủ các thông tin.",
          });
          return false;
        }

        onSave(result.payload as Partial<Order>);
        return true;
      }

      showAppNotification({
        type: "error",
        title: "Thiếu thông tin",
        message: "Vui lòng điền đầy đủ các thông tin.",
      });
      return false;
    },
    [
      collectAllPayloads,
      creditOrderSelection,
      formData,
      isLoading,
      multiOrderEnabled,
      onSave,
      paymentMethod,
      prefillContext,
      products,
      selectedSupplyId,
    ]
  );

  return { handleSubmit };
};
