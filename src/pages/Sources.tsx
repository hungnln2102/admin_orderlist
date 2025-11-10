import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { apiFetch } from "../lib/api";
import * as Helpers from "../lib/helpers";

interface SupplySummaryApiItem {
  id: number;
  sourceName: string;
  numberBank: string | null;
  binBank: string | null;
  bankName: string | null;
  status: string;
  rawStatus?: string | null;
  products: string[];
  monthlyOrders: number;
  monthlyImportValue: number;
  lastOrderDate: string | null;
  totalOrders: number;
}

interface SupplyStats {
  totalSuppliers: number;
  activeSuppliers: number;
  monthlyOrders: number;
  totalImportValue: number;
}

interface SupplySummaryResponse {
  stats?: Partial<SupplyStats>;
  supplies?: SupplySummaryApiItem[];
}

interface SupplySummaryItem extends SupplySummaryApiItem {
  products: string[];
}

const DEFAULT_STATS: SupplyStats = {
  totalSuppliers: 0,
  activeSuppliers: 0,
  monthlyOrders: 0,
  totalImportValue: 0,
};

const formatCurrencyShort = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return "₫0";
  if (value >= 1_000_000_000) {
    return `₫${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `₫${(value / 1_000_000).toFixed(1)}M`;
  }
  return `₫${Math.round(value).toLocaleString("vi-VN")}`;
};

const formatCurrencyVnd = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) return "₫0";
  return `₫${Math.round(value).toLocaleString("vi-VN")}`;
};

const formatStatusLabel = (status: string): string => {
  if (status === "inactive") return "Tam ngung";
  if (status === "active") return "Dang hoat dong";
  return status || "Chua xac dinh";
};

const getStatusClasses = (status: string): string => {
  if (status === "inactive") {
    return "bg-yellow-100 text-yellow-800";
  }
  if (status === "active") {
    return "bg-green-100 text-green-800";
  }
  return "bg-gray-100 text-gray-800";
};

const getFormattedDate = (value: string | null): string => {
  if (!value) return "--";
  return Helpers.formatDateToDMY(value) || "--";
};

const normalizeProducts = (products?: string[]): string[] => {
  if (!Array.isArray(products)) return [];
  return products
    .map((product) => (typeof product === "string" ? product.trim() : ""))
    .filter((product) => product.length > 0);
};

const formatSearchValue = (value: string): string => value.trim().toLowerCase();

interface SupplyPayment {
  id: number;
  round: string;
  totalImport: number;
  paid: number;
  status: string;
}

interface PaymentHistoryState {
  baseRows: SupplyPayment[];
  extraPages: SupplyPayment[][];
  currentPageIndex: number;
  nextOffset: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

interface PaymentHistoryResponse {
  payments: SupplyPayment[];
  hasMore: boolean;
  nextOffset?: number;
}

const INITIAL_PAYMENT_LIMIT = 3;
const PAYMENT_PAGE_SIZE = 5;

const createDefaultPaymentState = (): PaymentHistoryState => ({
  baseRows: [],
  extraPages: [],
  currentPageIndex: -1,
  nextOffset: 0,
  hasMore: false,
  loading: false,
  error: null,
  initialized: false,
});

export default function Sources() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplies, setSupplies] = useState<SupplySummaryItem[]>([]);
  const [stats, setStats] = useState<SupplyStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSupplyId, setExpandedSupplyId] = useState<number | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<
    Record<number, PaymentHistoryState>
  >({});

  const fetchSupplySummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch("/api/supply-insights");
      if (!response.ok) {
        throw new Error("Khong the tai du lieu nguon.");
      }
      const data: SupplySummaryResponse = await response.json();
      const normalizedSupplies: SupplySummaryItem[] = Array.isArray(
        data.supplies
      )
        ? data.supplies.map((item) => ({
            ...item,
            products: normalizeProducts(item.products),
            monthlyOrders: Number(item.monthlyOrders) || 0,
            monthlyImportValue: Number(item.monthlyImportValue) || 0,
            totalOrders: Number(item.totalOrders) || 0,
          }))
        : [];
      setSupplies(normalizedSupplies);
      setStats({
        totalSuppliers: Number(data.stats?.totalSuppliers) || 0,
        activeSuppliers: Number(data.stats?.activeSuppliers) || 0,
        monthlyOrders: Number(data.stats?.monthlyOrders) || 0,
        totalImportValue: Number(data.stats?.totalImportValue) || 0,
      });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Co loi xay ra khi tai du lieu."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleSlotDetails = (supplyId: number) => {
    setExpandedSupplyId((current) => (current === supplyId ? null : supplyId));
  };

  const updatePaymentState = useCallback(
    (
      supplyId: number,
      updater: (state: PaymentHistoryState) => PaymentHistoryState
    ) => {
      setPaymentHistory((previous) => {
        const currentState = previous[supplyId] ?? createDefaultPaymentState();
        const nextState = updater(currentState);
        if (nextState === currentState) {
          return previous;
        }
        return {
          ...previous,
          [supplyId]: nextState,
        };
      });
    },
    []
  );

  const fetchPayments = useCallback(
    async (
      supplyId: number,
      offset: number,
      limit: number
    ): Promise<PaymentHistoryResponse> => {
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: limit.toString(),
      });
      const response = await apiFetch(
        `/api/supplies/${supplyId}/payments?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error("Khong the tai lich su thanh toan.");
      }
      return response.json();
    },
    []
  );

  const loadInitialPayments = useCallback(
    async (supplyId: number) => {
      updatePaymentState(supplyId, (prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const data = await fetchPayments(
          supplyId,
          0,
          INITIAL_PAYMENT_LIMIT
        );
        updatePaymentState(supplyId, (prev) => ({
          ...prev,
          baseRows: data.payments || [],
          extraPages: [],
          currentPageIndex: -1,
          nextOffset:
            typeof data.nextOffset === "number"
              ? data.nextOffset
              : (data.payments?.length || 0),
          hasMore: Boolean(data.hasMore),
          loading: false,
          error: null,
          initialized: true,
        }));
      } catch (err) {
        console.error(err);
        updatePaymentState(supplyId, (prev) => ({
          ...prev,
          loading: false,
          error:
            err instanceof Error
              ? err.message
              : "Khong the tai lich su thanh toan.",
        }));
      }
    },
    [fetchPayments, updatePaymentState]
  );

  const loadMorePayments = useCallback(
    async (supplyId: number, offset: number) => {
      updatePaymentState(supplyId, (prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const data = await fetchPayments(
          supplyId,
          Math.max(offset, 0),
          PAYMENT_PAGE_SIZE
        );
        updatePaymentState(supplyId, (prev) => {
          const updatedPages = [...prev.extraPages, data.payments || []];
          return {
            ...prev,
            extraPages: updatedPages,
            currentPageIndex: updatedPages.length - 1,
            nextOffset:
              typeof data.nextOffset === "number"
                ? data.nextOffset
                : prev.nextOffset + (data.payments?.length || 0),
            hasMore: Boolean(data.hasMore),
            loading: false,
            error: null,
            initialized: true,
          };
        });
      } catch (err) {
        console.error(err);
        updatePaymentState(supplyId, (prev) => ({
          ...prev,
          loading: false,
          error:
            err instanceof Error
              ? err.message
              : "Khong the tai lich su thanh toan.",
        }));
      }
    },
    [fetchPayments, updatePaymentState]
  );

  useEffect(() => {
    if (expandedSupplyId === null) return;
    if (!paymentHistory[expandedSupplyId]) {
      loadInitialPayments(expandedSupplyId);
    }
  }, [expandedSupplyId, paymentHistory, loadInitialPayments]);

  const handleLoadMoreClick = (supplyId: number) => {
    const state = paymentHistory[supplyId];
    if (!state) return;
    const nextIndex = state.currentPageIndex + 1;
    const cachedPage = state.extraPages[nextIndex];
    if (cachedPage) {
      updatePaymentState(supplyId, (prev) => ({
        ...prev,
        currentPageIndex: nextIndex,
      }));
      return;
    }
    if (!state.hasMore || state.loading) return;
    loadMorePayments(supplyId, state.nextOffset);
  };

  const handleLoadPreviousClick = (supplyId: number) => {
    const state = paymentHistory[supplyId];
    if (!state || state.currentPageIndex < 0) return;
    updatePaymentState(supplyId, (prev) => ({
      ...prev,
      currentPageIndex: Math.max(prev.currentPageIndex - 1, -1),
    }));
  };

  const renderPaymentRows = (rows: SupplyPayment[]) => {
    if (!rows.length) {
      return (
        <div className="px-4 py-3 text-sm text-gray-500 border-t border-gray-100">
          Chua co du lieu thanh toan.
        </div>
      );
    }

    return rows.map((row) => (
      <div
        key={row.id}
        className="grid grid-cols-4 gap-4 px-4 py-3 text-sm text-gray-700 border-t border-gray-100"
      >
        <span className="font-medium text-gray-900">{row.round || "--"}</span>
        <span>{formatCurrencyVnd(row.totalImport)}</span>
        <span>{formatCurrencyVnd(row.paid)}</span>
        <span className="text-gray-900">{row.status || "--"}</span>
      </div>
    ));
  };

  const renderPaymentHistorySection = (supplyId: number) => {
    const state = paymentHistory[supplyId];
    const isLoading = Boolean(state?.loading);
    const baseRows = state?.baseRows ?? [];
    const extraRows =
      state && state.currentPageIndex >= 0
        ? state.extraPages[state.currentPageIndex] ?? []
        : [];

    return (
      <div className="text-left space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Lich su thanh toan
            </p>
            <p className="text-xs text-gray-500">
              Theo doi cac chu ky thanh toan cua nha cung cap
            </p>
          </div>
          {state?.loading && (
            <span className="text-xs text-blue-600">Dang tai...</span>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-4 gap-4 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
            <span>Chu ky</span>
            <span>Tong tien thanh toan</span>
            <span>Da thanh toan</span>
            <span>Tinh trang</span>
          </div>
          {state?.initialized
            ? renderPaymentRows(baseRows)
            : (
              <div className="px-4 py-3 text-sm text-gray-500 border-t border-gray-100">
                Dang tai du lieu thanh toan...
              </div>
            )}
        </div>

        {state?.error && (
          <div className="text-xs text-red-500">{state.error}</div>
        )}

        {state &&
          state.initialized &&
          !baseRows.length &&
          !isLoading &&
          !state.error && (
            <div className="text-xs text-gray-500">
              Chua co chu ky thanh toan nao.
            </div>
          )}

        {state?.currentPageIndex === -1 && (
          <div className="flex justify-end">
            <button
              className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
              onClick={() => handleLoadMoreClick(supplyId)}
              disabled={state.loading || !state.hasMore}
            >
              Tai them
            </button>
          </div>
        )}

        {state && state.currentPageIndex >= 0 && (
          <div className="space-y-3 border-t border-gray-100 pt-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <button
                className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                onClick={() => handleLoadPreviousClick(supplyId)}
                disabled={state.loading}
              >
                Tai lai
              </button>
              <span className="text-xs text-gray-500">
                Dang xem cac chu ky truoc do
              </span>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-4 gap-4 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                <span>Chu ky</span>
                <span>Tong tien thanh toan</span>
                <span>Da thanh toan</span>
                <span>Tinh trang</span>
              </div>
              {renderPaymentRows(extraRows)}
            </div>

            <div className="flex justify-end">
              <button
                className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
                onClick={() => handleLoadMoreClick(supplyId)}
                disabled={
                  state.loading ||
                  (!state.hasMore &&
                    state.currentPageIndex >= state.extraPages.length - 1)
                }
              >
                Tai them
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetchSupplySummary();
  }, [fetchSupplySummary]);

  const productFilters = useMemo(() => {
    const set = new Set<string>();
    supplies.forEach((supply) => {
      supply.products.forEach((product) => set.add(product));
    });
    return Array.from(set).sort();
  }, [supplies]);

  const filteredSupplies = useMemo(() => {
    const formattedSearch = formatSearchValue(searchTerm);
    return supplies.filter((supply) => {
      const matchesSearch =
        !formattedSearch ||
        supply.sourceName.toLowerCase().includes(formattedSearch) ||
        (supply.bankName || "").toLowerCase().includes(formattedSearch) ||
        (supply.numberBank || "").toLowerCase().includes(formattedSearch) ||
        supply.products.some((product) =>
          product.toLowerCase().includes(formattedSearch)
        );

      const matchesStatus =
        statusFilter === "all" || supply.status === statusFilter;

      const matchesCategory =
        categoryFilter === "all"
          ? true
          : categoryFilter === "no-products"
          ? supply.products.length === 0
          : supply.products.includes(categoryFilter);

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [supplies, searchTerm, statusFilter, categoryFilter]);

  const supplierStats = useMemo(
    () => [
      {
        name: "Tong nha cung cap",
        value: stats.totalSuppliers.toString(),
        color: "bg-blue-500",
      },
      {
        name: "Dang hoat dong",
        value: stats.activeSuppliers.toString(),
        color: "bg-green-500",
      },
      {
        name: "Don hang thang nay",
        value: stats.monthlyOrders.toString(),
        color: "bg-purple-500",
      },
      {
        name: "Gia tri nhap hang",
        value: formatCurrencyShort(stats.totalImportValue),
        color: "bg-orange-500",
      },
    ],
    [stats]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bang thong tin nguon
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Quan ly thong tin nha cung cap va doi tac
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <PlusIcon className="h-4 w-4 mr-2" />
            Them nha cung cap
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {supplierStats.map((stat, index) => (
          <div key={stat.name} className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center">
              <div className={`${stat.color} rounded-lg p-3`}>
                <div className="text-white text-xl font-bold">{index + 1}</div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tim kiem nha cung cap..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">Tat ca nguon</option>
            <option value="no-products">Chua gan san pham</option>
            {productFilters.map((product) => (
              <option key={product} value={product}>
                {product}
              </option>
            ))}
          </select>

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Tat ca trang thai</option>
            <option value="active">Dang hoat dong</option>
            <option value="inactive">Tam ngung</option>
          </select>

          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            Xuat danh sach
          </button>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden max-w-6xl mx-auto">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Nhà Cung Cấp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Thanh Toán
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Đơn Trong Tháng
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Trạng Thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Đơn Hàng Cuối
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Đã Thanh Toán
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Chưa Thanh Toán
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Thao Tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    Dang tai du lieu...
                  </td>
                </tr>
              )}

              {!loading && filteredSupplies.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    Khong tim thay nha cung cap phu hop.
                  </td>
                </tr>
              )}

              {!loading &&
                filteredSupplies.map((supply) => {
                  const isExpanded = expandedSupplyId === supply.id;
                  return (
                    <React.Fragment key={supply.id}>
                      <tr
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleSlotDetails(supply.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                            <ChevronDownIcon
                              className={`h-4 w-4 text-gray-400 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                            <span>{supply.sourceName || "Chua dat ten"}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Tong don: {supply.totalOrders}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {supply.numberBank || "Chua co so tai khoan"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {supply.bankName ||
                              (supply.binBank
                                ? `BIN ${supply.binBank}`
                                : "Chua co ngan hang")}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {supply.monthlyOrders} don
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatCurrencyVnd(supply.monthlyImportValue)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusClasses(
                              supply.status
                            )}`}
                          >
                            {formatStatusLabel(supply.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getFormattedDate(supply.lastOrderDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          --
                          {/* Placeholder until payment calculation is finalised */}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          --
                          {/* Placeholder until payment calculation is finalised */}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                          >
                            Xem
                          </button>
                          <button
                            className="text-green-600 hover:text-green-900"
                            onClick={(event) => {
                              event.stopPropagation();
                            }}
                          >
                            Chinh sua
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="px-6 pb-6">
                            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
                              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm px-6 py-5">
                                {renderPaymentHistorySection(supply.id)}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
