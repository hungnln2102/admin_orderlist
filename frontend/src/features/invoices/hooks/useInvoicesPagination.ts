import { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { PaginationItem } from "../components/InvoicesPagination";
import type { ReceiptCategory } from "../helpers";

type UseInvoicesPaginationParams<T> = {
  items: T[];
  pageSize: number;
  receiptPage: number;
  outOfFlowPage: number;
  outboundUnallocatedPage: number;
  activeCategory: ReceiptCategory;
  setReceiptPage: Dispatch<SetStateAction<number>>;
  setOutOfFlowPage: Dispatch<SetStateAction<number>>;
  setOutboundUnallocatedPage: Dispatch<SetStateAction<number>>;
};

const buildPaginationItems = (
  activePage: number,
  totalPages: number
): PaginationItem[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);
  const startPage = clamp(activePage - 1, 2, totalPages - 3);
  const endPage = clamp(activePage + 1, 4, totalPages - 1);
  const pages: PaginationItem[] = [1];

  if (startPage > 2) pages.push("ellipsis");
  for (let page = startPage; page <= endPage; page += 1) {
    pages.push(page);
  }
  if (endPage < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);

  return pages;
};

export function useInvoicesPagination<T>({
  items,
  pageSize,
  receiptPage,
  outOfFlowPage,
  outboundUnallocatedPage,
  activeCategory,
  setReceiptPage,
  setOutOfFlowPage,
  setOutboundUnallocatedPage,
}: UseInvoicesPaginationParams<T>) {
  let activePage = receiptPage;
  if (activeCategory === "out-of-flow") activePage = outOfFlowPage;
  else if (activeCategory === "outbound-unallocated") activePage = outboundUnallocatedPage;

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const paginationItems = useMemo(
    () => buildPaginationItems(activePage, totalPages),
    [activePage, totalPages]
  );
  const pagedItems = items.slice((activePage - 1) * pageSize, activePage * pageSize);
  
  const setActivePage = (updater: (current: number) => number) => {
    if (activeCategory === "receipt") setReceiptPage(updater);
    else if (activeCategory === "out-of-flow") setOutOfFlowPage(updater);
    else if (activeCategory === "outbound-unallocated") setOutboundUnallocatedPage(updater);
  };

  return { activePage, totalPages, paginationItems, pagedItems, setActivePage };
}
