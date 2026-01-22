import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_ENDPOINTS } from "../../../constants";
import { apiFetch } from "../../../lib/api";
import { VARIANT_PRICING_COLS } from "../../../lib/tableSql";
import {
  ApiPriceEntry,
  QuoteLine,
  QuoteLineWithTotal,
  ProductDesc,
  buildProductOptions,
  computeLinePricing,
  displayDate,
  formatCurrency,
  htmlToPlainText,
  normalizeKey,
  normalizeProductKey,
  parseApiPriceEntry,
  parseDurationFromSku,
  safeNumber,
  stripDurationSuffix,
} from "./helpers";
import { ControlPanel } from "./components/ControlPanel";
import { QuoteTable } from "./components/QuoteTable";
import { ProductInfoSection } from "./components/ProductInfoSection";
import { SignatureBlock } from "./components/SignatureBlock";

const LOGO_SRC = "/mavryk-logo.png"; // Place transparent logo at public/mavryk-logo.png

const API_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_BASE_URL) ||
  (typeof process !== "undefined"
    ? ((process as any).env?.VITE_API_BASE_URL as string) || ""
    : "") ||
  "http://localhost:3001";

export default function ProductPrice() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Mavryk Premium Store";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const [quoteDate, setQuoteDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [recipient, setRecipient] = useState("");
  const [contact, setContact] = useState("");
  const [productPrices, setProductPrices] = useState<Record<string, any>[]>([]);
  const [productDescs, setProductDescs] = useState<ProductDesc[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [priceMap, setPriceMap] = useState<Record<string, ApiPriceEntry>>({});
  const pendingPriceRequests = useRef<Record<string, Promise<ApiPriceEntry | null>>>({});
  const [selectedProductKeys, setSelectedProductKeys] = useState<string[]>([]);
  const [lines, setLines] = useState<QuoteLine[]>([]);

  const totals = useMemo(() => {
    const lineItems: QuoteLineWithTotal[] = lines.map((line) => ({
      ...line,
      total: (line.unitPrice - (line.discount || 0)) * line.quantity,
    }));
    const grandTotal = lineItems.reduce((sum, row) => sum + row.total, 0);
    return { rows: lineItems, grandTotal };
  }, [lines]);

  useEffect(() => {
    let isMounted = true;
    const fetchProductPrices = async () => {
      try {
        const response = await fetch(
          `${API_BASE}${API_ENDPOINTS.PRODUCT_PRICES}`,
          {
            credentials: "include",
          }
        );
        if (!response.ok) throw new Error("Failed to load variant pricing");
        const data = await response.json();
        if (!isMounted) return;
        if (Array.isArray(data)) {
          setProductPrices(data);
        } else if (data?.items && Array.isArray(data.items)) {
          setProductPrices(data.items);
        } else {
          setProductPrices([]);
        }
      } catch (err) {
        console.error("Khong the tai pricing:", err);
      }
    };
    fetchProductPrices();
    const fetchProductDescs = async () => {
      try {
        const response = await fetch(
          `${API_BASE}${API_ENDPOINTS.PRODUCT_DESCRIPTIONS}`,
          { credentials: "include" }
        );
        if (!response.ok) throw new Error("Failed to load product_desc");
        const data = await response.json();
        if (isMounted && data?.items && Array.isArray(data.items)) {
          setProductDescs(
            data.items.map((item: any) => ({
              productId: item.productId || item.product_id || "",
              rules: item.rules ?? "",
              description: item.description ?? "",
            }))
          );
        }
      } catch (err) {
        console.error("Khong the tai product_desc:", err);
      }
    };
    fetchProductDescs();
    return () => {
      isMounted = false;
    };
  }, []);

  const ensurePriceForCodes = useCallback(
    async (codes: string[]) => {
      const pairs = codes
        .map((c) => ({ original: c, key: normalizeProductKey(c) }))
        .filter((p) => p.key);
      if (!pairs.length) return priceMap;

      const missing = pairs.filter((p) => !priceMap[p.key]);
      if (!missing.length) return priceMap;

      const updates: Record<string, ApiPriceEntry> = {};
      const started: Array<Promise<void>> = [];

      missing.forEach(({ original, key }) => {
        if (pendingPriceRequests.current[key]) {
          started.push(
            pendingPriceRequests.current[key].then((entry) => {
              if (entry) updates[key] = entry;
            })
          );
          return;
        }

        const request = (async (): Promise<ApiPriceEntry | null> => {
          try {
            const response = await apiFetch(API_ENDPOINTS.CALCULATE_PRICE, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                san_pham_name: original,
                id_product: original,
                customer_type: "LE",
                for_quote: true,
              }),
            });
            const data = await response.json().catch(() => null);
            if (!response.ok) throw new Error(data?.error || "Fail calculate-price");
            return parseApiPriceEntry(data);
          } catch (err) {
            console.error("calculate-price failed", original, err);
            return null;
          }
        })();

        pendingPriceRequests.current[key] = request;
        started.push(
          request
            .then((entry) => {
              if (entry) updates[key] = entry;
            })
            .finally(() => {
              delete pendingPriceRequests.current[key];
            })
        );
      });

      if (started.length) {
        await Promise.all(started);
      }

      if (Object.keys(updates).length) {
        setPriceMap((prev) => ({ ...prev, ...updates }));
        return { ...priceMap, ...updates };
      }
      return priceMap;
    },
    [priceMap]
  );

  const productOptions = useMemo(
    () => buildProductOptions(productPrices, priceMap),
    [productPrices, priceMap]
  );

  const productMap = useMemo(() => {
    const map = new Map<string, (typeof productOptions)[number]>();
    productOptions.forEach((opt) => {
      map.set(normalizeProductKey(opt.value), opt);
    });
    return map;
  }, [productOptions]);

  const packageProductMap = useMemo(() => {
    const map = new Map<string, string>();
    productPrices.forEach((row) => {
      const productCode =
        (row?.[VARIANT_PRICING_COLS.code] as string) ||
        (row?.san_pham as string) ||
        "";
      const packageProduct =
        (row?.[VARIANT_PRICING_COLS.variantName] as string) ||
        (row?.package_product as string) ||
        (row?.package_product_label as string) ||
        "";
      const key = normalizeKey(stripDurationSuffix(productCode));
      if (key && packageProduct) {
        map.set(key, packageProduct);
      }
    });
    return map;
  }, [productPrices]);

  const productDescMap = useMemo(() => {
    const map = new Map<string, ProductDesc>();
    productDescs.forEach((item) => {
      const key = normalizeKey(stripDurationSuffix(item.productId));
      if (key) map.set(key, item);
    });
    return map;
  }, [productDescs]);

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

  const productDescSections = useMemo(() => {
    const seen = new Set<string>();
    const sections: Array<{
      name: string;
      rules: string;
      description: string;
    }> = [];
    lines.forEach((line) => {
      const rawCode = line.productCode || line.product || "";
      const key = normalizeKey(stripDurationSuffix(rawCode));
      if (!key || seen.has(key)) return;
      seen.add(key);
      const desc = productDescMap.get(key);
      const packageProductName =
        packageProductMap.get(key) ||
        line.packageName ||
        line.product;
      sections.push({
        name: packageProductName,
        rules: htmlToPlainText(desc?.rules),
        description: htmlToPlainText(desc?.description),
      });
    });
    return sections;
  }, [lines, productDescMap, packageProductMap]);

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

  const handleLineChange = (
    id: string,
    field: keyof QuoteLine,
    value: string
  ) => {
    setLines((prev) =>
      prev.map((line) =>
        line.id === id
          ? {
              ...line,
              [field]:
                field === "unitPrice" || field === "quantity"
                  ? safeNumber(value)
                  : value,
            }
          : line
      )
    );
  };

  const removeLine = (id: string) =>
    setLines((prev) => prev.filter((line) => line.id !== id));

  const quoteCode = `BG-${(quoteDate || "").replaceAll("-", "") || "----"}`;

  const printStyles = `
    /* Hide scrollbars while keeping scroll functionality */
    body {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    body::-webkit-scrollbar {
      display: none;
    }

    @media print {
      /* Hide everything except the printable quote */
      body { background: white !important; margin: 0 !important; padding: 0 !important; }
      body * { visibility: hidden !important; }
      #quote-print-area,
      #quote-print-area * { visibility: visible !important; }
      #quote-print-area {
        position: absolute;
        left: 0;
        top: 0;
        box-shadow: none !important;
        border: none !important;
      }
      .no-print { display: none !important; }
      .print-wrapper { margin: 0 !important; padding: 0 !important; }
    }
  `;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <style>{printStyles}</style>

      <ControlPanel
        recipient={recipient}
        onRecipientChange={setRecipient}
        quoteDate={quoteDate}
        onQuoteDateChange={setQuoteDate}
        quoteCode={quoteCode}
        contact={contact}
        onContactChange={setContact}
        productSearch={productSearch}
        onProductSearchChange={setProductSearch}
        filteredOptions={filteredProductOptions}
        selectedProductKeys={selectedProductKeys}
        onToggleProduct={(value) =>
          setSelectedProductKeys((prev) =>
            prev.includes(value)
              ? prev.filter((v) => v !== value)
              : [...prev, value]
          )
        }
        onAddSelectedProduct={handleAddSelectedProduct}
        onResetSearch={() => setProductSearch("")}
        lines={lines}
        onRemoveLine={removeLine}
        onDownload={() => window.print()}
      />

      {/* Print preview */}
      <div className="print-wrapper flex justify-center">
        <div
          id="quote-print-area"
          className="bg-white text-slate-900 print-target"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "12mm 10mm",
            fontSize: "18px",
          }}
        >
          <div>
            {/* Header */}
            <div className="flex flex-col items-center gap-2 px-6 pt-2 pb-2">
              <div
                className="relative flex items-center justify-center"
                style={{ maxWidth: "140px", maxHeight: "90px" }}
              >
                <img
                  src={LOGO_SRC}
                  alt="Mavryk Logo"
                  className="max-w-full max-h-full"
                  style={{ objectFit: "contain", mixBlendMode: "screen" }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
              </div>
              <div className="text-sm leading-6 text-white print:text-black flex items-center justify-center text-center">
                <div>
                  <p className="font-semibold">Mavryk Premium Store</p>
                  <p>SDT: 0378.304.963</p>
                  <p>Web: mavrykpremium.store</p>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="text-center text-[20px] font-bold bg-indigo-100 text-indigo-900 py-3 tracking-wide uppercase">
              BẢNG BÁO GIÁ
            </div>

            {/* Intro */}
            <div className="px-6 py-4 text-sm leading-6 text-white/90 print:text-slate-800 space-y-1">
              <p>
                Ngày: <strong>{displayDate(quoteDate) || "..."}</strong>
              </p>
              <p>
                Kính gửi: <strong>{recipient}</strong>
              </p>
              {contact ? (
                <p>
                  Thông tin liên hệ: <strong>{contact}</strong>
                </p>
              ) : null}
              <p className="mt-3 italic">
                Mavryk Premium Store trân trọng gửi lời cảm ơn và bản báo giá chi tiết sản phẩm theo yêu cầu của Quý khách.
                Chúng tôi cam kết mọi sản phẩm đều đạt tiêu chuẩn chất lượng cao cấp nhất,
                đảm bảo mang lại trải nghiệm tuyệt vời và xứng đáng với sự đầu tư của Quý khách.
              </p>
            </div>

            <QuoteTable rows={totals.rows} />

            <ProductInfoSection sections={productDescSections} />

            <SignatureBlock />
          </div>
        </div>
      </div>
    </div>
  );
}
