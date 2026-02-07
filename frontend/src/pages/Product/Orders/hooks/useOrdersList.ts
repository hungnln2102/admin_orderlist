import { useEffect, useMemo, useState } from "react";
import { Order, OrderDatasetKey } from "../../../../constants";
import { useDebounce } from "./useDebounce";
import {
  enrichOrdersWithVirtualFields,
  filterAndSortOrders,
  computeOrderStats,
  getPaginated,
  buildPaginationPages,
} from "../utils/orderListTransform";

export type UseOrdersListParams = {
  orders: Order[];
  searchTerm: string;
  searchField: string;
  statusFilter: string;
  rowsPerPage: number;
  currentPage: number;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  dataset: OrderDatasetKey;
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
}: UseOrdersListParams) {
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const listData = useMemo(() => {
    const ordersWithVirtual = enrichOrdersWithVirtualFields(orders, dataset);
    const filteredOrders = filterAndSortOrders(ordersWithVirtual, {
      searchTerm: debouncedSearchTerm,
      searchField,
      statusFilter,
      dataset,
    });
    const { updatedStats, totalRecords } =
      computeOrderStats(ordersWithVirtual);
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
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, searchField, statusFilter, rowsPerPage, setCurrentPage]);

  const paginationPages = useMemo(
    () => buildPaginationPages(currentPage, listData.totalPages),
    [currentPage, listData.totalPages]
  );

  return {
    ...listData,
    paginationPages,
  };
}
