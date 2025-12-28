import { useCallback, useRef, useState } from "react";
import { API_ENDPOINTS, ORDER_FIELDS } from "../../../../constants";
import { apiFetch } from "../../../../lib/api";
import * as Helpers from "../../../../lib/helpers";
import {
  calculateExpirationDate,
  convertDMYToYMD,
} from "../helpers";
import {
  CalculatedPriceResult,
  CustomerType,
  Order,
  RawCalculatedPriceResult,
} from "../types";

type ApplyOptions = {
  updateCost?: boolean;
  productNameOverride?: string;
  infoOverride?: string;
};

type UsePriceCalculationParams = {
  customerType: CustomerType;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Order>>>;
  productName: string;
};

export const usePriceCalculation = ({
  customerType,
  setFormData,
  productName,
}: UsePriceCalculationParams) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const infoRef = useRef<string>("");

  const calculatePrice = useCallback(
    async (
      supplyId: number,
      productNameParam: string,
      orderIdParam: string,
      registerDateStr: string
    ): Promise<CalculatedPriceResult | undefined> => {
      setIsLoading(true);
      setIsDataLoaded(false);
      try {
        const normalizedOrderDate =
          convertDMYToYMD(registerDateStr) || registerDateStr || null;
        const response = await apiFetch(API_ENDPOINTS.CALCULATE_PRICE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supply_id: supplyId,
            san_pham_name: productNameParam,
            id_product: productNameParam,
            id_order: orderIdParam,
            order_date: normalizedOrderDate,
            customer_type: customerType,
          }),
        });

        const { data, rawText } =
          await Helpers.readJsonOrText<RawCalculatedPriceResult>(response);

        if (!response.ok) {
          const message =
            (data as { error?: string } | null)?.error ||
            rawText ||
            "Loi tinh gia tu Server.";
          throw new Error(message);
        }

        if (!data) {
          throw new Error("Phan hoi khong hop le tu server.");
        }

        const raw = (data || {}) as RawCalculatedPriceResult;
        const normalizedRegisterDMY =
          Helpers.formatDateToDMY(registerDateStr) ||
          registerDateStr ||
          Helpers.getTodayDMY();

        const mapped: CalculatedPriceResult = {
          cost: Math.max(0, Number(raw.gia_nhap ?? raw.cost ?? 0) || 0),
          price: Math.max(0, Number(raw.gia_ban ?? raw.price ?? 0) || 0),
          days: Number(raw.so_ngay_da_dang_ki ?? raw.days ?? 0) || 0,
          order_expired: "",
        };

        const expiryRaw = (raw.order_expired ?? raw.het_han ?? "").trim();
        const expiryDMY =
          Helpers.formatDateToDMY(expiryRaw) ||
          expiryRaw ||
          (mapped.days > 0
            ? calculateExpirationDate(normalizedRegisterDMY, mapped.days)
            : "");

        mapped.order_expired = expiryDMY;

        return mapped;
      } catch (error) {
        console.error("Loi khi tinh gia:", error);
        setIsDataLoaded(false);
        alert(
          `Tinh gia that bai: ${
            error instanceof Error ? error.message : "Loi khong xac dinh"
          }`
        );
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [customerType]
  );

  const applyCalculationResult = useCallback(
    (
      result: CalculatedPriceResult | undefined,
      registerDMY: string,
      fallbackImport?: number,
      options?: ApplyOptions
    ) => {
      if (!result) return;

      const safeRegister =
        Helpers.formatDateToDMY(registerDMY) ||
        registerDMY ||
        Helpers.getTodayDMY();
      let days = Number(result.days || 0) || 0;
      let expiry =
        result.order_expired ||
        (days > 0 ? calculateExpirationDate(safeRegister, days) : "");

      const monthsFromInfo =
        Helpers.parseMonthsFromInfo(options?.infoOverride || "") ||
        Helpers.parseMonthsFromInfo(
          (
            options?.productNameOverride ||
            productName ||
            ""
          ).toString()
        );

      if (monthsFromInfo > 0) {
        const derivedDays = Helpers.daysFromMonths(monthsFromInfo);
        const end = Helpers.addMonthsMinusOneDay(safeRegister, monthsFromInfo);
        if (derivedDays > 0) {
          days = derivedDays;
          expiry = end;
        }
      }

      setFormData((prev) => {
        const prevGiaNhap = Number(prev[ORDER_FIELDS.COST] || 0);
        const giaNhapFromResult =
          Number.isFinite(result.cost) && result.cost > 0
            ? result.cost
            : undefined;
        const shouldUpdateCost = options?.updateCost ?? true;
        const giaNhap = shouldUpdateCost
          ? giaNhapFromResult ?? Number(fallbackImport ?? prevGiaNhap ?? 0)
          : prevGiaNhap;

        const prevGiaBan = Number(prev[ORDER_FIELDS.PRICE] || 0);
        const giaBanFromResult =
          Number.isFinite(result.price) && result.price > 0
            ? result.price
            : undefined;
        let giaBan = giaBanFromResult ?? prevGiaBan ?? 0;
        if (customerType === "MAVK") {
          giaBan = giaBanFromResult ?? giaNhap ?? prevGiaBan ?? 0;
        }

        return {
          ...prev,
          [ORDER_FIELDS.COST]: giaNhap,
          [ORDER_FIELDS.PRICE]: giaBan,
          [ORDER_FIELDS.DAYS]:
            days > 0
              ? String(days)
              : String(prev[ORDER_FIELDS.DAYS] || "0"),
          [ORDER_FIELDS.ORDER_EXPIRED]:
            expiry || (prev[ORDER_FIELDS.ORDER_EXPIRED] as string) || "",
        };
      });

      setIsDataLoaded(true);
    },
    [customerType, productName, setFormData]
  );

  const recalcPrice = useCallback(
    (
      supplyId: number,
      productNameParam: string,
      orderIdParam: string,
      registerDateParam: string,
      fallbackImport?: number,
      options?: { updateCost?: boolean }
    ) => {
      if (!productNameParam || !orderIdParam || !registerDateParam) return;
      calculatePrice(
        supplyId,
        productNameParam,
        orderIdParam,
        registerDateParam
      ).then((result) =>
        applyCalculationResult(result, registerDateParam, fallbackImport, {
          ...options,
          productNameOverride: productNameParam,
          infoOverride: infoRef.current,
        })
      );
    },
    [applyCalculationResult, calculatePrice]
  );

  return {
    isLoading,
    setIsLoading,
    isDataLoaded,
    setIsDataLoaded,
    calculatePrice,
    applyCalculationResult,
    recalcPrice,
    infoRef,
  };
};

export type UsePriceCalculationReturn = ReturnType<typeof usePriceCalculation>;
