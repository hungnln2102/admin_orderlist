import { useEffect, useState } from "react";
import { API_ENDPOINTS } from "../../../../constants";
import { apiFetch } from "../../../../lib/api";
import * as Helpers from "../../../../lib/helpers";
import { CalculatePriceResponse } from "../types";

type UseCalculatedPriceParams = {
  isOpen: boolean;
  orderId?: string;
  productName?: string;
  customerType?: string;
  basePrice: number;
  normalizedOrderDate: string | null;
};

export const useCalculatedPrice = ({
  isOpen,
  orderId,
  productName,
  customerType,
  basePrice,
  normalizedOrderDate,
}: UseCalculatedPriceParams) => {
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !orderId || !productName) {
      setCalculatedPrice(null);
      setPriceLoading(false);
      setPriceError(null);
      return;
    }

    let ignore = false;
    setCalculatedPrice(basePrice);

    const payload: Record<string, unknown> = {
      san_pham_name: productName,
      id_product: productName,
      id_order: orderId,
    };

    if (normalizedOrderDate) {
      payload.order_date = normalizedOrderDate;
    }

    if (customerType) {
      payload.customer_type = customerType;
    }

    const fetchPrice = async () => {
      try {
        setPriceLoading(true);
        setPriceError(null);

        const response = await apiFetch(API_ENDPOINTS.CALCULATE_PRICE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const { data, rawText } =
          await Helpers.readJsonOrText<CalculatePriceResponse>(response);

        if (!response.ok) {
          const message =
            (data?.error as string | undefined) ||
            rawText ||
            `Server responded with ${response.status}`;
          throw new Error(message);
        }

        const result: CalculatePriceResponse = data ?? {};

        if (!ignore) {
          const backendPrice = Number(result.price ?? result.gia_ban);
          setCalculatedPrice(
            Number.isFinite(backendPrice) && backendPrice >= 0
              ? backendPrice
              : basePrice
          );
        }
      } catch (error) {
        console.error("Lỗi khi tính lại giá đơn hàng:", error);
        if (!ignore) {
          setPriceError(
            "Không thể tính lại giá đơn hàng. Đang hiển thị giá hiện có."
          );
          setCalculatedPrice(basePrice);
        }
      } finally {
        if (!ignore) {
          setPriceLoading(false);
        }
      }
    };

    fetchPrice();

    return () => {
      ignore = true;
    };
  }, [
    basePrice,
    customerType,
    isOpen,
    normalizedOrderDate,
    orderId,
    productName,
  ]);

  return { calculatedPrice, priceLoading, priceError };
};
