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
      ? "Cáº§n chá»n tÃ i khoáº£n gá»‘c (kho) Ä‘á»ƒ gÃ¡n gÃ³i."
      : null;

  const hasActivation =
    values.storageId != null || Boolean(values.manualStorage?.account?.trim());

  const matchRequiresActivationError =
    values.slotLinkMode === "information" &&
    requireActivationForInformation &&
    !hasActivation
      ? "Cháº¿ Ä‘á»™ theo thÃ´ng tin Ä‘Æ¡n cáº§n chá»n tÃ i khoáº£n kÃ­ch hoáº¡t (kho kÃ­ch hoáº¡t)."
      : null;

  return { matchRequiresAccountError, matchRequiresActivationError };
};
