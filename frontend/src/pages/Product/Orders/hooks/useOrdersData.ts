import { useCallback, useEffect, useState } from "react";
import { OrderDatasetKey } from "../../../../constants";
import { useOrdersFetch } from "./useOrdersFetch";
import { useOrdersList } from "./useOrdersList";
import { useOrdersModals } from "./useOrdersModals";
import { useOrderActions } from "./useOrderActions";

export type { EditableOrder } from "../types";

export function useOrdersData(dataset: OrderDatasetKey) {
  const { orders, setOrders, fetchError, fetchOrders } = useOrdersFetch(dataset);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const modals = useOrdersModals();

  const list = useOrdersList({
    orders,
    searchTerm,
    searchField,
    statusFilter,
    rowsPerPage,
    currentPage,
    setCurrentPage,
    dataset,
  });

  const actions = useOrderActions({
    fetchOrders,
    closeCreateModal: modals.closeCreateModal,
    closeEditModal: modals.closeEditModal,
    closeModal: modals.closeModal,
    handleViewOrder: modals.handleViewOrder,
    orderToDelete: modals.orderToDelete,
    setOrderToDelete: modals.setOrderToDelete,
    setOrders,
  });

  useEffect(() => {
    setOrders([]);
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
    modals.resetModals();
  }, [dataset, setOrders, modals.resetModals]);

  return {
    // List data
    ...list,
    // Filters & pagination state
    searchTerm,
    setSearchTerm,
    searchField,
    setSearchField,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    // Modals
    isModalOpen: modals.isModalOpen,
    isViewModalOpen: modals.isViewModalOpen,
    viewModalSource: modals.viewModalSource,
    isEditModalOpen: modals.isEditModalOpen,
    isCreateModalOpen: modals.isCreateModalOpen,
    orderToView: modals.orderToView,
    orderToDelete: modals.orderToDelete,
    orderToEdit: modals.orderToEdit,
    openCreateModal: modals.openCreateModal,
    closeCreateModal: modals.closeCreateModal,
    closeViewModal: modals.closeViewModal,
    closeEditModal: modals.closeEditModal,
    closeModal: modals.closeModal,
    handleViewOrder: modals.handleViewOrder,
    handleEditOrder: modals.handleEditOrder,
    handleDeleteOrder: modals.handleDeleteOrder,
    // Actions
    handleSaveNewOrder: actions.handleSaveNewOrder,
    handleSaveEdit: actions.handleSaveEdit,
    handleConfirmRefund: actions.handleConfirmRefund,
    handleMarkPaid: actions.handleMarkPaid,
    handleRenewOrder: actions.handleRenewOrder,
    confirmDelete: actions.confirmDelete,
    renewingOrderCode: actions.renewingOrderCode,
    // Fetch
    fetchError,
    reloadOrders: fetchOrders,
  };
}
