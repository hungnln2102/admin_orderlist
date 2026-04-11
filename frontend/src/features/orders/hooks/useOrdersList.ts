import { useEffect, useMemo, useState } from "react";
import { Order, OrderDatasetKey } from "@/constants";
import { useDebounce } from "./useDebounce";
import {
  enrichOrdersWithVirtualFields,
  filterAndSortOrders,
  computeOrderStats,
  getPaginated,
  buildPaginationPages,
} from "../utils/orderListTransform";
import { orderCreatedWithinIsoRange } from "../utils/ordersHelpers";

export type OrdersDurationRange = { from: string; to: string };

export type UseOrdersListParams = {
  orders: Order[];
  searchTerm: string;
  searchField: string;
  statusFilter: string;
  rowsPerPage: number;
  currentPage: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  dataset: OrderDatasetKey;
  durationRange: OrdersDurationRange | null;
};

export function useOrdersList({
  orders,
  searchTerm,
  searchField,
  statusFilter,
  rowsPerPage,
  currentPage,
  setCurrentPage,
  dataset,
  durationRange,
}: UseOrdersListParams) {
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const listData = useMemo(() => {
    const ordersWithVirtual = enrichOrdersWithVirtualFields(orders, dataset);
    const narrowed =
      durationRange?.from && durationRange?.to
        ? ordersWithVirtual.filter((o) =>
            orderCreatedWithinIsoRange(o, durationRange.from, durationRange.to)
          )
        : ordersWithVirtual;

    const filteredOrders = filterAndSortOrders(narrowed, {
      searchTerm: debouncedSearchTerm,
      searchField,
      statusFilter,
      dataset,
    });
    const { updatedStats, totalRecords } = computeOrderStats(narrowed, dataset);
    const { currentOrders, totalPages } = getPaginated(
      filteredOrders,
      currentPage,
      rowsPerPage
    );

    return {
      filteredOrders,
      currentOrders,
      totalPages,
      updatedStats,
      totalRecords,
    };
  }, [
    orders,
    dataset,
    debouncedSearchTerm,
    searchField,
    statusFilter,
    rowsPerPage,
    currentPage,
    durationRange,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    searchField,
    statusFilter,
    rowsPerPage,
    durationRange,
    setCurrentPage,
  ]);

  const paginationPages = useMemo(
    () => buildPaginationPages(currentPage, listData.totalPages),
    [currentPage, listData.totalPages]
  );

  return {
    ...listData,
    paginationPages,
  };
}
