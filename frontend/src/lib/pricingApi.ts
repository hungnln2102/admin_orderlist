import { API_ENDPOINTS } from "../constants";
import { apiFetch } from "./api";
import * as Helpers from "./helpers";

export type CalculatePriceRequest = {
  supply_id?: number | string | null;
  san_pham_name?: string | null;
  id_product?: string | null;
  id_order?: string | null;
  customer_type?: string | null;
  variant_id?: number | string | null;
  order_date?: string | null;
  for_quote?: boolean;
};

export type CalculatePriceResponse = {
  cost?: number;
  price?: number;
  promoPrice?: number;
  pricePromo?: number;
  promo?: number;
  resellPrice?: number;
  customerPrice?: number;
  totalPrice?: number;
  days?: number;
  expiry_date?: string;
  gia_nhap?: number;
  gia_ban?: number;
  so_ngay_da_dang_ki?: number;
  order_expired?: string;
  het_han?: string;
  error?: string;
};

export const fetchCalculatedPrice = async (
  payload: CalculatePriceRequest,
  options?: { signal?: AbortSignal }
): Promise<CalculatePriceResponse> => {
  const response = await apiFetch(API_ENDPOINTS.CALCULATE_PRICE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: options?.signal,
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

  if (!data) {
    throw new Error("Phản hồi không hợp lệ từ server.");
  }

  return data;
};
