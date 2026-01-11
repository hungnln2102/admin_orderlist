import { useCallback } from "react";
import { ORDER_FIELDS, Order as ApiOrder } from "../../../../constants";
import * as Helpers from "../../../../lib/helpers";
import { calculateExpirationDate, convertDMYToYMD } from "../helpers";
import { Order } from "../types";

type UseOrderSubmitParams = {
  formData: Partial<Order>;
  isLoading: boolean;
  updateForm: (patch: Partial<Order>) => void;
  onSave: (newOrderData: Partial<Order> | Order) => void;
};

export const useOrderSubmit = ({
  formData,
  isLoading,
  updateForm,
  onSave,
}: UseOrderSubmitParams) => {
  const handleSubmit = useCallback(
    (e: React.FormEvent): boolean => {
      e.preventDefault();

      const requiredFieldsFilled =
        formData &&
        formData[ORDER_FIELDS.ID_PRODUCT] &&
        formData[ORDER_FIELDS.SUPPLY] &&
        formData[ORDER_FIELDS.CUSTOMER] &&
        formData[ORDER_FIELDS.INFORMATION_ORDER];

      if (requiredFieldsFilled && !isLoading) {
        const registerDMY =
          Helpers.formatDateToDMY(
            formData[ORDER_FIELDS.ORDER_DATE] as string
          ) ||
          (formData[ORDER_FIELDS.ORDER_DATE] as string) ||
          Helpers.getTodayDMY();

        const currentExpiryDMY =
          Helpers.formatDateToDMY(
            formData[ORDER_FIELDS.ORDER_EXPIRED] as string
          ) ||
          (formData[ORDER_FIELDS.ORDER_EXPIRED] as string) ||
          "";

        const totalDays = Number(formData[ORDER_FIELDS.DAYS] || 0) || 0;

        let expiryDMY = currentExpiryDMY;
        if (!expiryDMY && registerDMY && totalDays > 0) {
          const computed = calculateExpirationDate(registerDMY, totalDays);
          if (computed && computed !== "N/A") {
            expiryDMY = computed;
            updateForm({
              [ORDER_FIELDS.ORDER_EXPIRED]: expiryDMY,
            } as Partial<Order>);
          }
        }

        const normalizedRegister = convertDMYToYMD(registerDMY);
        const normalizedExpiry = expiryDMY
          ? convertDMYToYMD(expiryDMY)
          : normalizedRegister;

        const dataToSave: Partial<ApiOrder> = {
          ...formData,
          [ORDER_FIELDS.COST]: Number(formData[ORDER_FIELDS.COST]),
          [ORDER_FIELDS.PRICE]: Number(formData[ORDER_FIELDS.PRICE]),
          [ORDER_FIELDS.ORDER_DATE]: normalizedRegister,
          [ORDER_FIELDS.ORDER_EXPIRED]: normalizedExpiry,
          [ORDER_FIELDS.CONTACT]: formData[ORDER_FIELDS.CONTACT] || null,
          [ORDER_FIELDS.SLOT]: formData[ORDER_FIELDS.SLOT] || null,
          [ORDER_FIELDS.NOTE]: formData[ORDER_FIELDS.NOTE] || null,
        };

        onSave(dataToSave as Order);
        return true;
      }

      alert("Vui lòng điền đầy đủ các thông tin");
      return false;
    },
    [formData, isLoading, onSave, updateForm]
  );

  return { handleSubmit };
};
