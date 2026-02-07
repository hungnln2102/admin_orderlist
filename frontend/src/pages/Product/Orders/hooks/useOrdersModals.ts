import { useCallback, useState } from "react";
import { ORDER_FIELDS, Order } from "../../../../constants";
import type { EditableOrder, ViewModalSource } from "../types";

export function useOrdersModals() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [orderToView, setOrderToView] = useState<Order | null>(null);
  const [viewModalSource, setViewModalSource] = useState<ViewModalSource>("view");
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<EditableOrder | null>(null);

  const openCreateModal = useCallback(() => setIsCreateModalOpen(true), []);
  const closeCreateModal = useCallback(() => setIsCreateModalOpen(false), []);
  const closeViewModal = useCallback(() => {
    setIsViewModalOpen(false);
    setOrderToView(null);
    setViewModalSource("view");
  }, []);
  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setOrderToEdit(null);
  }, []);
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setOrderToDelete(null);
  }, []);

  const handleViewOrder = useCallback((order: Order, source: ViewModalSource = "view") => {
    setOrderToView(order);
    setViewModalSource(source);
    setIsViewModalOpen(true);
  }, []);

  const handleEditOrder = useCallback((order: Order) => {
    const converted: EditableOrder = {
      ...order,
      cost: Number(order[ORDER_FIELDS.COST] ?? 0) || 0,
      price: Number(order[ORDER_FIELDS.PRICE] ?? 0) || 0,
    };
    setOrderToEdit(converted);
    setIsEditModalOpen(true);
  }, []);

  const handleDeleteOrder = useCallback((order: Order) => {
    setOrderToDelete(order);
    setIsModalOpen(true);
  }, []);

  const resetModals = useCallback(() => {
    setIsModalOpen(false);
    setIsViewModalOpen(false);
    setIsEditModalOpen(false);
    setIsCreateModalOpen(false);
    setOrderToView(null);
    setViewModalSource("view");
    setOrderToDelete(null);
    setOrderToEdit(null);
  }, []);

  return {
    isModalOpen,
    isViewModalOpen,
    viewModalSource,
    isEditModalOpen,
    isCreateModalOpen,
    orderToView,
    orderToDelete,
    orderToEdit,
    openCreateModal,
    closeCreateModal,
    closeViewModal,
    closeEditModal,
    closeModal,
    handleViewOrder,
    handleEditOrder,
    handleDeleteOrder,
    resetModals,
    setOrderToDelete,
  };
}
