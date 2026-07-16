import { ORDER_FIELDS } from "../../../../constants";
import type { CreateOrderCreationKind, Order } from "../types";

export const getCreateOrderSubmitState = ({
  formData,
  multiOrderEnabled,
  isMultiReady,
  isDraftComplete,
  isLoading,
  totalOrdersToCreate,
  orderCreationKind,
}: {
  formData: Partial<Order>;
  multiOrderEnabled: boolean;
  isMultiReady: boolean;
  isDraftComplete: boolean;
  isLoading: boolean;
  totalOrdersToCreate: number;
  orderCreationKind?: CreateOrderCreationKind;
}) => {
  const isImport = orderCreationKind === "import";
  const hasCustomer = Boolean(
    String(formData[ORDER_FIELDS.CUSTOMER] || "").trim()
  );
  
  const canSubmitMulti = multiOrderEnabled && isMultiReady && hasCustomer && !isLoading;
  const canSubmitSingle = !multiOrderEnabled && isDraftComplete && !isLoading;
  const canSubmit = multiOrderEnabled ? canSubmitMulti : canSubmitSingle;
  
  let submitLabel = "";
  if (isLoading) {
    submitLabel = "Đang xử lý...";
  } else if (isImport) {
    submitLabel = "Tạo đơn nhập hàng";
  } else if (multiOrderEnabled) {
    submitLabel = totalOrdersToCreate > 1
      ? "Tạo đơn hàng gộp (" + totalOrdersToCreate + " đơn)"
      : "Tạo đơn hàng gộp";
  } else {
    submitLabel = "Tạo đơn hàng";
  }

  return { canSubmit, submitLabel };
};