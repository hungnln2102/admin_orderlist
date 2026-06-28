import { useMemo } from "react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { formatDateToDMY } from "@/shared/date";
import { STAT_CARD_ACCENTS } from "@/components/ui/StatCard";
import type { PaymentReceipt, ReceiptCategory } from "../helpers";
import {
  determineReceiptCategory,
  formatCurrencyVndFull,
  parseDMYDate,
  resolveSender,
} from "../helpers";

type UseInvoiceDerivationsParams = {
  receipts: PaymentReceipt[];
  searchTerm: string;
  dateStart: string;
  dateEnd: string;
  categoryFilter: ReceiptCategory;
};

export function useInvoiceDerivations({
  receipts,
  searchTerm,
  dateStart,
  dateEnd,
  categoryFilter,
}: UseInvoiceDerivationsParams) {
  const filteredReceipts = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    const startTime = parseDMYDate(dateStart);
    const endTime = parseDMYDate(dateEnd);

    return receipts.filter((item) => {
      const recordCategory = determineReceiptCategory(item);
      const matchesSearch =
        !normalized ||
        [item.orderCode, item.note, resolveSender(item)]
          .map((value) => value?.toLowerCase() ?? "")
          .some((value) => value.includes(normalized));

      const paidTimestamp = parseDMYDate(formatDateToDMY(item.paidAt) || "");

      const withinStart =
        startTime === null ||
        paidTimestamp === null ||
        paidTimestamp >= startTime;
      const withinEnd =
        endTime === null || paidTimestamp === null || paidTimestamp <= endTime;

      const matchesCategory = recordCategory === categoryFilter;

      return matchesSearch && withinStart && withinEnd && matchesCategory;
    });
  }, [receipts, searchTerm, dateStart, dateEnd, categoryFilter]);

  const stats = useMemo(() => {
    const mavFlowReceipts = receipts.filter(
      (item) => determineReceiptCategory(item) === "receipt"
    );
    const totalAmount = mavFlowReceipts.reduce((sum, item) => sum + item.amount, 0);
    let latestPaidAt = "";
    for (const item of mavFlowReceipts) {
      const paidAt = item.paidAt ?? "";
      if (paidAt && (!latestPaidAt || paidAt > latestPaidAt)) latestPaidAt = paidAt;
    }

    return [
      {
        name: "T?ng Bi?n Nh?n",
        value: mavFlowReceipts.length.toString(),
        icon: CheckCircleIcon,
        accent: STAT_CARD_ACCENTS.sky,
      },
      {
        name: "T?ng S? Ti?n",
        value: formatCurrencyVndFull(totalAmount),
        icon: CheckCircleIcon,
        accent: STAT_CARD_ACCENTS.emerald,
      },
      {
        name: "Bi?n Nh?n G?n Nh?t",
        value: latestPaidAt ? formatDateToDMY(latestPaidAt) ?? "--" : "--",
        icon: XCircleIcon,
        accent: STAT_CARD_ACCENTS.violet,
      },
    ];
  }, [receipts]);

  const categoryCounts = useMemo(() => {
    return receipts.reduce(
      (acc, item) => {
        const category = determineReceiptCategory(item);
        acc[category] += 1;
        return acc;
      },
      { receipt: 0, "out-of-flow": 0 } as Record<ReceiptCategory, number>
    );
  }, [receipts]);

  return { filteredReceipts, stats, categoryCounts };
}
