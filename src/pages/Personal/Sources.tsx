import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
  ClipboardDocumentListIcon,
  XCircleIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ShoppingBagIcon,
  PowerIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import StatCard, { STAT_CARD_ACCENTS } from "../../components/StatCard";
import GradientButton from "../../components/GradientButton";
import { SUPPLY_COLS, BANK_LIST_COLS } from "../../lib/tableSql";
import { apiFetch } from "../../lib/api";
import { deleteSupplyById } from "../../lib/suppliesApi";
import * as Helpers from "../../lib/helpers";
import { normalizeErrorMessage } from "../../lib/textUtils";

interface SupplySummaryApiItem {
  id: number;
  sourceName: string;
  numberBank: string | null;
  binBank: string | null;
  bankName: string | null;
  status: string;
  rawStatus?: string | null;
  isActive?: boolean | null;
  products: string[];
  monthlyOrders: number;
  monthlyImportValue: number;
  lastOrderDate: string | null;
  totalOrders: number;
  totalPaidImport: number;
  totalUnpaidImport: number;
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
  isActive?: boolean;
}

interface DeleteConfirmState {
  supply: SupplySummaryItem | null;
  loading: boolean;
  error: string | null;
}

const DEFAULT_STATS: SupplyStats = {
  totalSuppliers: 0,
  activeSuppliers: 0,
  monthlyOrders: 0,
  totalImportValue: 0,
};

// const GLASS_FIELD_CLASS =
//   "w-full rounded-2xl border border-white/60 bg-white/80 px-4 py-2 text-sm text-gray-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 placeholder:text-gray-400";
const formatCurrencyShort = Helpers.formatCurrencyShort;
const formatCurrencyVnd = Helpers.formatCurrency;

const ACTIVE_STATUS_LABEL = "Ðang Ho?t Ð?ng";
const INACTIVE_STATUS_LABEL = "T?m D?ng";
const normalizeStatusValue = (value?: string | null): "active" | "inactive" => {
  if (!value) return "active";

  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  if (
    ["inactive", "tam dung", "tam ngung", "pause", "paused"].includes(
      normalized
    )
  ) {
    return "inactive";
  }
  return "active";
};

const resolveStatusBoolean = (value?: string | boolean | null): boolean => {
  if (typeof value === "boolean") return value;
  return normalizeStatusValue(value) !== "inactive";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";

const getFieldValue = <T,>(
  row: unknown,
  keys: Array<string>,
  fallback: T
): T => {
  if (!isRecord(row)) return fallback;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key] as T;
    }
  }
  return fallback;
};

const parseMoneyValue = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/[^\d-]/g, "");
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const maybeScaleCurrency = (
  value: number,
  referenceA: number,
  referenceB: number
): number => {
  const reference = Math.max(referenceA, referenceB, 0);
  if (reference <= 0) return value;
  const ratio = value / reference;
  if (value > reference && ratio >= 40 && ratio <= 150 && value % 100 === 0) {
    const scaled = Math.round(value / 100);
    if (scaled > 0 && scaled < value) return scaled;
  }
  return value;
};

const DEFAULT_DELETE_ERROR =
  "Có l?i x?y ra khi xóa ngu?n, Vui lòng th? l?i sau.";
const formatDeleteErrorMessage = (raw?: string | null): string =>
  normalizeErrorMessage(raw, {
    fallback: DEFAULT_DELETE_ERROR,
    blockPatterns: [/(cannot\s+delete)/i],
  });

const formatStatusLabel = (status: string | boolean | null | undefined) =>
  resolveStatusBoolean(status) ? ACTIVE_STATUS_LABEL : INACTIVE_STATUS_LABEL;

const getStatusClasses = (status: string | boolean | null | undefined) =>
  resolveStatusBoolean(status)
    ? "bg-green-100 text-green-800"
    : "bg-yellow-100 text-yellow-800";

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
const isSupplyActive = (supply: {
  isActive?: boolean | null;
  status?: string;
}) =>
  resolveStatusBoolean(
    typeof supply.isActive === "boolean" ? supply.isActive : supply.status
  );

const STATUS_OPTIONS = [
  { value: "active", label: ACTIVE_STATUS_LABEL },
  { value: "inactive", label: INACTIVE_STATUS_LABEL },
];

const MODAL_CARD_ACCENTS = {
  sky: {
    iconBg: "from-sky-500 via-sky-400 to-blue-500",
    glow: "from-sky-100/80 via-white/80 to-blue-50/70",
  },
  rose: {
    iconBg: "from-rose-500 via-pink-500 to-red-500",
    glow: "from-rose-100/80 via-white/80 to-red-50/70",
  },
  violet: {
    iconBg: "from-purple-500 via-violet-500 to-indigo-500",
    glow: "from-violet-100/80 via-white/80 to-indigo-50/70",
  },
  emerald: {
    iconBg: "from-emerald-500 via-emerald-400 to-lime-500",
    glow: "from-emerald-100/80 via-white/80 to-lime-50/70",
  },
} as const;

const getLastOrderTimestamp = (value: string | null): number => {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};

const compareSuppliersByPriority = (
  a: SupplySummaryItem,
  b: SupplySummaryItem
): number => {
  const aInactive = a.status === "inactive";
  const bInactive = b.status === "inactive";
  if (aInactive !== bInactive) {
    return aInactive ? 1 : -1;
  }

  const aHasUnpaid = a.totalUnpaidImport > 0 ? 1 : 0;
  const bHasUnpaid = b.totalUnpaidImport > 0 ? 1 : 0;
  if (aHasUnpaid !== bHasUnpaid) {
    return bHasUnpaid - aHasUnpaid;
  }

  if (aHasUnpaid === 1 && bHasUnpaid === 1) {
    if (a.totalUnpaidImport !== b.totalUnpaidImport) {
      return b.totalUnpaidImport - a.totalUnpaidImport;
    }
  } else {
    const aTime = getLastOrderTimestamp(a.lastOrderDate);
    const bTime = getLastOrderTimestamp(b.lastOrderDate);

    if (aTime !== bTime) {
      return bTime - aTime;
    }
  }
  return a.sourceName.localeCompare(b.sourceName);
};

interface SupplyPayment {
  id: number;
  round: string;
  totalImport: number;
  paid: number;
  status: string;
}

interface EditFormState {
  sourceName: string;
  paymentInfo: string;
  bankBin: string;
}

interface PaymentHistoryState {
  pages: SupplyPayment[][];
  currentPage: number;
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

interface PaymentDraftState {
  round: string;
  totalImport: string;
  paid: string;
  status: string;
  isEditing: boolean;
}

interface BankOption {
  bin: string;
  name: string;
}

interface NewSupplierFormState {
  sourceName: string;
  numberBank: string;
  bankBin: string;
  status: string;
}

interface SupplyOverviewStats {
  totalOrders: number;
  canceledOrders: number;
  monthlyOrders: number;
  totalPaidAmount: number;
}

interface SupplyOverviewSupply {
  id: number;
  sourceName: string;
  numberBank: string | null;
  binBank: string | null;
  bankName: string | null;
  status: string | null;
  rawStatus?: string | null;
  isActive?: boolean;
}

interface UnpaidPaymentCycle {
  id: number;
  round: string;
  totalImport: number;
  paid: number;
  status: string;
}

interface SupplyOverviewResponse {
  supply: SupplyOverviewSupply;
  stats: SupplyOverviewStats;
  unpaidPayments: UnpaidPaymentCycle[];
}

interface ViewSupplierModalState {
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  supplyId: number | null;
  data: SupplyOverviewResponse | null;
  selectedPaymentId: number | null;
  confirming: boolean;
  confirmError: string | null;
}

const INITIAL_PAYMENT_LIMIT = 3;
const PAYMENT_PAGE_SIZE = 5;

const createDefaultPaymentState = (): PaymentHistoryState => ({
  pages: [[]],
  currentPage: 0,
  nextOffset: 0,
  hasMore: false,
  loading: false,
  error: null,
  initialized: false,
});

const createInitialNewSupplierForm = (
  defaultStatus: string
): NewSupplierFormState => ({
  sourceName: "",
  numberBank: "",
  bankBin: "",
  status: defaultStatus,
});

const normalizeSupplyFromRow = (
  row: unknown
): {
  id: number;
  sourceName: string;
  numberBank: string | null;
  binBank: string | null;
  bankName: string | null;
  rawStatus: string | null;
  isActive: boolean;
} => {
  const sourceName = getFieldValue<string>(
    row,
    ["sourceName", SUPPLY_COLS.sourceName],
    ""
  );
  const numberBank = getFieldValue<string | null>(
    row,
    ["numberBank", SUPPLY_COLS.numberBank],
    null
  );
  const binBank = getFieldValue<string | null>(
    row,
    ["binBank", SUPPLY_COLS.binBank],
    null
  );
  const bankName = getFieldValue<string | null>(
    row,
    ["bankName", BANK_LIST_COLS.bankName],
    null
  );
  const rawStatus = getFieldValue<string | null>(
    row,
    ["rawStatus", "raw_status", "status"],
    null
  );
  const activeFromRow = getFieldValue<boolean | null>(
    row,
    ["isActive", SUPPLY_COLS.activeSupply, "active_supply"],
    null
  );
  const isActive =
    typeof activeFromRow === "boolean"
      ? activeFromRow
      : normalizeStatusValue(rawStatus) !== "inactive";

  return {
    id: Number(getFieldValue(row, ["id", SUPPLY_COLS.id], 0)) || 0,
    sourceName,
    numberBank,
    binBank,
    bankName,
    rawStatus,
    isActive,
  };
};

const normalizeSupplyOverviewResponse = (
  payload: unknown
): SupplyOverviewResponse => {
  const recordPayload = isRecord(payload) ? payload : {};
  const supplySection = isRecord(recordPayload.supply)
    ? recordPayload.supply
    : payload ?? {};
  const supply = normalizeSupplyFromRow(supplySection);
  const statsRow = isRecord(recordPayload.stats) ? recordPayload.stats : {};
  const unpaidPaymentsRaw = Array.isArray(recordPayload.unpaidPayments)
    ? recordPayload.unpaidPayments
    : [];

  return {
    supply: {
      ...supply,
      status: supply.isActive ? "active" : "inactive",
    },
    stats: {
      totalOrders:
        Number(getFieldValue(statsRow, ["totalOrders", "total_orders"], 0)) ||
        0,
      canceledOrders:
        Number(
          getFieldValue(statsRow, ["canceledOrders", "canceled_orders"], 0)
        ) || 0,
      monthlyOrders:
        Number(
          getFieldValue(statsRow, ["monthlyOrders", "monthly_orders"], 0)
        ) || 0,
      totalPaidAmount:
        Number(
          getFieldValue(statsRow, ["totalPaidAmount", "total_paid_amount"], 0)
        ) || 0,
    },
    unpaidPayments: unpaidPaymentsRaw.map((row) => ({
      id: Number(getFieldValue(row, ["id"], 0)) || 0,
      round: getFieldValue<string>(row, ["round"], ""),
      totalImport:
        Number(getFieldValue(row, ["totalImport", "import_value"], 0)) || 0,
      paid: Number(getFieldValue(row, ["paid", "paid_value"], 0)) || 0,
      status: getFieldValue<string>(row, ["status", "status_label"], ""),
    })),
  };
};

export default function Sources() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplies, setSupplies] = useState<SupplySummaryItem[]>([]);
  const [stats, setStats] = useState<SupplyStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSupplyId, setExpandedSupplyId] = useState<number | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<
    Record<number, PaymentHistoryState>
  >({});
  const [paymentDrafts, setPaymentDrafts] = useState<
    Record<number, PaymentDraftState>
  >({});
  const [paymentSubmittingMap, setPaymentSubmittingMap] = useState<
    Record<number, boolean>
  >({});

  const formatMoneyInput = (raw: string): string => {
    const digits = (raw || "").replace(/[^\d]/g, "");
    if (!digits) return "";
    const num = Number(digits);
    if (!Number.isFinite(num)) return digits;
    return num.toLocaleString("vi-VN");
  };
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalError, setAddModalError] = useState<string | null>(null);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [newSupplierForm, setNewSupplierForm] = useState<NewSupplierFormState>(
    createInitialNewSupplierForm(STATUS_OPTIONS[0].value)
  );
  const [viewModalState, setViewModalState] = useState<ViewSupplierModalState>({
    isOpen: false,
    loading: false,
    error: null,
    supplyId: null,
    data: null,
    selectedPaymentId: null,
    confirming: false,
    confirmError: null,
  });
  const [editingSupplyId, setEditingSupplyId] = useState<number | null>(null);
  const [editFormValues, setEditFormValues] = useState<EditFormState>({
    sourceName: "",
    paymentInfo: "",
    bankBin: "",
  });
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [statusLoadingMap, setStatusLoadingMap] = useState<
    Record<number, boolean>
  >({});
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
  const [deleteConfirmState, setDeleteConfirmState] =
    useState<DeleteConfirmState>({
      supply: null,
      loading: false,
      error: null,
    });
  const fetchSupplySummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch("/api/supply-insights");
      if (!response.ok) {
        throw new Error("Không th? t?i d? li?u nhà cung c?p");
      }
      const data: SupplySummaryResponse = await response.json();
      const normalizedSupplies: SupplySummaryItem[] = Array.isArray(
        data.supplies
      )
        ? data.supplies.map((item) => {
            const baseSupply = normalizeSupplyFromRow(item);
            const monthlyImportValue = parseMoneyValue(
              getFieldValue(
                item,
                ["monthlyImportValue", "monthly_import_value"],
                0
              )
            );
            const totalPaidImport = parseMoneyValue(
              getFieldValue(
                item,
                ["totalPaidImport", "total_paid_import"],
                0
              )
            );
            const rawUnpaidImport = parseMoneyValue(
              getFieldValue(
                item,
                ["totalUnpaidImport", "total_unpaid_import"],
                0
              )
            );
            // Display exactly the DB import value (no scaling).
            const totalUnpaidImport = rawUnpaidImport;
            return {
              ...item,
              ...baseSupply,
              status: baseSupply.isActive ? "active" : "inactive",
              products: normalizeProducts(item.products),
              monthlyOrders:
                Number(
                  getFieldValue(item, ["monthlyOrders", "monthly_orders"], 0)
                ) || 0,
              monthlyImportValue,
              totalOrders:
                Number(
                  getFieldValue(item, ["totalOrders", "total_orders"], 0)
                ) || 0,
              totalPaidImport,
              totalUnpaidImport,
            } as SupplySummaryItem;
          })
        : [];
      setSupplies(normalizedSupplies);
      const statsPayload = data.stats ?? {};
      setStats({
        totalSuppliers:
          Number(
            getFieldValue(
              statsPayload,
              ["totalSuppliers", "total_suppliers"],
              0
            )
          ) || 0,
        activeSuppliers:
          Number(
            getFieldValue(
              statsPayload,
              ["activeSuppliers", "active_suppliers"],
              0
            )
          ) ||
          normalizedSupplies.filter((supply) => isSupplyActive(supply)).length,
        monthlyOrders:
          Number(
            getFieldValue(statsPayload, ["monthlyOrders", "monthly_orders"], 0)
          ) || 0,
        totalImportValue:
          Number(
            getFieldValue(
              statsPayload,
              ["totalImportValue", "total_import_value"],
              0
            )
          ) || 0,
      });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Có l?i x?y ra khi t?i d? li?u."
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
        const errorData = (await response.json().catch(() => null)) as { error?: string } | null;
        const message =
          errorData?.error || "Khong the tai lich su thanh toan.";
        throw new Error(message);
      }
      const data = (await response.json()) as PaymentHistoryResponse;
      return data;
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
        const data = await fetchPayments(supplyId, 0, INITIAL_PAYMENT_LIMIT);
        updatePaymentState(supplyId, (prev) => ({
          ...prev,
          pages: [data.payments || []],
          currentPage: 0,
          nextOffset:
            typeof data.nextOffset === "number"
              ? data.nextOffset
              : data.payments?.length || 0,
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
              : "Không th? t?i l?ch s? thanh toán.",
        }));
      }
    },
    [fetchPayments, updatePaymentState]
  );

  const loadMorePayments = useCallback(
    async (supplyId: number) => {
      const state = paymentHistory[supplyId];
      if (!state || state.loading || !state.hasMore) return;

      updatePaymentState(supplyId, (prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));

      try {
        const data = await fetchPayments(
          supplyId,
          Math.max(state.nextOffset, 0),
          PAYMENT_PAGE_SIZE
        );
        updatePaymentState(supplyId, (prev) => {
          const updatedPages = [...prev.pages, data.payments || []];
          return {
            ...prev,
            pages: updatedPages,
            currentPage: updatedPages.length - 1,
            nextOffset:
              typeof data.nextOffset === "number"
                ? data.nextOffset
                : prev.nextOffset + (data.payments?.length || 0),
            hasMore: Boolean(data.hasMore),
            loading: false,
            error: null,
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
              : "Không th? t?i l?ch s? thanh toán.",
        }));
      }
    },
    [fetchPayments, paymentHistory, updatePaymentState]
  );
  useEffect(() => {
    if (expandedSupplyId === null) return;
    if (!paymentHistory[expandedSupplyId]) {
      loadInitialPayments(expandedSupplyId);
    }
  }, [expandedSupplyId, paymentHistory, loadInitialPayments]);

  const goToPage = useCallback(
    (supplyId: number, targetPage: number) => {
      const state = paymentHistory[supplyId];
      if (!state) return;
      const clampedTarget = Math.max(0, targetPage);

      if (clampedTarget < state.pages.length) {
        updatePaymentState(supplyId, (prev) => ({
          ...prev,
          currentPage: clampedTarget,
        }));
        return;
      }

      if (
        clampedTarget === state.pages.length &&
        state.hasMore &&
        !state.loading
      ) {
        loadMorePayments(supplyId);
      }
    },
    [paymentHistory, loadMorePayments, updatePaymentState]
  );

  const startAddPaymentCycle = useCallback((supplyId: number) => {
    setPaymentDrafts((prev) => ({
      ...prev,
      [supplyId]: {
        round: prev[supplyId]?.round || "",
        totalImport: prev[supplyId]?.totalImport || "",
        paid: prev[supplyId]?.paid || "",
        status: prev[supplyId]?.status || "Chua Thanh Toán",
        isEditing: true,
      },
    }));
  }, []);

  const cancelAddPaymentCycle = useCallback((supplyId: number) => {
    setPaymentDrafts((prev) => ({
      ...prev,
      [supplyId]: {
        round: "",
        totalImport: "",
        paid: "",
        status: "Chua Thanh Toán",
        isEditing: false,
      },
    }));
  }, []);

  const handlePaymentDraftChange = useCallback(
    (
      supplyId: number,
      field: keyof Omit<PaymentDraftState, "isEditing">,
      value: string
    ) => {
      setPaymentDrafts((prev) => ({
        ...prev,
        [supplyId]: {
          round: prev[supplyId]?.round || "",
          totalImport: prev[supplyId]?.totalImport || "",
          paid: prev[supplyId]?.paid || "",
          status: prev[supplyId]?.status || "Chua Thanh Toán",
          isEditing: true,
          [field]: value,
        },
      }));
    },
    []
  );

  const handleMoneyDraftChange = useCallback(
    (supplyId: number, field: "totalImport" | "paid", rawValue: string) => {
      const formatted = formatMoneyInput(rawValue);
      const rawDigits = formatted.replace(/[^\d]/g, "");
      handlePaymentDraftChange(supplyId, field, rawDigits);
    },
    [handlePaymentDraftChange]
  );

  const confirmAddPaymentCycle = useCallback(
    async (supplyId: number) => {
      const draft = paymentDrafts[supplyId];
      if (!draft || !draft.isEditing) return;

      const parsedTotal = Number(
        (draft.totalImport || "").replace(/[^\d.-]/g, "")
      );
      const parsedPaid = Number((draft.paid || "").replace(/[^\d.-]/g, ""));

      const payload = {
        round: draft.round.trim() || "Chu K? M?i",
        totalImport: Number.isFinite(parsedTotal) ? parsedTotal : 0,
        paid: Number.isFinite(parsedPaid) ? parsedPaid : 0,
        status: draft.status.trim() || "Chua Thanh Toán",
      };

      setPaymentSubmittingMap((prev) => ({ ...prev, [supplyId]: true }));
      updatePaymentState(supplyId, (prev) => ({ ...prev, error: null }));

      try {
        const response = await apiFetch(`/api/supplies/${supplyId}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorText = await response.text().catch(() => "");
          throw new Error(
            errorText?.trim() || "Không th? t?i l?ch s? thanh toán."
          );
        }
        const data = await response.json();
        const newPayment: SupplyPayment = {
          id: data.id ?? Date.now(),
          round: data.round ?? payload.round,
          totalImport: Number(data.totalImport) || payload.totalImport,
          paid: Number(data.paid) || payload.paid,
          status: data.status ?? payload.status,
        };

        updatePaymentState(supplyId, (prev) => {
          const pages = prev.pages.length
            ? prev.pages.map((page) => [...page])
            : [[]];
          const firstPage = pages[0] ? [...pages[0]] : [];
          pages[0] = [newPayment, ...firstPage];
          return {
            ...prev,
            pages,
            currentPage: 0,
            initialized: true,
            error: null,
          };
        });

        setPaymentDrafts((prev) => ({
          ...prev,
          [supplyId]: {
            round: "",
            totalImport: "",
            paid: "",
            status: "Chua Thanh Toán",
            isEditing: false,
          },
        }));
      } catch (error) {
        console.error(error);
        updatePaymentState(supplyId, (prev) => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : "Không th? t?i l?ch s? thanh toán.",
        }));
      } finally {
        setPaymentSubmittingMap((prev) => {
          const next = { ...prev };
          delete next[supplyId];
          return next;
        });
      }
    },
    [paymentDrafts, updatePaymentState]
  );

  const openAddSupplierModal = useCallback(() => {
    setNewSupplierForm({
      sourceName: "",
      numberBank: "",
      bankBin: bankOptions[0]?.bin || "",
      status: STATUS_OPTIONS[0].value,
    });
    setAddModalError(null);
    setAddModalOpen(true);
  }, [bankOptions]);

  const closeAddSupplierModal = useCallback(() => {
    if (isCreatingSupplier) return;
    setAddModalOpen(false);
  }, [isCreatingSupplier]);

  const handleNewSupplierChange = useCallback(
    (field: keyof NewSupplierFormState, value: string) => {
      setNewSupplierForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  const handleCreateSupplierSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedName = newSupplierForm.sourceName.trim();
      if (!trimmedName) {
        setAddModalError("Vui lòng nh?p tên nhà cung c?p");
        return;
      }
      if (!newSupplierForm.bankBin) {
        setAddModalError("Vui lòng ch?n ngân hàng");
        return;
      }
      setIsCreatingSupplier(true);
      setAddModalError(null);
      try {
        const payload = {
          sourceName: trimmedName,
          numberBank: newSupplierForm.numberBank.trim(),
          bankBin: newSupplierForm.bankBin,
          status: newSupplierForm.status,
        };
        const response = await apiFetch("/api/supplies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          let message = "Không th? t?o nhà cung c?p.";
          try {
            const data = await response.json();
            if (data?.error) message = data.error;
          } catch {
            /* ignore */
          }
          throw new Error(message);
        }
        await fetchSupplySummary();
        closeAddSupplierModal();
      } catch (error) {
        console.error(error);
        setAddModalError(
          error instanceof Error ? error.message : "Không th? t?o nhà cung c?p"
        );
      } finally {
        setIsCreatingSupplier(false);
      }
    },
    [closeAddSupplierModal, fetchSupplySummary, newSupplierForm]
  );

  const fetchSupplyOverview = useCallback(async (supplyId: number) => {
    setViewModalState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));
    try {
      const response = await apiFetch(`/api/supplies/${supplyId}/overview`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          errorText || "Không th? t?i thông tin chi ti?t nhà cung c?p"
        );
      }
      const raw = await response.json();
      const data: SupplyOverviewResponse = normalizeSupplyOverviewResponse(raw);
      setViewModalState((prev) => ({
        ...prev,
        loading: false,
        data,
        selectedPaymentId: data.unpaidPayments[0]?.id ?? null,
      }));
    } catch (error) {
      console.error(error);
      setViewModalState((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Không th? t?i thông tin chi ti?t nhà cung c?p",
      }));
    }
  }, []);

  const openViewModal = useCallback(
    (supplyId: number) => {
      setViewModalState({
        isOpen: true,
        loading: true,
        error: null,
        supplyId,
        data: null,
        selectedPaymentId: null,
        confirming: false,
        confirmError: null,
      });
      fetchSupplyOverview(supplyId);
    },
    [fetchSupplyOverview]
  );

  const closeViewModal = useCallback(() => {
    setViewModalState({
      isOpen: false,
      loading: false,
      error: null,
      supplyId: null,
      data: null,
      selectedPaymentId: null,
      confirming: false,
      confirmError: null,
    });
  }, []);

  const handleSelectPaymentCycle = useCallback((paymentId: number) => {
    setViewModalState((prev) => ({
      ...prev,
      selectedPaymentId: paymentId,
      confirmError: null,
    }));
  }, []);

  const handleConfirmPayment = useCallback(async () => {
    setViewModalState((prev) => ({
      ...prev,
      confirmError: null,
      confirming: true,
    }));
    const confirmFallbackMessage = "Không th? t?i l?ch s? thanh toán.";
    try {
      const { supplyId, data, selectedPaymentId } = viewModalState;
      if (!supplyId || !data || !selectedPaymentId) {
        throw new Error(confirmFallbackMessage);
      }
      const payment = data.unpaidPayments.find(
        (item) => item.id === selectedPaymentId
      );
      if (!payment) {
        throw new Error(confirmFallbackMessage);
      }
      const response = await apiFetch(
        `/api/payment-supply/${payment.id}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paidAmount: payment.totalImport }),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Không th? xác nh?n dã thanh toán");
      }
      await fetchSupplyOverview(supplyId);
      await fetchSupplySummary();
    } catch (error) {
      console.error(error);
      setViewModalState((prev) => ({
        ...prev,
        confirmError:
          error instanceof Error
            ? error.message
            : "Không th? xác nh?n dã thanh toán",
      }));
    } finally {
      setViewModalState((prev) => ({
        ...prev,
        confirming: false,
      }));
    }
  }, [fetchSupplyOverview, fetchSupplySummary, viewModalState]);

  const openEditForm = useCallback((supply: SupplySummaryItem) => {
    setEditingSupplyId(supply.id);
    setEditFormError(null);
    setIsSubmittingEdit(false);
    setEditFormValues({
      sourceName: supply.sourceName || "",
      paymentInfo: supply.numberBank || "",
      bankBin: supply.binBank || "",
    });
  }, []);

  const closeEditForm = useCallback(() => {
    if (isSubmittingEdit) return;
    setEditingSupplyId(null);
    setEditFormError(null);
  }, [isSubmittingEdit]);

  const handleEditInputChange = useCallback(
    (field: keyof EditFormState, value: string) => {
      setEditFormValues((prev) => ({
        ...prev,
        [field]: value,
      }));
      setEditFormError(null);
    },
    []
  );

  const bankNameByBin = useMemo(() => {
    const map = new Map<string, string>();
    bankOptions.forEach((bank) => {
      if (bank.bin) {
        map.set(bank.bin.trim(), bank.name || "");
      }
    });
    return map;
  }, [bankOptions]);

  const handleEditSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (editingSupplyId === null || isSubmittingEdit) return;

      const currentSupply = supplies.find(
        (supply) => supply.id === editingSupplyId
      );
      if (!currentSupply) {
        setEditFormError("Không tìm th?y nhà cung c?p.");
        return;
      }

      const trimmedName = editFormValues.sourceName.trim();
      if (!trimmedName) {
        setEditFormError("Vui lòng nh?p tên ngu?n.");
        return;
      }

      const trimmedPayment = editFormValues.paymentInfo.trim();
      const trimmedBankBin = editFormValues.bankBin.trim();
      const resolvedBankBin = trimmedBankBin || currentSupply.binBank || "";

      setIsSubmittingEdit(true);
      setEditFormError(null);

      try {
        const payload = {
          sourceName: trimmedName,
          numberBank: trimmedPayment,
          bankBin: resolvedBankBin,
          bankName:
            resolvedBankBin && bankNameByBin.has(resolvedBankBin)
              ? bankNameByBin.get(resolvedBankBin)
              : currentSupply.bankName,
        };
        const response = await apiFetch(`/api/supplies/${editingSupplyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            errorText || "Không th? c?p nh?t thông tin nhà cung c?p."
          );
        }
        const updatedRaw = await response.json().catch(() => ({}));
        const updated =
          updatedRaw && typeof updatedRaw === "object" ? updatedRaw : {};
        setSupplies((prev) =>
          prev.map((supply) =>
            supply.id === editingSupplyId
              ? {
                  ...supply,
                  sourceName: updated.sourceName ?? trimmedName,
                  numberBank:
                    "numberBank" in updated
                      ? updated.numberBank
                      : trimmedPayment || null,
                  binBank:
                    "binBank" in updated
                      ? updated.binBank
                      : resolvedBankBin || null,
                  bankName:
                    "bankName" in updated
                      ? updated.bankName
                      : resolvedBankBin
                      ? bankNameByBin.get(resolvedBankBin) ||
                        supply.bankName ||
                        `BIN ${resolvedBankBin}`
                      : supply.bankName ?? null,
                }
              : supply
          )
        );
        closeEditForm();
      } catch (error) {
        console.error(error);
        setEditFormError(
          error instanceof Error
            ? error.message
            : "Không th? c?p nh?t nhà cung c?p."
        );
      } finally {
        setIsSubmittingEdit(false);
      }
    },
    [
      bankNameByBin,
      closeEditForm,
      editFormValues.bankBin,
      editFormValues.paymentInfo,
      editFormValues.sourceName,
      editingSupplyId,
      isSubmittingEdit,
      setSupplies,
      supplies,
    ]
  );

  const handleToggleSupplyStatus = useCallback(
    async (supply: SupplySummaryItem) => {
      const previousState = isSupplyActive(supply);
      const nextState = !previousState;
      setStatusLoadingMap((prev) => ({ ...prev, [supply.id]: true }));
      setSupplies((prev) =>
        prev.map((row) =>
          row.id === supply.id
            ? {
                ...row,
                isActive: nextState,
                status: nextState ? "active" : "inactive",
              }
            : row
        )
      );

      try {
        const response = await apiFetch(`/api/supplies/${supply.id}/active`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: nextState }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Không th? c?p nh?t tr?ng thái");
        }

        const payload: { isActive?: boolean } = await response.json();
        const resolvedState =
          typeof payload?.isActive === "boolean" ? payload.isActive : nextState;
        setSupplies((prev) =>
          prev.map((row) =>
            row.id === supply.id
              ? {
                  ...row,
                  isActive: resolvedState,
                  status: resolvedState ? "active" : "inactive",
                }
              : row
          )
        );
      } catch (error) {
        console.error("Không th? thay d?i tr?ng thái:", error);

        alert(
          error instanceof Error
            ? error.message
            : "Không th? c?p nh?t tr?ng thái"
        );
        setSupplies((prev) =>
          prev.map((row) =>
            row.id === supply.id
              ? {
                  ...row,
                  isActive: previousState,
                  status: previousState ? "active" : "inactive",
                }
              : row
          )
        );
      } finally {
        setStatusLoadingMap((prev) => {
          const next = { ...prev };
          delete next[supply.id];
          return next;
        });
      }
    },
    []
  );

  const handleDeleteSupply = useCallback((supply: SupplySummaryItem) => {
    setDeleteConfirmState({
      supply,
      loading: false,
      error: null,
    });
  }, []);
  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirmState({
      supply: null,
      loading: false,
      error: null,
    });
  }, []);

  const confirmDeleteSupply = useCallback(async () => {
    const supply = deleteConfirmState.supply;
    if (!supply) return;
    setDeleteConfirmState((prev) => ({ ...prev, loading: true, error: null }));
    setDeleteLoadingId(supply.id);
    try {
      const response = await deleteSupplyById(supply.id);
      if (!response.success) {
        throw new Error(response.message || DEFAULT_DELETE_ERROR);
      }
      setSupplies((prev) =>
        prev.filter((existingSupply) => existingSupply.id !== supply.id)
      );
      closeDeleteConfirm();
    } catch (error) {
      console.error("Không th? xóa:", error);
      setDeleteConfirmState((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error
            ? formatDeleteErrorMessage(error.message)
            : DEFAULT_DELETE_ERROR,
      }));
    } finally {
      setDeleteLoadingId(null);
    }
  }, [closeDeleteConfirm, deleteConfirmState.supply, setSupplies]);

  const renderPaymentRows = (
    rows: SupplyPayment[],
    initialized: boolean,
    hasDraftRow = false,
    supplyId?: number
  ) => {
    if (!initialized && !hasDraftRow) {
      return (
        <tr>
          <td
            colSpan={4}
            className="px-6 py-4 text-sm text-white/80 text-center"
          >
            Ðang t?i l?ch s? thanh toán...
          </td>
        </tr>
      );
    }

    if (!rows.length && !hasDraftRow) {
      return (
        <tr>
          <td
            colSpan={3}
            className="px-6 py-4 text-sm text-white/80 text-center"
          >
            Chua có l?ch s? thanh toán.
          </td>
          <td className="px-4 py-4 text-center">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-white/40 text-white/80 hover:border-blue-400 hover:text-blue-200 transition"
              title="Thêm chu k? thanh toán"
              onClick={() =>
                supplyId !== undefined && startAddPaymentCycle(supplyId)
              }
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </td>
        </tr>
      );
    }

    if (!rows.length && hasDraftRow) {
      return null;
    }

    const renderedRows = rows.map((row) => (
      <tr key={row.id} className="border-t border-white/10 text-sm text-white">
        <td className="px-4 py-4 font-medium text-white text-left sm:text-center">
          {row.round || "--"}
        </td>
        <td className="px-4 py-4 text-center">
          {formatCurrencyVnd(row.totalImport)}
        </td>
        <td className="px-4 py-4 text-center">{formatCurrencyVnd(row.paid)}</td>
        <td className="px-4 py-4 text-center text-white">
          {row.status || "--"}
        </td>
      </tr>
    ));

    if (!hasDraftRow && supplyId !== undefined) {
      renderedRows.push(
        <tr key="add-payment-row" className="border-t border-white/10 text-sm text-white">
          <td className="px-4 py-4 text-left sm:text-center" colSpan={3}>
            <span className="text-white/70">Thêm chu k? thanh toán m?i</span>
          </td>
          <td className="px-4 py-4 text-center">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-white/40 text-white/80 hover:border-blue-400 hover:text-blue-200 transition"
              title="Thêm chu k? thanh toán"
              onClick={() => startAddPaymentCycle(supplyId)}
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </td>
        </tr>
      );
    }

    return renderedRows;
  };

  const renderAddPaymentRow = (supplyId: number, draft?: PaymentDraftState) => {
    if (!draft || !draft.isEditing) return null;
    const isSubmitting = paymentSubmittingMap[supplyId] === true;
    return (
      <tr className="border-t border-white/10 text-sm text-white bg-gray-50/60">
        <td className="px-4 py-3">
          <input
            type="text"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
            placeholder="VD: Chu K? 1"
            value={draft.round}
            disabled={isSubmitting}
            onChange={(event) =>
              handlePaymentDraftChange(supplyId, "round", event.target.value)
            }
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="text"
            inputMode="numeric"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
            placeholder="T?ng Ti?n Nh?p"
            value={formatMoneyInput(draft.totalImport)}
            disabled={isSubmitting}
            onChange={(event) =>
              handleMoneyDraftChange(
                supplyId,
                "totalImport",
                event.target.value
              )
            }
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="text"
            inputMode="numeric"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
            placeholder="Ðã Thanh Toán"
            value={formatMoneyInput(draft.paid)}
            disabled={isSubmitting}
            onChange={(event) =>
              handleMoneyDraftChange(supplyId, "paid", event.target.value)
            }
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <select
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              value={draft.status}
              disabled={isSubmitting}
              onChange={(event) =>
                handlePaymentDraftChange(supplyId, "status", event.target.value)
              }
            >
              <option value="Chua Thanh Toán">Chua Thanh Toán</option>
              <option value="Ðã Thanh Toán">Ðã Thanh Toán</option>
              <option value="C?n Gia H?n">C?n Gia H?n</option>
            </select>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="h-9 w-9 rounded-full bg-emerald-500 text-white shadow hover:bg-emerald-600 transition"
                title="Xác Nh?n"
                disabled={isSubmitting}
                onClick={() => confirmAddPaymentCycle(supplyId)}
              >
                <CheckIcon className="h-5 w-5 mx-auto" />
              </button>
              <button
                type="button"
                className="h-9 w-9 rounded-full bg-rose-500 text-white shadow hover:bg-rose-600 transition"
                title="H?y"
                disabled={isSubmitting}
                onClick={() => cancelAddPaymentCycle(supplyId)}
              >
                <XMarkIcon className="h-5 w-5 mx-auto" />
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  const renderPaymentHistorySection = (supplyId: number) => {
    const state = paymentHistory[supplyId];
    const currentRows =
      state && state.pages[state.currentPage]
        ? state.pages[state.currentPage]
        : [];
    const draft = paymentDrafts[supplyId];
    const addRow = renderAddPaymentRow(supplyId, draft);
    const hasDraftRow = Boolean(addRow);

    const renderPaginationControls = () => {
      if (!state || !state.initialized) return null;
      const totalPages = state.pages.length;
      const canGoPrev = state.currentPage > 0;
      const canGoNext = state.hasMore || state.currentPage < totalPages - 1;

      if (totalPages <= 1 && !state.hasMore) return null;

      const pageButtons = state.pages.map((_, index) => (
        <button
          key={index}
          className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
            state.currentPage === index
              ? "bg-orange-500 text-white"
              : "text-gray-600 hover:bg-indigo-500/15"
          }`}
          onClick={() => goToPage(supplyId, index)}
          disabled={state.loading && state.currentPage === index}
        >
          {index + 1}
        </button>
      ));

      return (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            className="w-9 h-9 rounded-lg text-gray-500 hover:bg-indigo-500/15 disabled:opacity-40"
            onClick={() => goToPage(supplyId, state.currentPage - 1)}
            disabled={!canGoPrev}
          >
            &lt;
          </button>
          {pageButtons}
          {state.hasMore && (
            <>
              <span className="text-gray-400 px-1">...</span>
            </>
          )}
          <button
            className="w-9 h-9 rounded-lg text-gray-500 hover:bg-indigo-500/15 disabled:opacity-40"
            onClick={() => goToPage(supplyId, state.currentPage + 1)}
            disabled={!canGoNext}
          >
            &gt;
          </button>
        </div>
      );
    };
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 text-center text-white">
            <p className="text-sm font-semibold text-white">
              L?ch s? thanh toán
            </p>
            <p className="text-xs text-white/80">
              Theo dõi các chu k? thanh toán c?a nhà cung c?p
            </p>
          </div>
        </div>
        {state?.loading && (
          <div className="text-center text-xs text-white/80">Ðang t?i...</div>
        )}

        {state?.error && (
          <div className="text-center text-xs text-red-200">{state.error}</div>
        )}

        <div className="flex justify-center">
          <div className="w-full max-w-4xl rounded-2xl border border-white/15 bg-gradient-to-br from-indigo-950/80 via-slate-900/70 to-indigo-950/80 shadow-lg overflow-hidden text-white backdrop-blur">
            <table className="w-full">
              <thead className="bg-white/5 text-[11px] uppercase text-white/80 tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left sm:text-center">Chu K?</th>
                  <th className="px-6 py-3 text-center">T?ng Ti?n Nh?p</th>
                  <th className="px-6 py-3 text-center">Ðã Thanh Toán</th>
                  <th className="px-6 py-3 text-center">Tr?ng Thái</th>
                </tr>
              </thead>
              <tbody>
                {addRow}
                {renderPaymentRows(
                  currentRows,
                  Boolean(state?.initialized),
                  hasDraftRow,
                  supplyId
                )}
              </tbody>
            </table>
          </div>
        </div>

        {renderPaginationControls()}
      </div>
    );
  };

  const renderEditModal = () => {
    if (editingSupplyId === null) return null;
    const currentSupply = supplies.find(
      (supply) => supply.id === editingSupplyId
    );
    const currentBankBinValue = editFormValues.bankBin.trim();
    const hasCurrentBankInOptions =
      !!currentBankBinValue &&
      bankOptions.some(
        (bankOption) => bankOption.bin.trim() === currentBankBinValue.trim()
      );
    const bankOptionsForEdit =
      hasCurrentBankInOptions || !currentBankBinValue
        ? bankOptions
        : [
            {
              bin: currentBankBinValue,
              name:
                currentSupply?.bankName ||
                bankNameByBin.get(currentBankBinValue) ||
                `BIN ${currentBankBinValue}`,
            },
            ...bankOptions,
          ];
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
        onClick={closeEditForm}
      >
        <div
          className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                Ch?nh S?a Nhà Cung C?p
              </p>
              <p className="text-xs text-white/80">
                C?p nh?t tên, tài kho?n và ngân hàng
              </p>
            </div>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600"
              onClick={closeEditForm}
            >
              &#10005;
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên Ngu?n
              </label>
              <input
                type="text"
                value={editFormValues.sourceName}
                onChange={(event) =>
                  handleEditInputChange("sourceName", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Nh?p Tên Ngu?n"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                S? Tài Kho?n
              </label>
              <input
                type="text"
                value={editFormValues.paymentInfo}
                onChange={(event) =>
                  handleEditInputChange("paymentInfo", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Nh?p S? Tài Kho?n"
              />
              {(currentSupply?.bankName ||
                (currentSupply?.binBank
                  ? bankNameByBin.get(currentSupply.binBank.trim())
                  : null)) && (
                <p className="mt-1 text-xs text-white/80">
                  Ngân Hàng:{" "}
                  {currentSupply?.bankName ||
                    (currentSupply?.binBank
                      ? bankNameByBin.get(currentSupply.binBank.trim())
                      : "")}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngân Hàng
              </label>
              <select
                value={editFormValues.bankBin}
                onChange={(event) =>
                  handleEditInputChange("bankBin", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="" disabled>
                  Ch?n Ngân Hàng
                </option>
                {bankOptionsForEdit.map((bank) => (
                  <option key={bank.bin} value={bank.bin}>
                    {bank.name || `BIN ${bank.bin}`}
                  </option>
                ))}
              </select>
            </div>
            {editFormError && (
              <p className="text-sm text-red-500">{editFormError}</p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg border border-gray-200 hover:bg-indigo-500/10"
                onClick={closeEditForm}
                disabled={isSubmittingEdit}
              >
                H?y
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                disabled={isSubmittingEdit}
              >
                {isSubmittingEdit ? "Ðang Luu..." : "Luu Thông Tin"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  const renderDeleteConfirmModal = () => {
    const { supply, loading, error } = deleteConfirmState;
    if (!supply) return null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
        onClick={() => {
          if (!loading) {
            closeDeleteConfirm();
          }
        }}
      >
        <div
          className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-lg font-semibold text-rose-500">
                Xác Nh?n Xóa
              </p>
              <p className="text-xs text-slate-200">
                Hành d?ng này s? xóa ngu?n kh?i d? li?u.
              </p>
            </div>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              onClick={closeDeleteConfirm}
              disabled={loading}
            >
              &#10005;
            </button>
          </div>
          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <p className="font-semibold text-white">
                {supply.sourceName || "Ngu?n Không Tên"}
              </p>
              <p className="text-xs text-slate-200">
                {supply.numberBank
                  ? `S? Tài Kho?n: ${supply.numberBank}`
                  : "Chua Có Thông Tin Thanh Toán"}
              </p>
            </div>
            <p>
              B?n ch?c ch?n mu?n xóa ngu?n này? Hành d?ng không th? hoàn tác và
              nh?ng danh sách liên quan cung s? b? c?p nh?t.
            </p>
          </div>
          {error && <p className="mt-4 text-xs text-red-500">{error}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg border border-gray-200 hover:bg-indigo-500/10 disabled:opacity-50"
              onClick={closeDeleteConfirm}
              disabled={loading}
            >
              H?y
            </button>{" "}
            <button
              type="button"
              className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-60"
              onClick={confirmDeleteSupply}
              disabled={loading}
            >
              {loading ? "Ðang Xóa..." : "Xóa NCC"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderViewSupplierModal = () => {
    if (!viewModalState.isOpen) return null;
    const supply = viewModalState.data?.supply;
    const stats = viewModalState.data?.stats;
    const unpaidPayments = viewModalState.data?.unpaidPayments || [];
    const selectedPayment =
      unpaidPayments.find(
        (payment) => payment.id === viewModalState.selectedPaymentId
      ) || null;
    const bankLabel =
      supply?.bankName ||
      (supply?.binBank
        ? bankNameByBin.get(supply.binBank.trim()) || `BIN ${supply.binBank}`
        : "Chua Có Ngân Hàng");
    const accountNumber = supply?.numberBank || "";
    const accountName = supply?.sourceName || "";
    const bankBin = supply?.binBank || "";
    const qrAmount = selectedPayment?.totalImport || 0;
    const qrMessage = selectedPayment?.round || `SUPPLIER-${supply?.id ?? ""}`;
    const qrImageUrl =
      accountNumber && bankBin
        ? Helpers.buildSepayQrUrl({
            accountNumber,
            bankCode: bankBin,
            amount: Math.max(0, qrAmount),
            description: qrMessage,
          })
        : null;

    const statCards = [
      {
        title: "T?ng Ðon Hàng",
        value: stats?.totalOrders ?? 0,
        accent: "sky" as const,
        Icon: ClipboardDocumentListIcon,
      },
      {
        title: "Ðon Hàng H?y",
        value: stats?.canceledOrders ?? 0,
        accent: "rose" as const,
        Icon: XCircleIcon,
      },
      {
        title: "Ðon Tháng Này",
        value: stats?.monthlyOrders ?? 0,
        accent: "violet" as const,
        Icon: CalendarDaysIcon,
      },
      {
        title: "T?ng Ti?n Thanh Toán",
        value: formatCurrencyVnd(stats?.totalPaidAmount ?? 0),
        accent: "emerald" as const,
        Icon: CurrencyDollarIcon,
      },
    ];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
        <div className="w-full max-w-6xl bg-gradient-to-b from-[#0f132c] via-[#11183a] to-[#0b1025] border border-white/10 rounded-3xl shadow-2xl shadow-indigo-900/40 max-h-[95vh] flex flex-col overflow-hidden backdrop-blur-xl text-white">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur">
            <div>
              <p className="text-lg font-semibold text-white">Thông tin NCC</p>
              {supply && (
                <p className="text-xs text-white/60">
                  ID: {supply.id} | {supply.sourceName}
                </p>
              )}
            </div>
            <button
              type="button"
              className="text-white/60 hover:text-white"
              onClick={closeViewModal}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="px-6 py-5 overflow-y-auto space-y-6">
            {viewModalState.loading && (
              <div className="text-center text-sm text-white/70">
                Ðang t?i thông tin...
              </div>
            )}

            {viewModalState.error && !viewModalState.loading && (
              <div className="text-center text-sm text-rose-400">
                {viewModalState.error}
              </div>
            )}

            {!viewModalState.loading && !viewModalState.error && supply && (
              <React.Fragment>
                <section className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl backdrop-blur">
                  <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                    <div className="flex-1 bg-white/5 rounded-3xl p-5 text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 border border-white/10 shadow-lg">
                      <div>
                        <p className="text-white/60">Tên NCC</p>
                        <p className="text-lg font-semibold text-white">
                          {supply.sourceName || "Chua Ð?t Tên"}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/60">Tr?ng Thái</p>
                        <span
                          className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full mt-1 shadow ${getStatusClasses(
                            supply.isActive ?? supply.status
                          )}`}
                        >
                          {formatStatusLabel(supply.isActive ?? supply.status)}
                        </span>
                      </div>
                      <div>
                        <p className="text-white/60">S? Tài Kho?n</p>
                        <p className="text-base font-semibold text-white">
                          {accountNumber || "Chua Cung C?p"}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/60">Ngân Hàng</p>
                        <p className="text-base font-semibold text-white">
                          {bankLabel}
                        </p>
                      </div>
                    </div>
                    <div className="flex-[1.4] rounded-3xl p-5 border border-white/10 shadow-lg bg-gradient-to-br from-white/5 via-white/0 to-white/5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {statCards.map((card) => {
                          const IconComponent = card.Icon;
                          const accent =
                            MODAL_CARD_ACCENTS[card.accent] ||
                            MODAL_CARD_ACCENTS.sky;
                          return (
                            <div
                              key={card.title}
                              className="relative isolate rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/10 px-5 py-4 shadow-[0_25px_65px_-40px_rgba(15,23,42,0.65)]"
                            >
                              <div className="relative flex items-center gap-4">
                                <div
                                  className={`rounded-2xl bg-gradient-to-br ${accent.iconBg} p-3 text-white shadow-inner shadow-black/10`}
                                >
                                  <IconComponent className="h-5 w-5" />
                                </div>
                                <div className="text-right flex-1">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">
                                    {card.title}
                                  </p>
                                  <p className="text-xl font-extrabold text-white">
                                    {typeof card.value === "number"
                                      ? card.value.toLocaleString("vi-VN")
                                      : card.value}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Chu k? chua thanh toán
                      </p>
                      <p className="text-xs text-white/80">
                        Ch?n m?t chu k? d? xem chi ti?t và xác nh?n
                      </p>
                    </div>
                  </div>

                  {unpaidPayments.length === 0 ? (
                    <div className="text-sm text-white/70">
                      Không có chu k? chua thanh toán.
                    </div>
                  ) : (
                    <div className="grid lg:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        {unpaidPayments.map((payment) => (
                          <button
                            key={payment.id}
                            className={`w-full text-left rounded-2xl border px-4 py-3 transition backdrop-blur ${
                              payment.id === viewModalState.selectedPaymentId
                                ? "border-indigo-400 bg-indigo-500/20 shadow-lg shadow-indigo-900/30 text-white"
                                : "border-white/10 bg-white/5 hover:border-white/30 text-white/80"
                            }`}
                            onClick={() => handleSelectPaymentCycle(payment.id)}
                          >
                            <p className="text-sm font-semibold text-white">
                              {payment.round || "Chu k? không tên"}
                            </p>
                            <p className="text-xs text-white/80">
                              Ti?n Nh?p:{" "}
                              {formatCurrencyVnd(payment.totalImport)}
                            </p>
                          </button>
                        ))}
                      </div>

                      <div className="lg:col-span-2">
                        {selectedPayment ? (
                          <div className="border border-white/15 rounded-2xl p-6 space-y-4 bg-white/5 shadow-xl backdrop-blur">
                            <div>
                              <p className="text-sm text-white/70">
                                Thông tin chu k?
                              </p>
                              <p className="text-lg font-semibold text-white">
                                {selectedPayment.round || "Chu k? không tên"}
                              </p>
                            </div>
                            {qrImageUrl ? (
                              <div className="flex flex-col items-center space-y-3">
                                <img
                                  src={qrImageUrl}
                                  alt="Mã QR Thanh Toán"
                                  className="w-60 h-auto rounded-lg shadow-lg shadow-black/30"
                                />
                                <p className="text-xs text-white/80">
                                  Quét mã QR d? thanh toán
                                </p>
                              </div>
                            ) : (
                              <div className="text-sm text-white/70 text-center">
                                Chua d? thông tin d? t?o mã QR (thi?u tài kho?n
                                ho?c ngân hàng).
                              </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-white">
                              <div>
                                <p className="text-white/60">Ngân Hàng</p>
                                <p className="font-semibold text-white">
                                  {bankLabel}
                                </p>
                              </div>
                              <div>
                                <p className="text-white/60">S? Tài Kho?n</p>
                                <p className="font-semibold text-white">
                                  {accountNumber || "Chua Cung C?p"}
                                </p>
                              </div>
                              <div>
                                <p className="text-white/60">
                                  Ch? tài kho?n / N?i dung
                                </p>
                                <p className="font-semibold text-white">
                                  {accountName}
                                </p>
                                <p className="text-xs text-white/70">
                                  N?i dung: {qrMessage}
                                </p>
                              </div>
                              <div>
                                <p className="text-white/60">T?ng Thanh Toán</p>
                                <p className="font-semibold text-rose-300">
                                  {formatCurrencyVnd(qrAmount)}
                                </p>
                              </div>
                            </div>
                            {viewModalState.confirmError && (
                              <div className="text-xs text-rose-400">
                                {viewModalState.confirmError}
                              </div>
                            )}
                            <div className="flex justify-end">
                              <button
                                className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-sm font-semibold rounded-lg hover:from-indigo-600 hover:to-blue-600 disabled:opacity-60 shadow-lg shadow-indigo-900/30"
                                onClick={handleConfirmPayment}
                                disabled={viewModalState.confirming}
                              >
                                {viewModalState.confirming
                                  ? "Ðang Xác Nh?n..."
                                  : "Xác nh?n Thanh Toán"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="border border-dashed border-white/20 rounded-2xl p-8 text-center text-sm text-white/70 bg-white/5">
                            Ch?n m?t chu k? thanh toán d? xem chi ti?t.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              </React.Fragment>
            )}
          </div>
        </div>
      </div>
    );
  };
  const renderAddSupplierModal = () => {
    if (!addModalOpen) return null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6"
        onClick={closeAddSupplierModal}
      >
        <div
          className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-lg font-semibold text-gray-900">Thêm NCC</p>
              <p className="text-xs text-white/80">Nh?p thông tin NCC m?i</p>
            </div>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600"
              onClick={closeAddSupplierModal}
            >
              &#10005;
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleCreateSupplierSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên NCC
              </label>
              <input
                type="text"
                value={newSupplierForm.sourceName}
                onChange={(event) =>
                  handleNewSupplierChange("sourceName", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Nh?p Tên NCC"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                S? Tài Kho?n
              </label>
              <input
                type="text"
                value={newSupplierForm.numberBank}
                onChange={(event) =>
                  handleNewSupplierChange("numberBank", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Nh?p S? Tài Kho?n"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ngân Hàng
              </label>
              <select
                value={newSupplierForm.bankBin}
                onChange={(event) =>
                  handleNewSupplierChange("bankBin", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="" disabled>
                  Ch?n Ngân Hàng
                </option>
                {bankOptions.map((bank) => {
                  const label = bank.name || `BIN ${bank.bin}`;
                  return (
                    <option key={bank.bin} value={bank.bin}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tr?ng Thái
              </label>
              <select
                value={newSupplierForm.status}
                onChange={(event) =>
                  handleNewSupplierChange("status", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {addModalError && (
              <div className="text-xs text-red-500">{addModalError}</div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg border border-gray-200 hover:bg-indigo-500/10"
                onClick={closeAddSupplierModal}
                disabled={isCreatingSupplier}
              >
                H?y
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-70"
                disabled={isCreatingSupplier}
              >
                {isCreatingSupplier ? "Ðang Luu..." : "Thêm NCC"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  useEffect(() => {
    fetchSupplySummary();
  }, [fetchSupplySummary]);

  useEffect(() => {
    const loadBanks = async () => {
      try {
        const response = await apiFetch("/api/banks");
        if (!response.ok) {
          throw new Error("Không th? t?i danh sách ngân hàng");
        }
        const data: BankOption[] = await response.json();
        const normalized = Array.isArray(data)
          ? data.map((row) => ({
              bin: getFieldValue<string>(row, ["bin", BANK_LIST_COLS.bin], ""),
              name: getFieldValue<string>(
                row,
                ["name", BANK_LIST_COLS.bankName],
                ""
              ),
            }))
          : [];
        setBankOptions(normalized);
        setNewSupplierForm((prev) => ({
          ...prev,
          bankBin: prev.bankBin || normalized[0]?.bin || "",
        }));
      } catch (error) {
        console.error(error);
      }
    };
    loadBanks();
  }, []);

  const filteredSupplies = useMemo(() => {
    const formattedSearch = formatSearchValue(searchTerm);
    const filtered = supplies.filter((supply) => {
      const matchesSearch =
        !formattedSearch ||
        supply.sourceName.toLowerCase().includes(formattedSearch) ||
        (supply.bankName || "").toLowerCase().includes(formattedSearch) ||
        (supply.numberBank || "").toLowerCase().includes(formattedSearch) ||
        supply.products.some((product) =>
          product.toLowerCase().includes(formattedSearch)
        );

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active"
          ? isSupplyActive(supply)
          : !isSupplyActive(supply));

      return matchesSearch && matchesStatus;
    });
    return filtered.sort(compareSuppliersByPriority);
  }, [supplies, searchTerm, statusFilter]);

  const supplierStats = useMemo(
    () => [
      {
        name: "T?ng",

        value: stats.totalSuppliers.toString(),

        accent: STAT_CARD_ACCENTS.sky,

        Icon: UserGroupIcon,
      },

      {
        name: "Hành Ð?ng",

        value: stats.activeSuppliers.toString(),

        accent: STAT_CARD_ACCENTS.emerald,

        Icon: CheckCircleIcon,
      },

      {
        name: "T?ng Ðon",

        value: stats.monthlyOrders.toString(),

        accent: STAT_CARD_ACCENTS.violet,

        Icon: ShoppingBagIcon,
      },

      {
        name: "T?ng Thanh Toán",

        value: formatCurrencyShort(stats.totalImportValue),

        accent: STAT_CARD_ACCENTS.amber,

        Icon: CurrencyDollarIcon,
      },
    ],

    [stats]
  );

  return (
    <React.Fragment>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              B?ng Thông Tin Ngu?n
            </h1>

            <p className="mt-1 text-sm text-white/80">
              Qu?n lý thông tin nhà cung c?p
            </p>
          </div>

          <div className="mt-4 sm:mt-0">
            <GradientButton icon={PlusIcon} onClick={openAddSupplierModal}>
              Thêm NCC
            </GradientButton>
          </div>
        </div>

        <div className="rounded-[28px] bg-gradient-to-br from-white/6 via-indigo-400/25 to-indigo-900/40 border border-white/10 p-5 shadow-[0_24px_65px_-28px_rgba(0,0,0,0.8),0_18px_42px_-26px_rgba(255,255,255,0.25)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {supplierStats.map((stat) => (
              <StatCard
                key={stat.name}
                title={stat.name}
                value={stat.value}
                icon={stat.Icon}
                accent={stat.accent}
              />
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-white/5 via-white/0 to-white/5 p-5 shadow-[0_30px_80px_-45px_rgba(0,0,0,0.8)]">
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-indigo-400/10 via-transparent to-blue-400/10 blur-3xl" />
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
              <input
                type="text"
                placeholder="Tìm ki?m nhà cung c?p..."
                className="w-full rounded-full border border-white/15 bg-white/10 px-4 py-3 pl-10 text-sm text-white placeholder:text-white/50 shadow-inner shadow-black/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-300"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <select
              className="w-full rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm text-white shadow-inner shadow-black/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-300"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Tr?ng Thái</option>
              <option value="active">Ðang Ho?t Ð?ng</option>
              <option value="inactive">T?m D?ng</option>
            </select>

            <GradientButton
              className="w-full justify-center rounded-full shadow-lg shadow-indigo-900/30"
              type="button"
            >
              Xu?t Danh Sách
            </GradientButton>
          </div>

          {error && (
            <div className="relative mt-2 text-sm text-rose-400">{error}</div>
          )}
        </div>

        <div className="bg-white/10 border border-white/10 rounded-xl shadow-lg overflow-hidden w-full backdrop-blur">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-white">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider whitespace-nowrap">
                    Nhà Cung C?p
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider whitespace-nowrap">
                    Tài Kho?n
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider whitespace-nowrap">
                    S? don tháng
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider whitespace-nowrap">
                    Ðon hàng cu?i
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider whitespace-nowrap">
                    Ðã Thanh Toán
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider whitespace-nowrap">
                    Còn N?
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider whitespace-nowrap "></th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider whitespace-nowrap">
                    Thao Tác
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white/5 divide-y divide-white/10">
                {loading && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-4 text-center text-sm text-white/80"
                    >
                      Ðang t?i d? li?u
                    </td>
                  </tr>
                )}

                {!loading &&
                  filteredSupplies.map((supply) => {
                    const isExpanded = expandedSupplyId === supply.id;

                    return (
                      <React.Fragment key={supply.id}>
                        <tr
                          className="bg-gradient-to-r from-indigo-950/70 via-slate-900/60 to-indigo-950/70 hover:from-indigo-900/70 hover:via-indigo-800/50 hover:to-indigo-900/70 cursor-pointer transition"
                          onClick={() => toggleSlotDetails(supply.id)}
                        >
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">
                              {supply.sourceName || "Chua Có Tên"}
                            </div>

                            <div className="text-xs text-white/70">
                              T?ng don: {supply.totalOrders}
                            </div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-white">
                              {supply.numberBank || "Chua Có Tài Kho?n"}
                            </div>

                            <div className="text-xs text-white/70">
                              {supply.bankName ||
                                (supply.binBank
                                  ? bankNameByBin.get(supply.binBank.trim()) ||
                                    `BIN ${supply.binBank}`
                                  : "Chua Có Ngân Hàng")}
                            </div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-white">
                              {supply.monthlyOrders} Ðon
                            </div>

                            <div className="text-xs text-white/70">
                              {formatCurrencyVnd(supply.monthlyImportValue)}
                            </div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap text-sm text-white/80">
                            {getFormattedDate(supply.lastOrderDate)}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap text-sm text-white/80">
                            {formatCurrencyVnd(supply.totalPaidImport)}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap text-sm text-white/80">
                            {formatCurrencyVnd(supply.totalUnpaidImport)}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();

                                  handleToggleSupplyStatus(supply);
                                }}
                                className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-inner transition ${
                                  isSupplyActive(supply)
                                    ? "border-emerald-200 bg-emerald-500 text-white"
                                    : "border-gray-200 bg-gray-200 text-gray-500"
                                } ${
                                  statusLoadingMap[supply.id]
                                    ? "opacity-60 cursor-not-allowed"
                                    : ""
                                }`}
                                aria-pressed={isSupplyActive(supply)}
                                disabled={Boolean(statusLoadingMap[supply.id])}
                                title={formatStatusLabel(
                                  supply.isActive ?? supply.status
                                )}
                              >
                                <PowerIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-3 text-sm font-medium">
                              <button
                                className="text-blue-600 hover:text-blue-900"
                                onClick={(event) => {
                                  event.stopPropagation();

                                  openViewModal(supply.id);
                                }}
                                aria-label="Xem chi ti?t"
                              >
                                <EyeIcon className="h-5 w-5" />

                                <span className="sr-only">Xem</span>
                              </button>

                              <button
                                className="text-green-600 hover:text-green-900"
                                onClick={(event) => {
                                  event.stopPropagation();

                                  openEditForm(supply);
                                }}
                                aria-label="Ch?nh S?a"
                              >
                                <PencilSquareIcon className="h-5 w-5" />

                                <span className="sr-only">Ch?nh S?a</span>
                              </button>

                              <button
                                className={`text-rose-500 hover:text-rose-700 ${
                                  deleteLoadingId === supply.id
                                    ? "opacity-60 cursor-not-allowed"
                                    : ""
                                }`}
                                onClick={(event) => {
                                  event.stopPropagation();

                                  handleDeleteSupply(supply);
                                }}
                                aria-label="Xóa Nhà Cung C?p"
                                disabled={deleteLoadingId === supply.id}
                              >
                                <TrashIcon className="h-5 w-5" />

                                <span className="sr-only">Xóa</span>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="px-4 pb-6">
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

      {renderViewSupplierModal()}

      {renderAddSupplierModal()}

      {renderEditModal()}

      {renderDeleteConfirmModal()}
    </React.Fragment>
  );
}
