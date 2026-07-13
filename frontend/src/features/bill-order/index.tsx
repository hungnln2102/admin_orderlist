import React, { useEffect, useMemo, useState } from "react";
import { API_ENDPOINTS } from "@/constants";
import { apiFetch } from "@/shared/api/client";
import { ORDER_COLS } from "@/lib/tableSql";
import { BillOrderForm } from "./components/BillOrderForm";
import { InvoicePreview } from "./components/InvoicePreview";
import { useDefaultShopBankAccount } from "@/features/shop-bank-accounts/hooks/useDefaultShopBankAccount";
import {
  DEFAULT_FORM,
  InvoiceEntry,
  InvoiceForm,
  InvoiceLine,
  OrderRow,
  ProductPriceRow,
  buildInvoiceEntry,
  normalizeKey,
} from "./helpers";
import {
  buildInvoiceLines,
  buildOrderMap,
  buildProductPriceMap,
} from "./invoiceLineMapper";

export default function BillOrder() {
  const { config: shopBankConfig } = useDefaultShopBankAccount();
  const companyBank = useMemo(
    () => ({
      bank: shopBankConfig.bankDisplayName || shopBankConfig.bankCode || "—",
      accountNumber: shopBankConfig.accountNumber || "—",
      accountHolder: shopBankConfig.accountHolder || "—",
      receiver: shopBankConfig.accountHolder || "—",
    }),
    [shopBankConfig]
  );

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
        const response = await apiFetch(API_ENDPOINTS.ORDERS);
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
        const response = await apiFetch(API_ENDPOINTS.PRODUCT_PRICES);
        if (!response.ok) throw new Error("Failed to load product pricing");
        const data = await response.json();
        if (isMounted && data?.items && Array.isArray(data.items)) {
          setProductPrices(data.items);
        }
      } catch (err) {
        console.error("Không thể tải dữ liệu pricing:", err);
      }
    };

    fetchOrders();
    fetchProductPrices();

    return () => {
      isMounted = false;
    };
  }, []);

  const orderMap = useMemo(() => buildOrderMap(orders), [orders]);

  const productMap = useMemo(
    () => buildProductPriceMap(productPrices),
    [productPrices]
  );

  const invoiceLines: InvoiceLine[] = useMemo(
    () => buildInvoiceLines(invoiceCodes, orderMap, productMap),
    [invoiceCodes, orderMap, productMap]
  );

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

  const invoiceCodesDisplay = useMemo(
    () => invoiceCodes.map((e) => e.code.trim()).filter(Boolean).join(", ") || "—",
    [invoiceCodes]
  );

  const orderStatusDisplay = useMemo(() => {
    const first = invoiceCodes[0];
    if (!first) return "—";
    const row = orderMap.get(normalizeKey(first.code));
    const s = row?.[ORDER_COLS.status] ?? row?.status;
    return s != null && String(s).trim() !== "" ? String(s) : "—";
  }, [invoiceCodes, orderMap]);

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
    window.focus();
    window.requestAnimationFrame(() => {
      window.setTimeout(() => window.print(), 60);
    });
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
        invoiceCodesDisplay={invoiceCodesDisplay}
        orderStatusDisplay={orderStatusDisplay}
        companyBank={companyBank}
        onDownload={handleDownload}
      />
    </div>
  );
}


