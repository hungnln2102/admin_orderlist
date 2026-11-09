import { apiClient } from "@/shared/api/apiClient";

export function getShopBankAccounts(): Promise<Response> {
  return apiClient("/api/wallets/shop-bank-accounts");
}

export function getMatchableOrders({ query, limit }: { query?: string; limit: number }): Promise<Response> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (query) params.set("q", query);
  return apiClient(`/api/invoices/matchable-orders?${params.toString()}`);
}

export function getInvoiceBatchSuffix(): Promise<Response> {
  return apiClient("/api/invoices/batches/suffix");
}

export function allocateInvoiceReceipt(receiptId: number, body: unknown): Promise<Response> {
  return apiClient(`/api/invoices/${receiptId}/allocate`, { method: "POST", body });
}

export function createInvoiceBatch(body: unknown): Promise<Response> {
  return apiClient("/api/invoices/batches", { method: "POST", body });
}

export function getFixedCosts(): Promise<Response> {
  return apiClient("/api/finance/fixed-costs");
}

export function getFinanceSummary(): Promise<Response> {
  return apiClient("/api/finance/summary");
}
