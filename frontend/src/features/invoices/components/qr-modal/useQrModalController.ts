import { buildSepayQrUrl } from "@/shared/vietqr";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/shared/api/client";
import type { ShopBankDisplay } from "../../helpers";
import { digitsOnly, formatVndThousands } from "./helpers";
import { parseBatchOrderCodes } from "./parseBatchOrderCodes";
import type { BatchItem, BatchSummary } from "./types";

type Params = {
  open: boolean;
  amount: string;
  matchableOrders: Array<{ orderCode: string; transaction?: string }>;
  shopBank: ShopBankDisplay;
  onAmountChange: (value: string) => void;
  onNoteChange: (value: string) => void;
};

export const useQrModalController = ({
  open,
  amount,
  matchableOrders,
  shopBank,
  onAmountChange,
  onNoteChange,
}: Params) => {
  const [amountDraft, setAmountDraft] = useState(amount);
  const [batchCodesDraft, setBatchCodesDraft] = useState("");
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchInfo, setBatchInfo] = useState<{
    batchCode: string;
    orderCount: number;
    baseTotal: number;
    amountSuffix: number | null;
    totalAmount: number;
  } | null>(null);
  const [batchListLoading, setBatchListLoading] = useState(false);
  const [batchListError, setBatchListError] = useState<string | null>(null);
  const [batchList, setBatchList] = useState<BatchSummary[]>([]);
  const [selectedBatchCode, setSelectedBatchCode] = useState<string>("");
  const [selectedBatchItems, setSelectedBatchItems] = useState<BatchItem[]>([]);
  const [selectedBatchLoading, setSelectedBatchLoading] = useState(false);
  const [selectedBatchError, setSelectedBatchError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const digits = digitsOnly(amount);
      setAmountDraft(digits ? formatVndThousands(digits) : "");
      setBatchCodesDraft("");
      setBatchError(null);
      setBatchInfo(null);
      setBatchLoading(false);
      setSelectedBatchCode("");
      setSelectedBatchItems([]);
      setSelectedBatchError(null);
      onNoteChange("");
    }
  }, [open, amount, onNoteChange]);

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    const fetchBatchList = async () => {
      setBatchListLoading(true);
      setBatchListError(null);
      try {
        const response = await apiFetch("/api/payment-receipts/batches?limit=15");
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(String((body as { error?: string })?.error || "Không thể tải danh sách batch."));
        }
        if (!ignore) {
          const rows = Array.isArray((body as { batches?: unknown[] })?.batches)
            ? ((body as { batches: BatchSummary[] }).batches)
            : [];
          setBatchList(rows);
        }
      } catch (error) {
        if (!ignore) {
          setBatchListError(
            error instanceof Error
              ? error.message
              : "Không thể tải danh sách batch."
          );
          setBatchList([]);
        }
      } finally {
        if (!ignore) setBatchListLoading(false);
      }
    };
    void fetchBatchList();
    return () => {
      ignore = true;
    };
  }, [open, batchInfo]);

  const orderCodeHint = useMemo(() => {
    const preview = matchableOrders
      .map((item) => String(item.orderCode || "").trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 10)
      .join(", ");
    return preview;
  }, [matchableOrders]);

  const parsedAmount = useMemo(() => {
    const digits = digitsOnly(amountDraft);
    if (!digits) return 0;
    const value = Number(digits);
    return Number.isFinite(value) ? value : 0;
  }, [amountDraft]);

  const formattedAmountDisplay =
    parsedAmount > 0
      ? `${parsedAmount.toLocaleString("vi-VN")} VND`
      : "Chưa Cập Nhật";

  const qrImageUrl = useMemo(() => {
    return buildSepayQrUrl({
      accountNumber: shopBank.accountNumber,
      bankCode: shopBank.bankCode,
      amount: parsedAmount,
      accountName: shopBank.accountHolder,
    });
  }, [parsedAmount, shopBank]);

  const commitAmount = () => {
    const digits = digitsOnly(amountDraft);
    setAmountDraft(digits ? formatVndThousands(digits) : "");
    onAmountChange(digits);
  };

  const handleAmountInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const digits = digitsOnly(event.target.value);
    if (!digits) {
      setAmountDraft("");
      return;
    }
    setAmountDraft(formatVndThousands(digits));
  };

  const applyAmount = () => {
    commitAmount();
    onNoteChange("");
  };

  const createBatchFromOrders = async () => {
    const orderCodes = parseBatchOrderCodes(batchCodesDraft);
    if (orderCodes.length === 0) {
      setBatchError(
        "Vui lòng nhập ít nhất 1 mã đơn (MAVC, MAVL, …)."
      );
      return;
    }
    setBatchLoading(true);
    setBatchError(null);
    setBatchInfo(null);
    try {
      const response = await apiFetch("/api/payment-receipts/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCodes }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          String((body as { error?: string })?.error || "Không thể gộp đơn.")
        );
      }
      const nextBatchCode = String((body as { batchCode?: string })?.batchCode || "")
        .trim()
        .toUpperCase();
      const nextAmount = Number((body as { totalAmount?: number })?.totalAmount) || 0;
      if (!nextBatchCode) {
        throw new Error("Không nhận được batchCode từ server.");
      }

      onNoteChange("");

      if (nextAmount > 0) {
        const nextDigits = String(Math.round(nextAmount));
        setAmountDraft(formatVndThousands(nextDigits));
        onAmountChange(nextDigits);
      }

      setBatchInfo({
        batchCode: nextBatchCode,
        orderCount: Number((body as { orderCount?: number })?.orderCount) || orderCodes.length,
        baseTotal: Number((body as { baseTotal?: number })?.baseTotal) || 0,
        amountSuffix:
          (body as { amountSuffix?: number | null }).amountSuffix ?? null,
        totalAmount: nextAmount,
      });
      setSelectedBatchCode(nextBatchCode);
      setSelectedBatchItems([]);
      setSelectedBatchError(null);
    } catch (error) {
      setBatchError(
        error instanceof Error
          ? error.message
          : "Không thể gộp đơn."
      );
    } finally {
      setBatchLoading(false);
    }
  };

  const openBatchDetail = async (batchCode: string) => {
    const normalized = String(batchCode || "").trim().toUpperCase();
    if (!normalized) return;
    setSelectedBatchCode(normalized);
    setSelectedBatchLoading(true);
    setSelectedBatchError(null);
    try {
      const response = await apiFetch(
        `/api/payment-receipts/batches/${encodeURIComponent(normalized)}`
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String((body as { error?: string })?.error || "Không thể tải chi tiết batch."));
      }
      const items = Array.isArray((body as { items?: unknown[] })?.items)
        ? ((body as { items: BatchItem[] }).items)
        : [];
      setSelectedBatchItems(items);
      setBatchCodesDraft(
        items
          .map((item) => String(item.orderCode || "").trim().toUpperCase())
          .filter(Boolean)
          .join(", ")
      );
      onNoteChange("");
      const totalAmount = Number((body as { batch?: { totalAmount?: number } })?.batch?.totalAmount) || 0;
      if (totalAmount > 0) {
        const digits = String(Math.round(totalAmount));
        setAmountDraft(formatVndThousands(digits));
        onAmountChange(digits);
      }
    } catch (error) {
      setSelectedBatchItems([]);
      setSelectedBatchError(
        error instanceof Error ? error.message : "Không thể tải chi tiết batch."
      );
    } finally {
      setSelectedBatchLoading(false);
    }
  };

  return {
    amountDraft,
    batchCodesDraft,
    batchLoading,
    batchError,
    batchInfo,
    batchListLoading,
    batchListError,
    batchList,
    selectedBatchCode,
    selectedBatchItems,
    selectedBatchLoading,
    selectedBatchError,
    orderCodeHint,
    formattedAmountDisplay,
    qrImageUrl,
    setBatchCodesDraft,
    handleAmountInputChange,
    commitAmount,
    applyAmount,
    createBatchFromOrders,
    openBatchDetail,
  };
};
