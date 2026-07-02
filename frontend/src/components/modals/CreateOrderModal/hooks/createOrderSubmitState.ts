import { ORDER_FIELDS } from "../../../../constants";
import type { Order } from "../types";

export const getCreateOrderSubmitState = ({
  formData,
  multiOrderEnabled,
  isMultiReady,
  isDraftComplete,
  isLoading,
  totalOrdersToCreate,
}: {
  formData: Partial<Order>;
  multiOrderEnabled: boolean;
  isMultiReady: boolean;
  isDraftComplete: boolean;
  isLoading: boolean;
  totalOrdersToCreate: number;
}) => {
  const hasCustomer = Boolean(
    String(formData[ORDER_FIELDS.CUSTOMER] || "").trim()
  );
  const canSubmitMulti =
    multiOrderEnabled && isMultiReady && hasCustomer && !isLoading;
  const canSubmitSingle = !multiOrderEnabled && isDraftComplete && !isLoading;
  const canSubmit = multiOrderEnabled ? canSubmitMulti : canSubmitSingle;
  const submitLabel = multiOrderEnabled
    ? isLoading
      ? "Đang tính giá..."
      : totalOrdersToCreate > 1
        ? `Tạo đơn hàng gộp (${totalOrdersToCreate} đơn)`
        : "Tạo đơn hàng gộp"
    : isLoading
      ? "Đang tính giá..."
      : "Tạo đơn hàng";

  return { canSubmit, submitLabel };
};
