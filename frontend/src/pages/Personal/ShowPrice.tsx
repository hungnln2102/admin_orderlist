import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_ENDPOINTS } from "../../constants";
import { apiFetch } from "../../lib/api";
import { PRODUCT_PRICE_COLS } from "../../lib/tableSql";
import { roundGiaBanValue } from "../../lib/helpers";
import SIGN_IMG from "../../assets/sign.png";

type QuoteLine = {
  id: string;
  productCode?: string;
  product: string;
  packageName: string;
  term: string;
  durationMonths?: number | null;
  durationDays?: number | null;
  unitPrice: number;
  quantity: number;
  discount?: number;
  note?: string;
};

type ProductDesc = {
  productId: string;
  rules?: string | null;
  description?: string | null;
};

const LOGO_SRC = "/mavryk-logo.png"; // Place transparent logo at public/mavryk-logo.png

const formatCurrency = (value: number): string => value.toLocaleString("vi-VN");

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const parseDurationFromSku = (
  value: string
): { months: number | null; days: number | null } => {
  if (!value) return { months: null, days: null };
  const match =
    value.match(/--\s*(\d+)\s*([md])\b/i) ||
    value.match(/(\d+)\s*([md])\b/i);
  if (!match || !match[1]) return { months: null, days: null };
  const num = Number(match[1]);
  if (!Number.isFinite(num)) return { months: null, days: null };
  const unit = (match[2] || "").toLowerCase();
  if (unit === "d") return { months: null, days: num };
  if (unit === "m") return { months: num, days: null };
  return { months: null, days: null };
};

const normalizeKey = (value?: string | null) => (value || "").trim().toLowerCase();
const stripDurationSuffix = (value?: string | null) => {
  const raw = (value || "").trim();
  if (!raw) return "";
  return raw.replace(/--\s*\d+\s*[md]\s*$/i, "").trim();
};
const normalizeProductKey = (value?: string | null) => (value || "").trim().toLowerCase();
const safeNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const parseApiPriceEntry = (data: any) => {
  const customerPrice = safeNumber(data?.price);
  const resellPrice = safeNumber(data?.resellPrice);
  const promoPrice = safeNumber(data?.promoPrice);
  return {
    price: customerPrice || resellPrice || promoPrice || 0,
    promoPrice: promoPrice || 0,
    resellPrice: resellPrice || undefined,
  };
};

const computeLinePricing = (
  apiPricing: ApiPriceEntry | undefined,
  selected: {
    basePrice?: number;
    unitPrice?: number;
    pctPromo?: number;
    pctKhach?: number;
    pctCtv?: number;
  }
) => {
  if (apiPricing) {
    const unitPrice = roundGiaBanValue(apiPricing.price || 0);
    const discount =
      apiPricing.promoPrice > 0
        ? roundGiaBanValue(apiPricing.promoPrice)
        : 0;
    return { unitPrice, discount };
  }

  const basePrice = selected?.basePrice ?? selected?.unitPrice ?? 0;
  const pctPromo =
    selected?.pctPromo !== undefined
      ? toNumber(selected.pctPromo)
      : 0;
  const pctPromoDecimal =
    pctPromo > 1 ? pctPromo / 100 : Math.max(0, pctPromo);
  const pctKhach =
    selected?.pctKhach !== undefined && selected?.pctKhach > 0
      ? selected.pctKhach
      : 1;
  const pctCtv =
    selected?.pctCtv !== undefined && selected?.pctCtv > 0
      ? selected.pctCtv
      : 1;

  const retailPrice = roundGiaBanValue(basePrice * pctKhach * pctCtv);
  const discount =
    pctPromoDecimal > 0
      ? roundGiaBanValue(retailPrice * pctPromoDecimal)
      : 0;
  return { unitPrice: retailPrice, discount };
};
const htmlToPlainText = (value?: string | null): string => {
  if (!value) return "";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(value, "text/html");
    const blockTags = new Set(["DIV", "P", "BR", "LI", "UL", "OL", "SECTION"]);
    const lines: string[] = [];

    const walk = (node: ChildNode, buffer: string[]) => {
      if (node.nodeType === Node.TEXT_NODE) {
        buffer.push((node.textContent || "").replace(/\u00a0/g, " "));
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName === "BR") {
          buffer.push("\n");
          return;
        }
        const childBuffer: string[] = [];
        el.childNodes.forEach((child) => walk(child, childBuffer));
        const joined = childBuffer.join("");
        buffer.push(joined);
        if (blockTags.has(el.tagName)) {
          buffer.push("\n");
        }
      }
    };

    const rootBuffer: string[] = [];
    doc.body.childNodes.forEach((child) => walk(child, rootBuffer));
    return rootBuffer
      .join("")
      .replace(/\u00a0/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .trim();
  } catch {
    return value;
  }
};

const API_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_BASE_URL) ||
  (process.env.VITE_API_BASE_URL as string) ||
  "http://localhost:3001";

const displayDate = (iso: string): string => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

const inputClass =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white placeholder:text-slate-300 focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/60";

export default function ShowPrice() {
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
  const [recipient, setRecipient] = useState("Ms. Diu Nguyen");
  const [contact, setContact] = useState("");
  const [productPrices, setProductPrices] = useState<Record<string, any>[]>([]);
  const [productDescs, setProductDescs] = useState<ProductDesc[]>([]);
  const [productSearch, setProductSearch] = useState("");
  type ApiPriceEntry = { price: number; promoPrice: number; resellPrice?: number };
  const [priceMap, setPriceMap] = useState<Record<string, ApiPriceEntry>>({});
  const pendingPriceRequests = useRef<Record<string, Promise<ApiPriceEntry | null>>>({});
  const [selectedProductKeys, setSelectedProductKeys] = useState<string[]>([]);
  const [lines, setLines] = useState<QuoteLine[]>([]);

  const totals = useMemo(() => {
    const lineItems = lines.map((line) => ({
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
        if (!response.ok) throw new Error("Failed to load product_price");
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
        console.error("Không thể tải product_price:", err);
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
        console.error("Không thể tải product_desc:", err);
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
          // Already in flight; we'll wait below
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
          request.then((entry) => {
            if (entry) updates[key] = entry;
          }).finally(() => {
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

  const productOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{
      value: string;
      productDisplay: string;
      packageDisplay: string;
      label: string;
      durationMonths: number | null;
      durationDays: number | null;
      term: string;
      unitPrice: number;
      discountValue: number;
      pctPromo: number;
      pctKhach: number;
      pctCtv: number;
      wholesalePrice: number;
      productId: string;
    }> = [];

    productPrices.forEach((row) => {
      const sanPham =
        (row?.[PRODUCT_PRICE_COLS.product] as string) ||
        (row?.san_pham as string) ||
        "";
      const value = sanPham.trim();
      if (!value) return;
      const key = value.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);

      const durationInfo = parseDurationFromSku(value);

      const pctKhachRaw = toNumber(
        row?.pct_khach ?? row?.[PRODUCT_PRICE_COLS.pctKhach]
      );
      const pctCtvRaw = toNumber(
        row?.pct_ctv ?? row?.[PRODUCT_PRICE_COLS.pctCtv]
      );
      const pctKhach =
        pctKhachRaw > 10 ? pctKhachRaw / 100 : pctKhachRaw > 0 ? pctKhachRaw : 1;
      const pctCtv =
        pctCtvRaw > 10 ? pctCtvRaw / 100 : pctCtvRaw > 0 ? pctCtvRaw : 1;
      const pctPromoRaw = toNumber(
        row?.pct_promo ?? row?.[PRODUCT_PRICE_COLS.pctPromo]
      );
      const pctPromo =
        pctPromoRaw > 1 ? pctPromoRaw / 100 : Math.max(0, pctPromoRaw);
      const baseSupply = toNumber(row?.max_supply_price);

      const retailBase =
        toNumber(
          row?.computed_retail_price ??
            row?.retail_price ??
            row?.gia_le ??
            row?.gia_ban
        ) || 0;
      const promoBase =
        toNumber(
          row?.computed_promo_price ??
            row?.promo_price ??
            row?.gia_khuyen_mai ??
            row?.gia_km
        ) || 0;

      // retail displayed: ưu tiên giá lẻ từ bảng giá, nếu có thì nhân pct_khach và pct_ctv khi backend lưu dạng hệ số
      const wholesaleRounded = baseSupply > 0 ? roundGiaBanValue(baseSupply) : 0;
      const fallbackRetail =
        retailBase ||
        promoBase ||
        wholesaleRounded;
      const retailPriceRaw =
        fallbackRetail *
        (pctCtv > 0 ? pctCtv : 1) *
        (pctKhach > 0 ? pctKhach : 1);
      const retailPrice = roundGiaBanValue(retailPriceRaw);
      const promoPriceRaw = retailPrice * (1 - pctPromo);
      const promoRounded = roundGiaBanValue(promoPriceRaw);
      const promoClamped = Math.min(
        retailPrice,
        wholesaleRounded > 0 ? Math.max(wholesaleRounded, promoRounded) : promoRounded
      );
      const discountValue =
        promoClamped > 0 ? retailPrice - promoClamped : 0;
      const unitPrice = retailPrice;

      const packageProduct =
        (row?.[PRODUCT_PRICE_COLS.packageProduct] as string) ||
        (row?.package_product as string) ||
        (row?.package_product_label as string) ||
        "";

      const label = packageProduct
        ? `${packageProduct} (${value})`
        : row?.package
        ? `${row?.package} (${value})`
        : value;

      const priceKey = normalizeProductKey(value);
      const apiPrice = priceMap[priceKey];

      options.push({
        productId: value,
        value,
        productDisplay: row?.package || value,
        packageDisplay: packageProduct || row?.package || value,
        label,
        durationMonths: durationInfo.months,
        durationDays: durationInfo.days,
        term: durationInfo.days ? `${durationInfo.days} ngày` : "",
        unitPrice: retailPrice,
        discountValue,
        basePrice: apiPrice?.price ?? apiPrice?.resellPrice ?? retailBase ?? retailPrice,
        promoPrice: apiPrice?.promoPrice ?? 0,
        pctPromo,
        pctKhach,
        pctCtv,
        wholesalePrice: wholesaleRounded,
      });
    });

    return options.sort((a, b) => a.label.localeCompare(b.label, "vi"));
  }, [productPrices, priceMap]);

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
        (row?.[PRODUCT_PRICE_COLS.product] as string) ||
        (row?.san_pham as string) ||
        "";
      const packageProduct =
        (row?.[PRODUCT_PRICE_COLS.packageProduct] as string) ||
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
        label.includes(term) ||
        value.includes(term) ||
        display.includes(term)
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

        const { unitPrice, discount } = computeLinePricing(apiPricing, selected || {});
        nextLines.push({
          id: nextId,
          productCode: rawKey,
          product: selected?.productDisplay || rawKey,
          packageName:
            selected?.packageDisplay ||
            packageProductMap.get(
              normalizeKey(stripDurationSuffix(rawKey))
            ) ||
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
                  ? toNumber(value)
                  : value,
            }
          : line
      )
    );
  };

  const removeLine = (id: string) =>
    setLines((prev) => prev.filter((line) => line.id !== id));

  const quoteCode = `BG-${(quoteDate || "").replaceAll("-", "") || "----"}`;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <style>{printStyles}</style>

      {/* Control panel - only for editing, not printed */}
      <div className="no-print rounded-2xl bg-white/5 border border-white/10 shadow-lg shadow-indigo-900/30">
        <div className="border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">
            Thông tin báo giá
          </h2>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="space-y-1">
              <span className="text-sm font-medium text-white">Kính gửi</span>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-white">Ngày</span>
              <input
                type="date"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-white">Mã báo giá</span>
              <input
                value={quoteCode}
                readOnly
                className={`${inputClass} opacity-80`}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-sm font-medium text-white">Liên hệ</span>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className={inputClass}
                placeholder="Email / SDT"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-white">
                Ghi chú (tùy chọn)
              </span>
              <input
                type="text"
                className={inputClass}
                placeholder="Thông tin thêm cho báo giá"
              />
            </label>
          </div>

          <div className="border border-white/15 rounded-lg p-3 space-y-2">
            <label className="text-sm font-semibold text-white block">
              Mã Sản Phẩm
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className={`${inputClass} text-sm`}
                placeholder="Tìm sản phẩm..."
              />
              <button
                type="button"
                onClick={() => setProductSearch("")}
                className="px-3 py-2 text-sm rounded-lg border border-white/20 bg-white/5 text-white hover:border-white/40 transition-colors"
              >
                Xóa Tìm Kiếm
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto rounded-lg border border-white/20 bg-white/5 p-2">
              {filteredProductOptions.map((opt) => {
                const isActive = selectedProductKeys.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setSelectedProductKeys((prev) =>
                        prev.includes(opt.value)
                          ? prev.filter((v) => v !== opt.value)
                          : [...prev, opt.value]
                      )
                    }
                    className={`text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "border-blue-400/80 bg-blue-500/20 text-white"
                        : "border-white/10 bg-white/5 hover:border-white/30 text-white/90"
                    }`}
                    title={opt.label}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={handleAddSelectedProduct}
                className="rounded bg-blue-600/80 hover:bg-blue-600 text-white px-3 py-2 text-sm disabled:opacity-60"
                disabled={!selectedProductKeys.length}
              >
                Thêm
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded bg-indigo-600/80 hover:bg-indigo-600 text-white px-3 py-2 text-sm"
              >
                Download PDF
              </button>
            </div>
            {lines.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {lines.map((line) => (
                  <span
                    key={line.id}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-white text-sm"
                  >
                    {line.product}
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="text-red-300 hover:text-red-200 font-semibold"
                      title="Xóa"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
            <div className="px-6 py-4 text-sm leading-6 text-white/90 print:text-slate-800">
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
                Lời đầu tiên, xin trân trọng cảm ơn quý khách hàng đã quan tâm
                đến sản phẩm của chúng tôi. Chúng tôi xin gửi đến quý khách hàng
                bảng báo giá chi tiết như sau:
              </p>
            </div>

            {/* Table */}
            <table className="w-full text-sm border-t border-b border-slate-600 text-white print:text-black">
              <thead>
                <tr className="text-center bg-indigo-100 text-slate-900 font-semibold">
                  <th className="border border-slate-600 py-2 w-12">STT</th>
                  <th className="border border-slate-600 py-2 px-2 whitespace-nowrap">
                    TÊN SẢN PHẨM
                  </th>
                  <th className="border border-slate-600 py-2 w-32">GÓI</th>
                  <th className="border border-slate-600 py-2 w-28">
                    THỜI GIAN
                  </th>
                  <th className="border border-slate-600 py-2 w-32">ĐƠN GIÁ</th>
                  <th className="border border-slate-600 py-2 w-28">
                    GIẢM GIÁ
                  </th>
                  <th className="border border-slate-600 py-2 w-32">
                    THÀNH TIỀN
                  </th>
                  <th className="border border-slate-600 py-2 w-36">GHI CHÚ</th>
                </tr>
              </thead>
              <tbody>
                {totals.rows.map((row, idx) => (
                  <tr key={row.id} className="align-top">
                    <td className="border border-slate-600 text-center py-2">
                      {idx + 1}
                    </td>
                    <td
                      className="border border-slate-600 px-2 py-2 text-center text-white print:text-black"
                      title={row.product}
                    >
                      {row.product}
                    </td>
                    <td className="border border-slate-600 text-center px-2 py-2 text-white print:text-black">
                      {row.packageName || row.term}
                    </td>
                    <td className="border border-slate-600 text-center px-2 py-2 text-white print:text-black">
                      {row.durationMonths
                        ? `${row.durationMonths} tháng`
                        : row.durationDays
                        ? `${row.durationDays} ngày`
                        : row.term || "--"}
                    </td>
                    <td className="border border-slate-600 text-center px-2 py-2 text-white print:text-black">
                      {formatCurrency(row.unitPrice)}
                    </td>
                    <td className="border border-slate-600 text-center px-2 py-2 text-white print:text-black">
                      {formatCurrency(row.discount || 0)}
                    </td>
                    <td className="border border-slate-600 text-center px-2 py-2 text-white print:text-black">
                      {formatCurrency(row.total)}
                    </td>
                    <td className="border border-slate-600 px-2 py-2 text-sm text-white print:text-black">
                      {row.note || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Product info */}
            <div className="px-6 py-4 text-sm leading-6 border-b border-slate-600 space-y-4 text-white/90 print:text-black">
              {productDescSections.length === 0 ? (
                <div>
                  <p className="font-semibold">Quy Tắc</p>
                  <div className="mt-1 whitespace-pre-wrap break-words">
                    Chưa cập nhật.
                  </div>
                  <p className="font-semibold mt-3">Thông tin sản phẩm</p>
                  <div className="mt-1 whitespace-pre-wrap break-words">
                    Chưa cập nhật.
                  </div>
                </div>
              ) : (
                productDescSections.map((section) => (
                  <div key={section.name} className="space-y-2">
                    <p className="font-semibold">{section.name}</p>
                    <div>
                      <p className="font-semibold">Quy Tắc</p>
                      <div className="mt-1 whitespace-pre-wrap break-words">
                        {section.rules || "Chưa cập nhật."}
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold">Thông tin sản phẩm</p>
                      <div className="mt-1 whitespace-pre-wrap break-words">
                        {section.description || "Chưa cập nhật."}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div className="pt-2 text-sm">
                <p className="font-semibold">Mọi thông tin chi tiết có thể liên hệ:</p>
                <div className="mt-1 whitespace-pre-wrap">
                  - Fanpage: Mavryk - Tài Khoản Premium
                  {"\n"}- Zalo: 0378.304.963
                  {"\n"}- Telegram: @hung_culi
                </div>
              </div>
            </div>

            {/* Signatures */}
              <div className="flex justify-center px-6 py-8 text-sm text-white print:text-black">
                <div className="px-6 py-4 space-y-2 min-w-[280px] max-w-md text-center">
                  <p className="font-semibold underline underline-offset-2">
                    Mavryk Premium Store
                  </p>
                  <p className="text-[12px] italic text-white/80 print:text-black">
                    (Ký, ghi rõ họ tên)
                  </p>
                <div className="min-h-[110px] flex items-center justify-center">
                  <img
                    src={SIGN_IMG}
                    alt="Chữ ký"
                    className="max-h-[110px] max-w-[260px]"
                    style={{ objectFit: "contain" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
