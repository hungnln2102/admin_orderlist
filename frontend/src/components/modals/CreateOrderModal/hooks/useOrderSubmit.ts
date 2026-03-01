import { useCallback } from "react";
import { ORDER_FIELDS, Order as ApiOrder } from "../../../../constants";
import * as Helpers from "../../../../lib/helpers";
import { showAppNotification } from "@/lib/notifications";
import { calculateExpirationDate, convertDMYToYMD } from "../helpers";
import { Order, Product } from "../types";

type UseOrderSubmitParams = {
  formData: Partial<Order>;
  isLoading: boolean;
  updateForm: (patch: Partial<Order>) => void;
  onSave: (newOrderData: Partial<Order> | Order) => void;
  selectedSupplyId: number | null;
  products: Product[];
};

export const useOrderSubmit = ({
  formData,
  isLoading,
  updateForm,
  onSave,
  selectedSupplyId,
  products,
}: UseOrderSubmitParams) => {
  const handleSubmit = useCallback(
    (e: React.FormEvent): boolean => {
      e.preventDefault();

      const supplyFilled = selectedSupplyId != null || (formData?.[ORDER_FIELDS.SUPPLY] as string);
      const requiredFieldsFilled =
        formData &&
        formData[ORDER_FIELDS.ID_PRODUCT] &&
        supplyFilled &&
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

        const productName = (formData[ORDER_FIELDS.ID_PRODUCT] as string) || "";
        const matchedProduct = products.find(
          (p) => (p.san_pham || "").trim() === productName.trim()
        );
        const variantId = matchedProduct?.id;

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

        if (selectedSupplyId != null) {
          (dataToSave as Record<string, unknown>).supply_id = selectedSupplyId;
        }
        if (variantId != null && Number.isFinite(variantId)) {
          (dataToSave as Record<string, unknown>).id_product = variantId;
        }

        onSave(dataToSave as Order);
        return true;
      }

      showAppNotification({
        type: "error",
        title: "Thiếu thông tin",
        message: "Vui lòng điền đầy đủ các thông tin.",
      });
      return false;
    },
    [formData, isLoading, onSave, updateForm, selectedSupplyId, products]
  );

  return { handleSubmit };
};
