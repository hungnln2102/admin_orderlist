import type { PackageFormValues } from "../../../utils/packageHelpers";

export const formatImportValue = (raw: string): string => {
  const digitsOnly = raw.replace(/[^0-9]/g, "");
  if (!digitsOnly) return "";
  const numeric = Number(digitsOnly);
  return Number.isFinite(numeric) ? numeric.toLocaleString("vi-VN") : "";
};

export const getPackageFormValidation = ({
  values,
  stockManual,
  requireActivationForInformation,
}: {
  values: PackageFormValues;
  stockManual: boolean;
  requireActivationForInformation: boolean;
}) => {
  const matchRequiresAccountError =
    (values.slotLinkMode === "slot" || values.slotLinkMode === "information") &&
    !values.stockId &&
    !stockManual
      ? "Cần chọn tài khoản gốc (kho) để gán gói."
      : null;

  const hasActivation =
    values.storageId != null || Boolean(values.manualStorage?.account?.trim());

  const matchRequiresActivationError =
    values.slotLinkMode === "information" &&
    requireActivationForInformation &&
    !hasActivation
      ? "Chế độ theo thông tin đơn cần chọn tài khoản kích hoạt (kho kích hoạt)."
      : null;

  return { matchRequiresAccountError, matchRequiresActivationError };
};
