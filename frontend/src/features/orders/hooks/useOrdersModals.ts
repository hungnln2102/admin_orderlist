import { useCallback, useState } from "react";
import { Order } from "@/constants";
import type { EditableOrder, ViewModalSource } from "../types";
import { normalizeEditableOrder } from "../utils/editOrderMapper";

export type CreatedOrderBatchView = {
  batchCode: string;
  orders: Order[];
  totalPrice: number;
  totalAmount: number;
  baseTotal?: number;
  amountSuffix?: number | null;
};

export type RefundCreatePrefill = {
  initialFormData: Partial<Order>;
  creditNoteId: number;
  creditAvailableAmount: number;
  creditApplyAmount: number;
  /** Giá bán đơn nguồn (trước trừ credit) — hiển thị chi tiết trong form tạo đơn. */
  sourceOrderListPrice: number;
  creditSourceOrderId: number;
  creditSourceOrderCode: string;
  reservedOrderCode?: string | null;
};

export function useOrdersModals() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatedBatchModalOpen, setIsCreatedBatchModalOpen] = useState(false);
  const [createdBatchToView, setCreatedBatchToView] = useState<CreatedOrderBatchView | null>(null);
  const [orderToView, setOrderToView] = useState<Order | null>(null);
  const [viewModalSource, setViewModalSource] = useState<ViewModalSource>("view");
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<EditableOrder | null>(null);
  const [createPrefill, setCreatePrefill] = useState<RefundCreatePrefill | null>(null);

  const openCreateModal = useCallback((prefill: RefundCreatePrefill | null = null) => {
    setCreatePrefill(prefill);
    setIsCreateModalOpen(true);
  }, []);
  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
    setCreatePrefill(null);
  }, []);
  const closeViewModal = useCallback(() => {
    setIsViewModalOpen(false);
    setOrderToView(null);
    setViewModalSource("view");
  }, []);
  const closeCreatedBatchModal = useCallback(() => {
    setIsCreatedBatchModalOpen(false);
    setCreatedBatchToView(null);
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

  const handleViewCreatedBatch = useCallback((batch: CreatedOrderBatchView) => {
    setCreatedBatchToView(batch);
    setIsViewModalOpen(false);
    setOrderToView(null);
    setViewModalSource("create");
    setIsCreatedBatchModalOpen(true);
  }, []);

  const handleEditOrder = useCallback((order: Order) => {
    setOrderToEdit(normalizeEditableOrder(order));
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
    setIsCreatedBatchModalOpen(false);
    setCreatedBatchToView(null);
    setOrderToView(null);
    setViewModalSource("view");
    setOrderToDelete(null);
    setOrderToEdit(null);
    setCreatePrefill(null);
  }, []);

  return {
    isModalOpen,
    isViewModalOpen,
    viewModalSource,
    isEditModalOpen,
    isCreateModalOpen,
    isCreatedBatchModalOpen,
    createdBatchToView,
    orderToView,
    orderToDelete,
    orderToEdit,
    createPrefill,
    openCreateModal,
    closeCreateModal,
    closeViewModal,
    closeCreatedBatchModal,
    closeEditModal,
    closeModal,
    handleViewOrder,
    handleViewCreatedBatch,
    handleEditOrder,
    handleDeleteOrder,
    resetModals,
    setOrderToDelete,
  };
}
