import { useEffect, useState } from "react";
import { OrderDatasetKey } from "@/constants";
import { useOrdersFetch } from "./useOrdersFetch";
import { useOrdersList, type OrdersDurationRange } from "./useOrdersList";
import { useOrdersModals } from "./useOrdersModals";
import { useOrderActions } from "./useOrderActions";

export type { EditableOrder } from "../types";

export type UseOrdersDataOptions = {
  durationRange: OrdersDurationRange | null;
};

export function useOrdersData(
  dataset: OrderDatasetKey,
  { durationRange }: UseOrdersDataOptions
) {
  const { orders, setOrders, fetchError, fetchOrders } = useOrdersFetch(dataset);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const modals = useOrdersModals();
  const { resetModals } = modals;

  const list = useOrdersList({
    orders,
    searchTerm,
    searchField,
    statusFilter,
    rowsPerPage,
    currentPage,
    setCurrentPage,
    dataset,
    durationRange,
  });

  const actions = useOrderActions({
    fetchOrders,
    closeCreateModal: modals.closeCreateModal,
    closeEditModal: modals.closeEditModal,
    closeModal: modals.closeModal,
    openCreateModal: modals.openCreateModal,
    handleViewOrder: modals.handleViewOrder,
    handleViewCreatedBatch: modals.handleViewCreatedBatch,
    orderToDelete: modals.orderToDelete,
    setOrderToDelete: modals.setOrderToDelete,
    setOrders,
  });

  useEffect(() => {
    setOrders([]);
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
    resetModals();
  }, [dataset, setOrders, resetModals]);

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
    isCreatedBatchModalOpen: modals.isCreatedBatchModalOpen,
    isPayWithCreditModalOpen: modals.isPayWithCreditModalOpen,
    createdBatchToView: modals.createdBatchToView,
    orderToView: modals.orderToView,
    orderToDelete: modals.orderToDelete,
    orderToEdit: modals.orderToEdit,
    orderToPayWithCredit: modals.orderToPayWithCredit,
    createPrefill: modals.createPrefill,
    openCreateModal: modals.openCreateModal,
    closeCreateModal: modals.closeCreateModal,
    closeViewModal: modals.closeViewModal,
    closeCreatedBatchModal: modals.closeCreatedBatchModal,
    closeEditModal: modals.closeEditModal,
    closeModal: modals.closeModal,
    closePayWithCreditModal: modals.closePayWithCreditModal,
    handleViewOrder: modals.handleViewOrder,
    handleEditOrder: modals.handleEditOrder,
    handleDeleteOrder: modals.handleDeleteOrder,
    handlePayWithCredit: modals.handlePayWithCredit,
    // Actions
    handleSaveNewOrder: actions.handleSaveNewOrder,
    handleSaveEdit: actions.handleSaveEdit,
    handleConfirmRefund: actions.handleConfirmRefund,
    handleCreateTopupOrderFromRefund: actions.handleCreateTopupOrderFromRefund,
    handleMarkPaid: actions.handleMarkPaid,
    handleRenewOrder: actions.handleRenewOrder,
    confirmDelete: actions.confirmDelete,
    renewingOrderCode: actions.renewingOrderCode,
    completingOrderCode: actions.completingOrderCode,
    // Fetch
    fetchError,
    reloadOrders: fetchOrders,
  };
}
