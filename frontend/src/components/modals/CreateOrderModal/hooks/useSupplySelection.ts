import { useCallback, useMemo } from "react";
import {
  ORDER_CODE_PREFIXES,
  ORDER_FIELDS,
} from "../../../../constants";
import { CustomerType, Order, Supply, SupplyPrice } from "../types";

type RecalcPrice = (
  supplyId: number,
  productName: string,
  orderId: string,
  registerDate: string,
  fallbackImport?: number,
  options?: { updateCost?: boolean }
) => void;

type UseSupplySelectionParams = {
  supplies: Supply[];
  supplyPrices: SupplyPrice[];
  formData: Partial<Order>;
  customerType: CustomerType;
  productName: string;
  orderId: string;
  registerDate: string;
  setSelectedSupplyId: React.Dispatch<React.SetStateAction<number | null>>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Order>>>;
  setIsDataLoaded: (v: boolean) => void;
  recalcPrice: RecalcPrice;
};

export const useSupplySelection = ({
  supplies,
  supplyPrices,
  formData,
  customerType,
  productName,
  orderId,
  registerDate,
  setSelectedSupplyId,
  setFormData,
  setIsDataLoaded,
  recalcPrice,
}: UseSupplySelectionParams) => {
  const supplyLookup = useMemo(() => {
    const byId = new Map<number, Supply>();
    const idByName = new Map<string, number>();
    for (const supply of supplies) {
      byId.set(supply.id, supply);
      const name = supply.supplier_name ?? supply.source_name ?? "";
      if (name && !idByName.has(name)) {
        idByName.set(name, supply.id);
      }
    }
    return { byId, idByName };
  }, [supplies]);

  const supplyPriceLookup = useMemo(() => {
    const byId = new Map<number, number>();
    const byName = new Map<string, number>();
    for (const price of supplyPrices) {
      const normalized = Number(price.price);
      if (!Number.isFinite(normalized)) {
        continue;
      }
      if (!byId.has(price.source_id)) {
        byId.set(price.source_id, normalized);
      }
      const maybeName =
        (price as { supplier_name?: string; source_name?: string })
          .supplier_name ??
        (price as { source_name?: string }).source_name;
      if (maybeName && !byName.has(maybeName)) {
        byName.set(maybeName, normalized);
      }
    }
    return { byId, byName };
  }, [supplyPrices]);

  const getSupplyImportPrice = useCallback(
    (sourceId: number, supplyName: string, fallbackCost: number) => {
      if (supplyName) {
        const priceByName = supplyPriceLookup.byName.get(supplyName);
        if (priceByName !== undefined && Number.isFinite(priceByName)) {
          return priceByName;
        }

        const idFromName = supplyLookup.idByName.get(supplyName);
        if (idFromName !== undefined) {
          const byIdFromName = supplyPriceLookup.byId.get(idFromName);
          if (byIdFromName !== undefined && Number.isFinite(byIdFromName)) {
            return byIdFromName;
          }
        }
      }
      if (sourceId !== 0) {
        const byId = supplyPriceLookup.byId.get(sourceId);
        if (byId !== undefined && Number.isFinite(byId)) {
          return byId;
        }
      }
      return fallbackCost;
    },
    [supplyLookup.idByName, supplyPriceLookup.byId, supplyPriceLookup.byName]
  );

  const handleSourceSelect = useCallback(
    (sourceId: number) => {
      const selectedSupply = supplyLookup.byId.get(sourceId);
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
        if (customerType === ORDER_CODE_PREFIXES.PROMO) {
          updated[ORDER_FIELDS.PRICE] = newBasePrice;
        }
        return updated;
      });

      if (!productName || !orderId || !registerDate) {
        setIsDataLoaded(false);
        return;
      }

      recalcPrice(
        sourceId,
        productName,
        orderId,
        registerDate,
        newBasePrice,
        {
          updateCost: true,
        }
      );
    },
    [
      customerType,
      formData,
      getSupplyImportPrice,
      orderId,
      productName,
      recalcPrice,
      registerDate,
      setFormData,
      setIsDataLoaded,
      setSelectedSupplyId,
      supplyLookup.byId,
    ]
  );

  return { handleSourceSelect };
};
