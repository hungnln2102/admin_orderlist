import { useEffect, useMemo } from "react";
import { ORDER_FIELDS, Order as ApiOrder } from "../../../../constants";
import * as Helpers from "../../../../lib/helpers";
import { API_BASE_URL } from "../../../../lib/api";
import {
  INITIAL_FORM_DATA,
  calculateExpirationDate,
  convertDMYToYMD,
} from "../helpers";
import { CustomerType, Order, UseCreateOrderLogicResult } from "../types";
import { useOrderFormState } from "./useOrderFormState";
import { usePriceCalculation } from "./usePriceCalculation";
import { useSuppliesData } from "./useSuppliesData";

const API_BASE = API_BASE_URL;

export const useCreateOrderLogic = (
  isOpen: boolean,
  onSave: (newOrderData: Partial<Order> | Order) => void,
  customMode: boolean
): UseCreateOrderLogicResult => {
  const {
    formData,
    setFormData,
    customerType,
    setCustomerType,
    selectedSupplyId,
    setSelectedSupplyId,
    customProductTouched,
    setCustomProductTouched,
    updateForm,
  } = useOrderFormState("MAVC");

  const {
    allSupplies,
    supplies,
    products,
    supplyPrices,
    setSupplies,
    setSupplyPrices,
    fetchProducts,
    fetchAllSupplies,
    fetchSuppliesByProduct,
    fetchAllSupplyPrices,
  } = useSuppliesData(API_BASE);

  const productName = formData[ORDER_FIELDS.ID_PRODUCT] as string;
  const orderId = formData[ORDER_FIELDS.ID_ORDER] as string;
  const registerDate = formData[ORDER_FIELDS.ORDER_DATE] as string;

  const {
    isLoading,
    isDataLoaded,
    setIsDataLoaded,
    recalcPrice,
    infoRef,
  } = usePriceCalculation({
    customerType,
    setFormData,
    productName,
  });

  const currentOrderId = useMemo(
    () => customerType + Helpers.generateRandomId(5),
    [customerType]
  );
  const todayDate = useMemo(() => Helpers.getTodayDMY(), []);

  useEffect(() => {
    infoRef.current =
      (formData[ORDER_FIELDS.INFORMATION_ORDER] as string) || "";
  }, [formData, infoRef]);

  useEffect(() => {
    if (isOpen) {
      const initialType: CustomerType = "MAVC";
      const initialID = initialType + Helpers.generateRandomId(5);
      const initialDate = Helpers.getTodayDMY();

      setCustomerType(initialType);
      setFormData({
        ...INITIAL_FORM_DATA,
        [ORDER_FIELDS.ID_ORDER]: initialID,
        [ORDER_FIELDS.ORDER_DATE]: initialDate,
        [ORDER_FIELDS.ORDER_EXPIRED]: initialDate,
      });
      setIsDataLoaded(false);
      setSelectedSupplyId(null);
      setSupplies([]);
      setSupplyPrices([]);
      setCustomProductTouched(false);
      fetchProducts();
      fetchAllSupplies();
    }
  }, [
    fetchAllSupplies,
    fetchProducts,
    isOpen,
    setCustomerType,
    setFormData,
    setIsDataLoaded,
    setSelectedSupplyId,
    setSupplies,
    setSupplyPrices,
    setCustomProductTouched,
  ]);

  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        [ORDER_FIELDS.ID_ORDER]: currentOrderId,
      }));
    }
  }, [currentOrderId, isOpen, setFormData]);

  useEffect(() => {
    if (!productName || !orderId || !registerDate) return;
    if (customMode) return;

    const supplyId = selectedSupplyId ?? 0;
    recalcPrice(supplyId, productName, orderId, registerDate, undefined, {
      updateCost: Boolean(supplyId),
    });
  }, [
    customerType,
    recalcPrice,
    productName,
    orderId,
    registerDate,
    selectedSupplyId,
    customMode,
  ]);

  useEffect(() => {
    if (productName) return;
    setSelectedSupplyId(null);
    setFormData((prev) => {
      const alreadyCleared =
        !prev[ORDER_FIELDS.ID_PRODUCT] &&
        Number(prev[ORDER_FIELDS.PRICE] || 0) === 0 &&
        String(prev[ORDER_FIELDS.DAYS] || "0") === "0";
      if (alreadyCleared) return prev;
      const resetExpiry =
        (prev[ORDER_FIELDS.ORDER_DATE] as string) || Helpers.getTodayDMY();
      return {
        ...prev,
        [ORDER_FIELDS.ID_PRODUCT]: "",
        [ORDER_FIELDS.SUPPLY]: "",
        [ORDER_FIELDS.COST]: 0,
        [ORDER_FIELDS.PRICE]: 0,
        [ORDER_FIELDS.DAYS]: "0",
        [ORDER_FIELDS.ORDER_EXPIRED]: resetExpiry,
      };
    });
  }, [productName, setFormData, setSelectedSupplyId]);

  const handleProductSelect = (selectedProduct: string) => {
    const trimmed = (selectedProduct || "").trim();
    setSelectedSupplyId(null);
    setCustomProductTouched(false);

    if (!trimmed) {
      setFormData((prev) => ({
        ...prev,
        [ORDER_FIELDS.ID_PRODUCT]: "",
        [ORDER_FIELDS.SUPPLY]: "",
        [ORDER_FIELDS.COST]: 0,
        [ORDER_FIELDS.PRICE]: 0,
        [ORDER_FIELDS.DAYS]: "0",
        [ORDER_FIELDS.ORDER_EXPIRED]:
          prev[ORDER_FIELDS.ORDER_DATE] || todayDate,
      }));
      setSupplies(allSupplies);
      setSupplyPrices([]);
      setIsDataLoaded(false);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.ID_PRODUCT]: trimmed,
      [ORDER_FIELDS.SUPPLY]: "",
      [ORDER_FIELDS.COST]: 0,
      [ORDER_FIELDS.PRICE]: 0,
      [ORDER_FIELDS.DAYS]: "0",
      [ORDER_FIELDS.ORDER_EXPIRED]: prev[ORDER_FIELDS.ORDER_DATE] || todayDate,
    }));
    setSupplies([]);
    setSupplyPrices([]);

    fetchSuppliesByProduct(trimmed);
    fetchAllSupplyPrices(trimmed);

    const currentOrder = formData[ORDER_FIELDS.ID_ORDER] as string;
    const register = formData[ORDER_FIELDS.ORDER_DATE] as string;

    if (currentOrder && register && !customMode) {
      const supplyId = selectedSupplyId ?? 0;
      recalcPrice(supplyId, trimmed, currentOrder, register, undefined, {
        updateCost: Boolean(supplyId),
      });
    }
  };

  const getSupplyImportPrice = (
    sourceId: number,
    supplyName: string,
    fallbackCost: number
  ) => {
    const supplyPriceLikeList: Helpers.SupplyPriceLike[] = supplyPrices.map(
      (p) => ({
        source_id: p.source_id,
        price: p.price,
      })
    );
    const supplyLikeList: Helpers.SupplyLike[] = supplies.map((s) => ({
      id: s.id,
      source_name: s.supplier_name ?? s.source_name,
    }));

    const priceByName = Helpers.getImportPriceBySupplyName(
      supplyName,
      supplyPriceLikeList,
      supplyLikeList
    );
    const normalizedByName = Number(priceByName);
    if (Number.isFinite(normalizedByName)) {
      return normalizedByName;
    }
    if (sourceId !== 0) {
      const byId = supplyPrices.find((p) => p.source_id === sourceId)?.price;
      const normalizedById = Number(byId);
      if (Number.isFinite(normalizedById)) {
        return normalizedById;
      }
    }
    return fallbackCost;
  };

  const handleSourceSelect = (sourceId: number) => {
    const selectedSupply = supplies.find((s) => s.id === sourceId);
    const fallbackCost = Number(formData[ORDER_FIELDS.COST] || 0);
    const supplyName =
      selectedSupply?.supplier_name ?? selectedSupply?.source_name ?? "";
    const newBasePrice = getSupplyImportPrice(
      sourceId,
      supplyName,
      fallbackCost
    );
    setSelectedSupplyId(sourceId === 0 ? null : sourceId);
    setFormData((prev) => {
      const updated: Partial<Order> = {
        ...prev,
        [ORDER_FIELDS.SUPPLY]: selectedSupply ? supplyName : "",
        [ORDER_FIELDS.COST]: newBasePrice,
      };
      if (customerType === "MAVK") {
        updated[ORDER_FIELDS.PRICE] = newBasePrice;
      }
      return updated;
    });

    const productNameParam = formData[ORDER_FIELDS.ID_PRODUCT] as string;
    const orderIdParam = formData[ORDER_FIELDS.ID_ORDER] as string;
    const registerDateParam = formData[ORDER_FIELDS.ORDER_DATE] as string;
    if (!productNameParam || !orderIdParam || !registerDateParam) {
      setIsDataLoaded(false);
      return;
    }

    recalcPrice(
      sourceId,
      productNameParam,
      orderIdParam,
      registerDateParam,
      newBasePrice,
      {
        updateCost: true,
      }
    );
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    updateForm({ [name]: value });
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    setSelectedSupplyId(null);
    setCustomProductTouched(false);

    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.ID_PRODUCT]: selected,
      [ORDER_FIELDS.SUPPLY]: "",
      [ORDER_FIELDS.COST]: 0,
      [ORDER_FIELDS.PRICE]: 0,
      [ORDER_FIELDS.DAYS]: "0",
      [ORDER_FIELDS.ORDER_EXPIRED]: prev[ORDER_FIELDS.ORDER_DATE] || todayDate,
    }));
    setSupplies([]);
    setSupplyPrices([]);

    if (selected) {
      fetchSuppliesByProduct(selected);
      fetchAllSupplyPrices(selected);

      const orderIdParam = (formData[ORDER_FIELDS.ID_ORDER] as string) || "";
      const registerDateParam =
        (formData[ORDER_FIELDS.ORDER_DATE] as string) || "";

      if (orderIdParam && registerDateParam && !customMode) {
        const supplyId = selectedSupplyId ?? 0;
        recalcPrice(
          supplyId,
          selected,
          orderIdParam,
          registerDateParam,
          undefined,
          {
            updateCost: Boolean(supplyId),
          }
        );
      }
    } else {
      setIsDataLoaded(false);
    }
  };

  const handleCustomerTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const newType = e.target.value as CustomerType;
    setCustomerType(newType);
    setSelectedSupplyId(null);
    setSupplies([]);
    setSupplyPrices([]);
    setIsDataLoaded(false);
    setFormData((prev) => ({
      ...prev,
      [ORDER_FIELDS.ID_PRODUCT]: "",
      [ORDER_FIELDS.SUPPLY]: "",
      [ORDER_FIELDS.COST]: 0,
      [ORDER_FIELDS.PRICE]: 0,
      [ORDER_FIELDS.DAYS]: "0",
      [ORDER_FIELDS.ORDER_EXPIRED]:
        prev[ORDER_FIELDS.ORDER_DATE] || Helpers.getTodayDMY(),
    }));
  };

  const handleSubmit = (e: React.FormEvent): boolean => {
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
    } else {
      alert("Vui long dien day du cac thong tin");
      return false;
    }
  };

  return {
    formData,
    supplies,
    allSupplies,
    products,
    isLoading,
    isDataLoaded,
    selectedSupplyId,
    customerType,
    updateForm,
    setIsDataLoaded,
    customProductTouched,
    setCustomProductTouched,
    handleChange,
    handleProductSelect,
    handleSourceSelect,
    handleProductChange,
    handleCustomerTypeChange,
    handleSubmit,
  };
};

export default useCreateOrderLogic;
