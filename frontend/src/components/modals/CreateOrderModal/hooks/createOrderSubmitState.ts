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
      ? "?ang t?nh gi?..."
      : totalOrdersToCreate > 1
        ? `T?o ??n h?ng g?p (${totalOrdersToCreate} ??n)`
        : "T?o ??n h?ng g?p"
    : isLoading
      ? "?ang t?nh gi?..."
      : "T?o ??n h?ng";

  return { canSubmit, submitLabel };
};
