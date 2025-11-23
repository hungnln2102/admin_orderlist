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
import GlassPanel from "../components/GlassPanel";
import StatCard, { STAT_CARD_ACCENTS } from "../components/StatCard";
import GradientButton from "../components/GradientButton";
import { apiFetch } from "../lib/api";
import { deleteSupplyById } from "../lib/suppliesApi";
import * as Helpers from "../lib/helpers";
import { normalizeErrorMessage } from "../lib/textUtils";

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

const GLASS_FIELD_CLASS =
  "w-full rounded-2xl border border-white/60 bg-white/80 px-4 py-2 text-sm text-gray-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300 placeholder:text-gray-400";
const formatCurrencyShort = Helpers.formatCurrencyShort;
const formatCurrencyVnd = Helpers.formatCurrency;

const ACTIVE_STATUS_LABEL = "Đang Hoạt Động";
const INACTIVE_STATUS_LABEL = "Tạm Dừng";
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

const DEFAULT_DELETE_ERROR = "Có lỗi xảy ra khi xóa nguồn. Vui lòng thử lại sau.";
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
        throw new Error("Không thể tải dữ liệu nguồn");
      }
      const data: SupplySummaryResponse = await response.json();
      const normalizedSupplies: SupplySummaryItem[] = Array.isArray(
        data.supplies
      )
        ? data.supplies.map((item) => {
            const activeFlag =
              typeof item.isActive === "boolean"
                ? item.isActive
                : normalizeStatusValue(item.status) !== "inactive";
            return {
              ...item,
              isActive: activeFlag,
              status: activeFlag ? "active" : "inactive",
              products: normalizeProducts(item.products),
              monthlyOrders: Number(item.monthlyOrders) || 0,
              monthlyImportValue: Number(item.monthlyImportValue) || 0,
              totalOrders: Number(item.totalOrders) || 0,
              totalPaidImport: Number(item.totalPaidImport) || 0,
              totalUnpaidImport: Number(item.totalUnpaidImport) || 0,
            };
          })
        : [];
      setSupplies(normalizedSupplies);
      setStats({
        totalSuppliers: Number(data.stats?.totalSuppliers) || 0,
        activeSuppliers:
          Number(data.stats?.activeSuppliers) ||
          normalizedSupplies.filter((supply) => isSupplyActive(supply)).length,
        monthlyOrders: Number(data.stats?.monthlyOrders) || 0,
        totalImportValue: Number(data.stats?.totalImportValue) || 0,
      });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Có lỗi xảy ra khi tải dữ liệu."
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
        throw new Error("Không thể tải lịch sử thanh toán.");
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
              : "Không thể tải lịch sử thanh toán.",
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
              : "Không thể tải lịch sử thanh toán.",
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
        status: prev[supplyId]?.status || "Chưa Thanh Toán",
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
        status: "Chưa Thanh Toán",
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
          status: prev[supplyId]?.status || "Chưa Thanh Toán",
          isEditing: true,
          [field]: value,
        },
      }));
    },
    []
  );

  const handleMoneyDraftChange = useCallback(
    (
      supplyId: number,
      field: "totalImport" | "paid",
      rawValue: string
    ) => {
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
        round: draft.round.trim() || "Chu kỳ mới",
        totalImport: Number.isFinite(parsedTotal) ? parsedTotal : 0,
        paid: Number.isFinite(parsedPaid) ? parsedPaid : 0,
        status: draft.status.trim() || "Chưa Thanh Toán",
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
          const text = await response.text();
          throw new Error(text || "Không thể thêm chu kỳ thanh toán.");
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
            status: "Chưa Thanh Toán",
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
              : "Không thể thêm chu kỳ thanh toán.",
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
        setAddModalError("Vui lòng nhập tên nhà cung cấp");
        return;
      }
      if (!newSupplierForm.bankBin) {
        setAddModalError("Vui lòng chọn ngân hàng");
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
          let message = "Không thể tạo nhà cung cấp.";
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
          error instanceof Error ? error.message : "Không thể tạo nhà cung cấp"
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
          errorText || "Không thể tải thông tin chi tiết nhà cung cấp"
        );
      }
      const data: SupplyOverviewResponse = await response.json();
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
            : "Không thể tải thông tin chi tiết nhà cung cấp",
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
    try {
      const currentId = viewModalState.supplyId;
      if (
        !currentId ||
        !viewModalState.data ||
        !viewModalState.selectedPaymentId
      ) {
        throw new Error("Không tìm thấy chu kỳ thanh toán");
      }
      const payment = viewModalState.data.unpaidPayments.find(
        (item) => item.id === viewModalState.selectedPaymentId
      );
      if (!payment) {
        throw new Error("Không tìm thấy chu kỳ thanh toán");
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
        throw new Error(errorText || "Không thể xác nhận thanh toán.");
      }
      await fetchSupplyOverview(currentId);
      await fetchSupplySummary();
    } catch (error) {
      console.error(error);
      setViewModalState((prev) => ({
        ...prev,
        confirmError:
          error instanceof Error
            ? error.message
            : "Không thể xác nhận thanh toán.",
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
    setEditFormValues({
      sourceName: supply.sourceName || "",
      paymentInfo: supply.numberBank || "",
      bankBin: supply.binBank || "",
    });
  }, []);

  const closeEditForm = useCallback(() => {
    setEditingSupplyId(null);
  }, []);

  const handleEditInputChange = useCallback(
    (field: keyof EditFormState, value: string) => {
      setEditFormValues((prev) => ({
        ...prev,
        [field]: value,
      }));
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
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (editingSupplyId === null) return;
      const trimmedName = editFormValues.sourceName.trim();
      const trimmedPayment = editFormValues.paymentInfo.trim();
      const trimmedBankBin = editFormValues.bankBin.trim();
      setSupplies((prev) =>
        prev.map((supply) =>
          supply.id === editingSupplyId
            ? {
                ...supply,
                sourceName: trimmedName || supply.sourceName,
                numberBank: trimmedPayment || null,
                binBank: trimmedBankBin || supply.binBank,
                bankName: trimmedBankBin
                  ? bankNameByBin.get(trimmedBankBin) ||
                    supply.bankName ||
                    `BIN ${trimmedBankBin}`
                  : supply.bankName,
              }
            : supply
        )
      );
      closeEditForm();
    },
    [bankNameByBin, closeEditForm, editFormValues, editingSupplyId, setSupplies]
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
          throw new Error(
            errorText || "Không thể cập nhật trạng thái nhà cung cấp."
          );
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
        console.error("Unable to toggle supplier status:", error);

        alert(
          error instanceof Error
            ? error.message
            : "Không thể cập nhật trạng thái nhà cung cấp."
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
      console.error("Không Thể Xóa Nhà Cung Cấp:", error);
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
            className="px-6 py-4 text-sm text-gray-500 text-center"
          >
            Đang tải dữ liệu thanh toán...
          </td>
        </tr>
      );
    }

    if (!rows.length && !hasDraftRow) {
      return (
        <tr>
          <td
            colSpan={3}
            className="px-6 py-4 text-sm text-gray-500 text-center"
          >
            Chưa có dữ liệu chu kỳ thanh toán.
          </td>
          <td className="px-4 py-4 text-center">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 transition"
              title="Thêm chu kỳ thanh toán"
              onClick={() => supplyId !== undefined && startAddPaymentCycle(supplyId)}
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

    return rows.map((row) => (
      <tr
        key={row.id}
        className="border-t border-gray-100 text-sm text-gray-800"
      >
        <td className="px-4 py-4 font-medium text-gray-900 text-left sm:text-center">
          {row.round || "--"}
        </td>
        <td className="px-4 py-4 text-center">
          {formatCurrencyVnd(row.totalImport)}
        </td>
        <td className="px-4 py-4 text-center">{formatCurrencyVnd(row.paid)}</td>
        <td className="px-4 py-4 text-center text-gray-900">
          {row.status || "--"}
        </td>
      </tr>
    ));
  };

  const renderAddPaymentRow = (
    supplyId: number,
    draft?: PaymentDraftState
  ) => {
    if (!draft || !draft.isEditing) return null;
    const isSubmitting = paymentSubmittingMap[supplyId] === true;
    return (
      <tr className="border-t border-gray-100 text-sm text-gray-800 bg-gray-50/60">
        <td className="px-4 py-3">
          <input
            type="text"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
            placeholder="VD: Chu kỳ 1"
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
            placeholder="Tổng tiền thanh toán"
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
            placeholder="Đã thanh toán"
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
              <option value="Chưa Thanh Toán">Chưa Thanh Toán</option>
              <option value="Đã Thanh Toán">Đã Thanh Toán</option>
              <option value="Cần Gia Hạn">Cần Gia Hạn</option>
            </select>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="h-9 w-9 rounded-full bg-emerald-500 text-white shadow hover:bg-emerald-600 transition"
                title="Xác nhận thêm chu kỳ"
                disabled={isSubmitting}
                onClick={() => confirmAddPaymentCycle(supplyId)}
              >
                <CheckIcon className="h-5 w-5 mx-auto" />
              </button>
              <button
                type="button"
                className="h-9 w-9 rounded-full bg-gray-200 text-gray-700 shadow hover:bg-gray-300 transition"
                title="Hủy thêm chu kỳ"
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
              : "text-gray-600 hover:bg-gray-100"
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
            className="w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40"
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
            className="w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40"
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
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-gray-900">
              Lịch sử thanh toán
            </p>
            <p className="text-xs text-gray-500">
              Theo dõi chu kỳ thanh toán của nhà cung cấp.
            </p>
          </div>
        </div>
        {state?.loading && (
          <div className="text-center text-xs text-blue-600">Đang tải...</div>
        )}

        {state?.error && (
          <div className="text-center text-xs text-red-500">{state.error}</div>
        )}

        <div className="flex justify-center">
          <div className="w-full max-w-4xl rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 text-[11px] uppercase text-gray-500 tracking-wide">
                <tr>
                  <th className="px-6 py-3 text-left sm:text-center">Chu kỳ</th>
                  <th className="px-6 py-3 text-center">
                    Tổng tiền thanh toán
                  </th>
                  <th className="px-6 py-3 text-center">Đã Thanh Toán</th>
                  <th className="px-6 py-3 text-center">Tình Trạng</th>
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

        {/* {state &&
          state.initialized &&
          !currentRows.length &&
          !state.loading &&
          !state.error && (
            <div className="text-center text-xs text-gray-500">
              Chưa có chu kỳ thanh toán nào.
            </div>
          )} */}
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
                Chỉnh sửa nhà cung cấp
              </p>
              <p className="text-xs text-gray-500">
                Cập nhật thông tin thanh toán và trạng thái nhà cung cấp.
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
                Tên Nguồn
              </label>
              <input
                type="text"
                value={editFormValues.sourceName}
                onChange={(event) =>
                  handleEditInputChange("sourceName", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Nhập tên nguồn"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thanh Toán
              </label>
              <input
                type="text"
                value={editFormValues.paymentInfo}
                onChange={(event) =>
                  handleEditInputChange("paymentInfo", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Thông tin thanh toán"
              />
              {(currentSupply?.bankName ||
                (currentSupply?.binBank
                  ? bankNameByBin.get(currentSupply.binBank.trim())
                  : null)) && (
                <p className="mt-1 text-xs text-gray-500">
                  Ngân hàng hiện tại:{" "}
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
                  Chọn Ngân Hàng
                </option>
                {bankOptionsForEdit.map((bank) => (
                  <option key={bank.bin} value={bank.bin}>
                    {bank.name || `BIN ${bank.bin}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50"
                onClick={closeEditForm}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Lưu Thông Tin
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
              <p className="text-lg font-semibold text-gray-900">
                Xác Nhận Xóa
              </p>
              <p className="text-xs text-gray-500">
                Hành Động Này Sẽ Xóa Nguồn Khỏi Dữ Liệu.
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
              <p className="font-semibold text-gray-900">
                {supply.sourceName || "Nguồn Không Tên"}
              </p>
              <p className="text-xs text-gray-500">
                {supply.numberBank || "Chưa Có Thông Tin Thanh Toán"}
              </p>
            </div>
            <p>
              Bạn Chắc Chắn Muốn Xóa Nguồn Này? Hành Động Không Thể Hoàn Tác Và
              Những Danh Sách Liên Quan Cũng Sẽ Bị Cập Nhật.
            </p>
          </div>
          {error && <p className="mt-4 text-xs text-red-500">{error}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
              onClick={closeDeleteConfirm}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-60"
              onClick={confirmDeleteSupply}
              disabled={loading}
            >
              {loading ? "Đang Xóa..." : "Xóa Nguồn"}
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
        : "Chưa có ngân hàng");
    const accountNumber = supply?.numberBank || "";
    const accountName = supply?.sourceName || "";
    const bankBin = supply?.binBank || "";
    const qrAmount = selectedPayment?.totalImport || 0;
    const qrMessage = selectedPayment?.round || `SUPPLIER-${supply?.id ?? ""}`;
    const qrImageUrl =
      accountNumber && bankBin
        ? `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png?amount=${Math.round(
            Math.max(0, qrAmount)
          )}&addInfo=${encodeURIComponent(
            qrMessage
          )}&accountName=${encodeURIComponent(accountName)}`
        : null;

    const statCards = [
      {
        title: "Tổng Đơn Hàng",
        value: stats?.totalOrders ?? 0,
        accent: "sky" as const,
        Icon: ClipboardDocumentListIcon,
      },
      {
        title: "Đơn Hàng Hủy",
        value: stats?.canceledOrders ?? 0,
        accent: "rose" as const,
        Icon: XCircleIcon,
      },
      {
        title: "Đơn Tháng Này",
        value: stats?.monthlyOrders ?? 0,
        accent: "violet" as const,
        Icon: CalendarDaysIcon,
      },
      {
        title: "Tổng Tiền Đã Thanh Toán",
        value: formatCurrencyVnd(stats?.totalPaidAmount ?? 0),
        accent: "emerald" as const,
        Icon: CurrencyDollarIcon,
      },
    ];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
        <div className="w-full max-w-6xl bg-white rounded-3xl shadow-2xl max-h-[95vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                Thông Tin Nhà Cung Cấp
              </p>
              {supply && (
                <p className="text-xs text-gray-500">
                  ID: {supply.id} | {supply.sourceName}
                </p>
              )}
            </div>
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600"
              onClick={closeViewModal}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="px-6 py-5 overflow-y-auto space-y-6">
            {viewModalState.loading && (
              <div className="text-center text-sm text-gray-500">
                Đang Tải Thông Tin...
              </div>
            )}

            {viewModalState.error && !viewModalState.loading && (
              <div className="text-center text-sm text-red-500">
                {viewModalState.error}
              </div>
            )}

            {!viewModalState.loading && !viewModalState.error && supply && (
              <React.Fragment>
                <section className="bg-white border border-gray-100 rounded-3xl p-6 shadow-lg">
                  <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                    <div className="flex-1 bg-white rounded-3xl p-5 text-sm grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 border-2 border-gray-200 shadow-md">
                      <div>
                        <p className="text-gray-500">Tên Nhà Cung Cấp</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {supply.sourceName || "Chưa Đặt Tên"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Trạng Thái</p>
                        <span
                          className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full mt-1 ${getStatusClasses(
                            supply.isActive ?? supply.status
                          )}`}
                        >
                          {formatStatusLabel(supply.isActive ?? supply.status)}
                        </span>
                      </div>
                      <div>
                        <p className="text-gray-500">Số Tài Khoản</p>
                        <p className="text-base font-semibold text-gray-900">
                          {accountNumber || "Chưa Cung Cấp"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Ngân Hàng</p>
                        <p className="text-base font-semibold text-gray-900">
                          {bankLabel}
                        </p>
                      </div>
                    </div>
                    <div className="flex-[1.4] bg-white rounded-3xl p-5 border-2 border-gray-200 shadow-md">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {statCards.map((card) => {
                          const IconComponent = card.Icon;
                          const accent =
                            MODAL_CARD_ACCENTS[card.accent] ||
                            MODAL_CARD_ACCENTS.sky;
                          return (
                            <div
                              key={card.title}
                              className="relative isolate rounded-3xl border border-white/70 bg-white/80 px-5 py-4 shadow-[0_25px_65px_-40px_rgba(15,23,42,0.65)]"
                            >
                              <div
                                className={`pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br ${accent.glow} opacity-70 blur-2xl`}
                              />
                              <div className="relative flex items-center gap-4">
                                <div
                                  className={`rounded-2xl bg-gradient-to-br ${accent.iconBg} p-3 text-white shadow-inner shadow-black/10`}
                                >
                                  <IconComponent className="h-5 w-5" />
                                </div>
                                <div className="text-right flex-1">
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    {card.title}
                                  </p>
                                  <p className="text-xl font-extrabold text-slate-900">
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
                      <p className="text-sm font-semibold text-gray-900">
                        Chu Kỳ Thanh Toán
                      </p>
                      <p className="text-xs text-gray-500">
                        Chọn chu kỳ để hiện thông tin thanh toán và QR
                      </p>
                    </div>
                  </div>

                  {unpaidPayments.length === 0 ? (
                    <div className="text-sm text-gray-500">
                      Tất cả chu kỳ đã được thanh toán
                    </div>
                  ) : (
                    <div className="grid lg:grid-cols-3 gap-6">
                      <div className="space-y-3">
                        {unpaidPayments.map((payment) => (
                          <button
                            key={payment.id}
                            className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                              payment.id === viewModalState.selectedPaymentId
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                            onClick={() => handleSelectPaymentCycle(payment.id)}
                          >
                            <p className="text-sm font-semibold text-gray-900">
                              {payment.round || "Chu kỳ không tên"}
                            </p>
                            <p className="text-xs text-gray-500">
                              Tổng Tiền:{" "}
                              {formatCurrencyVnd(payment.totalImport)}
                            </p>
                          </button>
                        ))}
                      </div>

                      <div className="lg:col-span-2">
                        {selectedPayment ? (
                          <div className="border border-gray-200 rounded-2xl p-6 space-y-4 bg-white shadow-sm">
                            <div>
                              <p className="text-sm text-gray-600">
                                Thông Tin Chu Kỳ
                              </p>
                              <p className="text-lg font-semibold text-gray-900">
                                {selectedPayment.round || "Chu Kỳ Không Tên"}
                              </p>
                            </div>
                            {qrImageUrl ? (
                              <div className="flex flex-col items-center space-y-3">
                                <img
                                  src={qrImageUrl}
                                  alt="QR Thanh Toán"
                                  className="w-60 h-auto"
                                />
                                <p className="text-xs text-gray-500">
                                  Quét Mã QR Để Thanh Toán
                                </p>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500 text-center">
                                Không có dữ liệu tạo mã QR (Thiếu thông tin tài
                                khoản hoặc ngân hàng).
                              </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-gray-500">Ngân Hàng</p>
                                <p className="font-semibold text-gray-900">
                                  {bankLabel}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Số tài khoản</p>

                                <p className="font-semibold text-gray-900">
                                  {accountNumber || "Chưa Cung Cấp"}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">
                                  Chủ tài khoản / Nội dung
                                </p>
                                <p className="font-semibold text-gray-900">
                                  {accountName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Nội dung: {qrMessage}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Số Tiền</p>
                                <p className="font-semibold text-red-600">
                                  {formatCurrencyVnd(qrAmount)}
                                </p>
                              </div>
                            </div>
                            {viewModalState.confirmError && (
                              <div className="text-xs text-red-500">
                                {viewModalState.confirmError}
                              </div>
                            )}
                            <div className="flex justify-end">
                              <button
                                className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60"
                                onClick={handleConfirmPayment}
                                disabled={viewModalState.confirming}
                              >
                                {viewModalState.confirming
                                  ? "Đang xác nhận..."
                                  : "Xác nhận thanh toán"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="border border-dashed border-gray-300 rounded-2xl p-8 text-center text-sm text-gray-500">
                            Chọn một chu kỳ để xem thông tin thanh toán
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
              <p className="text-lg font-semibold text-gray-900">
                Thêm nhà cung cấp
              </p>
              <p className="text-xs text-gray-500">
                Nhập thông tin nhà cung cấp mới
              </p>
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
                Tên nhà cung cấp
              </label>
              <input
                type="text"
                value={newSupplierForm.sourceName}
                onChange={(event) =>
                  handleNewSupplierChange("sourceName", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Nhập tên nhà cung cấp"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Số tài khoản
              </label>
              <input
                type="text"
                value={newSupplierForm.numberBank}
                onChange={(event) =>
                  handleNewSupplierChange("numberBank", event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Nhập số tài khoản"
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
                  Chọn Ngân hàng
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
                Trạng Thái
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
                className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-50"
                onClick={closeAddSupplierModal}
                disabled={isCreatingSupplier}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-70"
                disabled={isCreatingSupplier}
              >
                {isCreatingSupplier ? "Đang Lưu..." : "Thêm Nhà Cung Cấp"}
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
          throw new Error("Không thể tải danh sách ngân hàng");
        }
        const data: BankOption[] = await response.json();
        setBankOptions(data);
        setNewSupplierForm((prev) => ({
          ...prev,
          bankBin: prev.bankBin || data[0]?.bin || "",
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
        name: "Tổng Nhà Cung Cấp",
        value: stats.totalSuppliers.toString(),
        accent: STAT_CARD_ACCENTS.sky,
        Icon: UserGroupIcon,
      },
      {
        name: "Đang Hoạt Động",
        value: stats.activeSuppliers.toString(),
        accent: STAT_CARD_ACCENTS.emerald,
        Icon: CheckCircleIcon,
      },
      {
        name: "Đơn Hàng Tháng Này",
        value: stats.monthlyOrders.toString(),
        accent: STAT_CARD_ACCENTS.violet,
        Icon: ShoppingBagIcon,
      },
      {
        name: "Giá Trị Nhập Hàng",
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
            <h1 className="text-2xl font-bold text-gray-900">
              Bảng Thông Tin Nguồn
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Quản lý thông tin nhà cung cấp và đối tác
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <GradientButton icon={PlusIcon} onClick={openAddSupplierModal}>
              Thêm Nhà Cung Cấp
            </GradientButton>
          </div>
        </div>

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

        <GlassPanel className="p-6 space-y-4" glow="neutral">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm nhà cung cấp..."
                className={`${GLASS_FIELD_CLASS} pl-10`}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <select
              className={GLASS_FIELD_CLASS}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang Hoạt Động</option>
              <option value="inactive">Tạm Ngưng</option>
            </select>

            <GradientButton className="w-full justify-center" type="button">
              Xuất Danh Sách
            </GradientButton>
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </GlassPanel>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden max-w-6xl mx-auto">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Nhà Cung Cấp
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Thanh Toán
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Đơn Trong Tháng
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Đơn Hàng Cuối
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Đã Thanh Toán
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Chưa Thanh Toán
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap ">
                    Trạng Thái
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
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
                      Đang Tải Dữ Liệu
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
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {supply.sourceName || "Chưa Đặt Tên"}
                            </div>
                            <div className="text-xs text-gray-500">
                              Tổng Đơn: {supply.totalOrders}
                            </div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {supply.numberBank || "Chưa Có Tài Khoản"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {supply.bankName ||
                                (supply.binBank
                                  ? bankNameByBin.get(supply.binBank.trim()) ||
                                    `BIN ${supply.binBank}`
                                  : "Chưa Có Ngân Hàng")}
                            </div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {supply.monthlyOrders} Đơn
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatCurrencyVnd(supply.monthlyImportValue)}
                            </div>
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getFormattedDate(supply.lastOrderDate)}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrencyVnd(supply.totalPaidImport)}
                          </td>

                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
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
                                aria-label="Xem chi tiết"
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
                                aria-label="Chỉnh sửa"
                              >
                                <PencilSquareIcon className="h-5 w-5" />

                                <span className="sr-only">Chỉnh Sửa</span>
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
                                aria-label="Xóa nguồn"
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
