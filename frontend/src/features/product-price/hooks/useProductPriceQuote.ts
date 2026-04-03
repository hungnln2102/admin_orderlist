import { useMemo, useRef, useState } from "react";
import type { QuoteLine } from "../types";
import { generateQuoteCode } from "../utils/quoteCode";
import { todayYmdLocal } from "../utils/quoteFormat";
import {
  buildPackageProductMap,
  buildProductDescMap,
  buildProductDescSections,
  indexProductOptionsByKey,
} from "../utils/quoteMaps";
import {
  normalizeKey,
  normalizeProductKey,
  stripDurationSuffix,
} from "../utils/quoteNormalize";
import {
  buildProductOptions,
  computeLinePricing,
} from "../utils/quotePricing";
import { computeQuoteTotals } from "../utils/quoteTotals";
import { useProductPriceCatalog } from "./useProductPriceCatalog";
import { useQuoteCalculatedPriceMap } from "./useQuoteCalculatedPriceMap";

export function useProductPriceQuote() {
  const quoteCodeRef = useRef<string | null>(null);
  if (quoteCodeRef.current === null) quoteCodeRef.current = generateQuoteCode();
  const quoteCode = quoteCodeRef.current;

  const { productPrices, productDescs } = useProductPriceCatalog();
  const { priceMap, ensurePriceForCodes } = useQuoteCalculatedPriceMap();

  const [recipient, setRecipient] = useState("");
  const [contact, setContact] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductKeys, setSelectedProductKeys] = useState<string[]>([]);
  const [lines, setLines] = useState<QuoteLine[]>([]);

  const quoteDate = todayYmdLocal();
  const greetingAddressee = recipient.trim() || "Quý khách hàng";

  const totals = useMemo(() => computeQuoteTotals(lines), [lines]);

  const productOptions = useMemo(
    () => buildProductOptions(productPrices, priceMap),
    [productPrices, priceMap]
  );

  const productMap = useMemo(
    () => indexProductOptionsByKey(productOptions),
    [productOptions]
  );

  const packageProductMap = useMemo(
    () => buildPackageProductMap(productPrices),
    [productPrices]
  );

  const productDescMap = useMemo(
    () => buildProductDescMap(productDescs),
    [productDescs]
  );

  const filteredProductOptions = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return productOptions;
    return productOptions.filter((opt) => {
      const label = opt.label.toLowerCase();
      const value = opt.value.toLowerCase();
      const display = opt.productDisplay.toLowerCase();
      return (
        label.includes(term) || value.includes(term) || display.includes(term)
      );
    });
  }, [productOptions, productSearch]);

  const productDescSections = useMemo(
    () => buildProductDescSections(lines, productDescMap, packageProductMap),
    [lines, productDescMap, packageProductMap]
  );

  const handleAddSelectedProduct = async () => {
    if (!selectedProductKeys.length) return;

    const selections = selectedProductKeys
      .map((raw) => raw.trim())
      .filter(Boolean);

    if (!selections.length) return;

    const priceData = await ensurePriceForCodes(selections);

    setLines((prev) => {
      const nextLines = [...prev];
      selections.forEach((rawKey) => {
        const selected =
          productMap.get(normalizeProductKey(rawKey)) ??
          productMap.get(
            normalizeProductKey(
              rawKey.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            )
          );

        const nextId = (nextLines.length + 1).toString();
        const durationTerm = selected?.durationDays
          ? `${selected.durationDays} ngày`
          : selected?.term || "";
        const key = normalizeProductKey(rawKey);
        const apiPricing = priceData[key];

        const { unitPrice, discount } = computeLinePricing(
          apiPricing,
          selected || {}
        );
        nextLines.push({
          id: nextId,
          productCode: rawKey,
          product: selected?.productDisplay || rawKey,
          packageName:
            selected?.packageDisplay ||
            packageProductMap.get(normalizeKey(stripDurationSuffix(rawKey))) ||
            "",
          term: durationTerm,
          durationMonths: selected?.durationMonths ?? null,
          durationDays: selected?.durationDays ?? null,
          unitPrice,
          quantity: 1,
          discount,
        });
      });
      return nextLines;
    });

    setSelectedProductKeys([]);
  };

  const removeLine = (id: string) =>
    setLines((prev) => prev.filter((line) => line.id !== id));

  return {
    quoteCode,
    quoteDate,
    greetingAddressee,
    recipient,
    setRecipient,
    contact,
    setContact,
    productSearch,
    setProductSearch,
    selectedProductKeys,
    setSelectedProductKeys,
    lines,
    totals,
    filteredProductOptions,
    productDescSections,
    handleAddSelectedProduct,
    removeLine,
  };
}
