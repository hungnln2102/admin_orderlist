import React, { useEffect, useMemo, useState } from "react";
import { API_ENDPOINTS } from "../../constants";
import { PRODUCT_PRICE_COLS } from "../../lib/tableSql";
import SIGN_IMG from "../../../sign.png";

type QuoteLine = {
  id: string;
  productCode?: string;
  product: string;
  packageName: string;
  term: string;
  durationMonths?: number | null;
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

const extractMonthsFromSku = (value: string): number | null => {
  if (!value) return null;
  const match = value.match(/--\s*(\d+)\s*m/i) || value.match(/(\d+)\s*m\b/i);
  if (match && match[1]) {
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeKey = (value?: string | null) => (value || "").trim().toLowerCase();
const stripDurationSuffix = (value?: string | null) => {
  const raw = (value || "").trim();
  if (!raw) return "";
  return raw.replace(/--\s*\d+\s*m\s*$/i, "").trim();
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
  const [selectedProductKeys, setSelectedProductKeys] = useState<string[]>([]);
  const [lines, setLines] = useState<QuoteLine[]>([]);

  const totals = useMemo(() => {
    const rows = lines.map((line) => ({
      ...line,
      total: (line.unitPrice - (line.discount || 0)) * line.quantity,
    }));
    const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
    return { rows, grandTotal };
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
        if (isMounted && data?.items && Array.isArray(data.items)) {
          setProductPrices(data.items);
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

  const productOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{
      value: string;
      productDisplay: string;
      packageDisplay: string;
      label: string;
      durationMonths: number | null;
      unitPrice: number;
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

      const productName =
        (row?.[PRODUCT_PRICE_COLS.package] as string) ||
        (row?.package as string) ||
        "";
      const packageName =
        (row?.[PRODUCT_PRICE_COLS.packageProduct] as string) ||
        (row?.package_product as string) ||
        "";

      const unitPrice =
        toNumber(
          row?.computed_retail_price ??
            row?.retail_price ??
            row?.gia_le ??
            row?.gia_ban
        ) || 0;

      const label = productName
        ? `${productName} (${value})`
        : packageName
        ? `${packageName} (${value})`
        : value;

      options.push({
        productId: value,
        value,
        productDisplay: productName || value,
        packageDisplay: packageName || productName || value,
        label,
        durationMonths: extractMonthsFromSku(value),
        unitPrice,
      });
    });

    return options.sort((a, b) => a.label.localeCompare(b.label, "vi"));
  }, [productPrices]);

  const productMap = useMemo(() => {
    const map = new Map<string, (typeof productOptions)[number]>();
    productOptions.forEach((opt) => {
      map.set(opt.value.toLowerCase(), opt);
    });
    return map;
  }, [productOptions]);

  const productDescMap = useMemo(() => {
    const map = new Map<string, ProductDesc>();
    productDescs.forEach((item) => {
      const key = normalizeKey(stripDurationSuffix(item.productId));
      if (key) map.set(key, item);
    });
    return map;
  }, [productDescs]);

  const activeProductDesc = useMemo(() => {
    const code = lines[0]?.productCode || lines[0]?.product || "";
    const key = normalizeKey(stripDurationSuffix(code));
    return key ? productDescMap.get(key) || null : null;
  }, [lines, productDescMap]);

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
      sections.push({
        name: line.product || rawCode || "Sản phẩm",
        rules: htmlToPlainText(desc?.rules),
        description: htmlToPlainText(desc?.description),
      });
    });
    return sections;
  }, [lines, productDescMap]);

  const handleAddSelectedProduct = () => {
    if (!selectedProductKeys.length) return;

    const selections = selectedProductKeys
      .map((raw) => raw.trim())
      .filter(Boolean);

    if (!selections.length) return;

    setLines((prev) => {
      const nextLines = [...prev];
      selections.forEach((rawKey) => {
        const selected =
          productMap.get(rawKey.toLowerCase()) ??
          productMap.get(
            rawKey
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLowerCase()
          );

        const nextId = (nextLines.length + 1).toString();
        nextLines.push({
          id: nextId,
          productCode: rawKey,
          product: selected?.productDisplay || rawKey,
          packageName: selected?.packageDisplay || "",
          term: "",
          durationMonths: selected?.durationMonths ?? null,
          unitPrice: selected?.unitPrice ?? 0,
          quantity: 1,
          discount: 0,
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
              Mã sản phẩm
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                multiple
                value={selectedProductKeys}
                onChange={(e) => {
                  const values = Array.from(
                    e.target.selectedOptions,
                    (opt) => opt.value
                  );
                  setSelectedProductKeys(values);
                }}
                className="flex-1 min-w-[260px] rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/60 h-32"
              >
                <option value="" disabled>
                  Giữ Ctrl / Cmd để chọn nhiều sản phẩm
                </option>
                {productOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddSelectedProduct}
                className="rounded bg-blue-600/80 hover:bg-blue-600 text-white px-3 py-2 text-sm"
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
          style={{ width: "210mm", minHeight: "297mm", padding: "12mm 10mm" }}
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
