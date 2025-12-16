import React, { useEffect, useMemo, useState } from "react";
import { API_ENDPOINTS } from "../../constants";
import { ORDER_COLS, PRODUCT_PRICE_COLS } from "../../lib/tableSql";
import { BillOrderForm } from "./BillOrderForm";
import { InvoicePreview } from "./InvoicePreview";
import {
  DEFAULT_FORM,
  InvoiceEntry,
  InvoiceForm,
  InvoiceLine,
  OrderRow,
  ProductPriceRow,
  buildInvoiceEntry,
  extractMonths,
  normalizeDiscountRatio,
  normalizeKey,
  resolveOrderType,
  toPositiveNumber,
} from "./bill-order.helpers";

const API_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_BASE_URL) ||
  (process.env.VITE_API_BASE_URL as string) ||
  "http://localhost:3001";

export default function BillOrder() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Mavryk Premium Store";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const [form, setForm] = useState<InvoiceForm>(DEFAULT_FORM);
  const [invoiceCodes, setInvoiceCodes] = useState<InvoiceEntry[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [productPrices, setProductPrices] = useState<ProductPriceRow[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchOrders = async () => {
      try {
        const response = await fetch(`${API_BASE}${API_ENDPOINTS.ORDERS}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to load orders");
        const data = await response.json();
        if (isMounted && Array.isArray(data)) {
          setOrders(data);
        }
      } catch (err) {
        console.error("Không thể tải dữ liệu order_list:", err);
      }
    };

    const fetchProductPrices = async () => {
      try {
        const response = await fetch(
          `${API_BASE}${API_ENDPOINTS.PRODUCT_PRICES}`,
          { credentials: "include" }
        );
        if (!response.ok) throw new Error("Failed to load product_price");
        const data = await response.json();
        if (isMounted && data?.items && Array.isArray(data.items)) {
          setProductPrices(data.items);
        }
      } catch (err) {
        console.error("Không thể tải dữ liệu product_price:", err);
      }
    };

    fetchOrders();
    fetchProductPrices();

    return () => {
      isMounted = false;
    };
  }, []);

  const orderMap = useMemo(() => {
    const map = new Map<string, OrderRow>();
    orders.forEach((row) => {
      const key = normalizeKey(row?.[ORDER_COLS.idOrder]);
      if (key) {
        map.set(key, row);
      }
    });
    return map;
  }, [orders]);

  const productMap = useMemo(() => {
    const map = new Map<string, ProductPriceRow>();
    productPrices.forEach((row) => {
      const key = normalizeKey(row?.[PRODUCT_PRICE_COLS.product]);
      if (key) {
        map.set(key, row);
      }
    });
    return map;
  }, [productPrices]);

  const invoiceLines: InvoiceLine[] = useMemo(() => {
    return invoiceCodes.map((entry) => {
      const order = orderMap.get(normalizeKey(entry.code));
      const productKey = normalizeKey(order?.[ORDER_COLS.idProduct]);
      const product = productMap.get(productKey);

      const orderType = resolveOrderType(order?.[ORDER_COLS.idOrder] || entry.code);
      const months =
        extractMonths(order?.[ORDER_COLS.idProduct]) ||
        extractMonths(product?.[PRODUCT_PRICE_COLS.product]);
      const monthsLabel = months ? `${months} tháng` : "";
      const baseName =
        (product?.[PRODUCT_PRICE_COLS.packageProduct] as string) ||
        (product?.[PRODUCT_PRICE_COLS.package] as string) ||
        order?.[ORDER_COLS.idProduct] ||
        entry.code;
      const description = monthsLabel ? `${baseName} ${monthsLabel}` : baseName;

      const wholesalePrice =
        toPositiveNumber(product?.computed_wholesale_price) ||
        toPositiveNumber(order?.[ORDER_COLS.price]);
      const retailPrice =
        toPositiveNumber(product?.computed_retail_price) || wholesalePrice;

      let unitPrice = retailPrice;
      if (orderType === "MAVC") {
        unitPrice = wholesalePrice;
      } else if (orderType === "MAVT") {
        unitPrice = 0;
      } else if (orderType === "MAVL" || orderType === "MAVK") {
        unitPrice = retailPrice;
      } else {
        unitPrice = retailPrice || wholesalePrice;
      }

      const discountRatio =
        orderType === "MAVK"
          ? normalizeDiscountRatio(product?.[PRODUCT_PRICE_COLS.pctPromo])
          : 0;
      const discountPct = Number((discountRatio * 100).toFixed(2));
      const quantity = 1;
      const total = Math.max(0, unitPrice * quantity * (1 - discountRatio));

      return {
        id: entry.id,
        code: entry.code,
        description,
        unitPrice,
        quantity,
        discountPct,
        total,
      };
    });
  }, [invoiceCodes, orderMap, productMap]);

  const totals = useMemo(() => {
    const subtotal = invoiceLines.reduce((sum, item) => sum + item.total, 0);
    return { subtotal };
  }, [invoiceLines]);

  const dateDisplay = useMemo(() => {
    if (!form.invoiceDate) return "..... tháng ..... năm 20..";
    const date = new Date(form.invoiceDate);
    if (Number.isNaN(date.getTime())) return "..... tháng ..... năm 20..";
    return new Intl.DateTimeFormat("vi-VN").format(date);
  }, [form.invoiceDate]);

  const handleChange = (field: keyof InvoiceForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddInvoiceCode = () => {
    const code = form.invoiceCode.trim();
    if (!code) return;
    setInvoiceCodes((prev) => {
      if (prev.some((item) => item.code === code)) return prev;
      return [...prev, buildInvoiceEntry(code)];
    });
    setForm((prev) => ({ ...prev, invoiceCode: "" }));
  };

  const removeInvoiceCode = (id: string) => {
    setInvoiceCodes((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Form values are bound live to the preview.
  };

  const handleDownload = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print-wrapper">
      <BillOrderForm
        form={form}
        invoiceCodes={invoiceCodes}
        onChange={handleChange}
        onAddInvoiceCode={handleAddInvoiceCode}
        onRemoveInvoiceCode={removeInvoiceCode}
        onSubmit={handleSubmit}
      />

      <InvoicePreview
        form={form}
        invoiceLines={invoiceLines}
        totals={totals}
        dateDisplay={dateDisplay}
        onDownload={handleDownload}
      />
    </div>
  );
}
