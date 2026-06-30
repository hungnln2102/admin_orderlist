import {
  addMonthsMinusOneDay,
  formatDateToDMY,
  getTodayDMY,
  inclusiveDaysBetween,
  parseMonthsFromInfo,
} from "@/shared/date";
import { useCallback, useEffect, useMemo } from "react";
import { ORDER_FIELDS } from "../../../../constants";
import { calculateExpirationDate } from "../helpers";
import type { Order } from "../types";
import { isCompleteDMY } from "./createOrderDerivedRules";

export const useCreateOrderDateInputs = ({
  formData,
  updateForm,
  customMode,
  customProductTouched,
}: {
  formData: Partial<Order>;
  updateForm: (patch: Partial<Order>) => void;
  customMode: boolean;
  customProductTouched: boolean;
}) => {
  const infoAValue = (formData[ORDER_FIELDS.INFORMATION_ORDER] as string) || "";
  const infoBValue = (formData[ORDER_FIELDS.ID_PRODUCT] as string) || "";
  const registerDateValue =
    (formData[ORDER_FIELDS.ORDER_DATE] as string) || getTodayDMY();

  const registerDateDMY = useMemo(
    () => (formData[ORDER_FIELDS.ORDER_DATE] as string) || getTodayDMY(),
    [formData]
  );
  const totalDays = useMemo(
    () => Number(formData[ORDER_FIELDS.DAYS] || 0) || 0,
    [formData]
  );

  const handleExpiryDateChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value || "";
      const patch: Partial<Order> = {
        [ORDER_FIELDS.EXPIRY_DATE]: raw,
      };

      const regRaw = (formData[ORDER_FIELDS.ORDER_DATE] as string) || "";
      if (isCompleteDMY(raw) && isCompleteDMY(regRaw)) {
        const normExpiry = formatDateToDMY(raw) || raw;
        const normReg = formatDateToDMY(regRaw) || regRaw;
        const days = inclusiveDaysBetween(normReg, normExpiry);
        if (Number.isFinite(days) && days > 0) {
          patch[ORDER_FIELDS.EXPIRY_DATE] = normExpiry;
          patch[ORDER_FIELDS.DAYS] = String(days);
        }
      }

      updateForm(patch);
    },
    [formData, updateForm]
  );

  const handleExpiryDateBlur = useCallback(() => {
    const raw = (formData[ORDER_FIELDS.EXPIRY_DATE] as string) || "";
    const normalized = formatDateToDMY(raw);
    const nextExpiry = normalized || raw;
    const patch: Partial<Order> = {
      [ORDER_FIELDS.EXPIRY_DATE]: nextExpiry,
    };
    const regRaw = (formData[ORDER_FIELDS.ORDER_DATE] as string) || "";
    const normReg = formatDateToDMY(regRaw) || regRaw;
    if (nextExpiry && normReg) {
      const days = inclusiveDaysBetween(normReg, nextExpiry);
      if (Number.isFinite(days) && days > 0) {
        patch[ORDER_FIELDS.DAYS] = String(days);
      }
    }
    updateForm(patch);
  }, [formData, updateForm]);

  const handleRegisterDateChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value || "";
      const patch: Partial<Order> = {
        [ORDER_FIELDS.ORDER_DATE]: raw,
      };

      if (isCompleteDMY(raw)) {
        const normalized = formatDateToDMY(raw) || raw;
        if (totalDays > 0) {
          const computedExpiry = calculateExpirationDate(normalized, totalDays);
          if (computedExpiry && computedExpiry !== "N/A") {
            patch[ORDER_FIELDS.EXPIRY_DATE] = computedExpiry;
          }
        } else {
          patch[ORDER_FIELDS.EXPIRY_DATE] = normalized;
        }
      }

      updateForm(patch);
    },
    [totalDays, updateForm]
  );

  const handleRegisterDateBlur = useCallback(() => {
    const raw = (formData[ORDER_FIELDS.ORDER_DATE] as string) || "";
    const normalized = formatDateToDMY(raw);
    if (!normalized || normalized === raw.trim()) return;
    updateForm({
      [ORDER_FIELDS.ORDER_DATE]: normalized,
    } as Partial<Order>);
  }, [formData, updateForm]);

  useEffect(() => {
    if (!customMode || !customProductTouched) return;
    const months =
      parseMonthsFromInfo(infoAValue) || parseMonthsFromInfo(infoBValue);

    if (months > 0) {
      const end = addMonthsMinusOneDay(registerDateValue, months);
      const days = inclusiveDaysBetween(registerDateValue, end);
      updateForm({
        [ORDER_FIELDS.DAYS]: String(days),
        [ORDER_FIELDS.EXPIRY_DATE]: end,
      } as Partial<Order>);
    }
  }, [
    customMode,
    customProductTouched,
    infoAValue,
    infoBValue,
    registerDateValue,
    updateForm,
  ]);

  return {
    registerDateDMY,
    handleExpiryDateChange,
    handleExpiryDateBlur,
    handleRegisterDateChange,
    handleRegisterDateBlur,
  };
};
