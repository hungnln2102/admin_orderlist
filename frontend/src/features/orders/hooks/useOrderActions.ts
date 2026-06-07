import { useMemo, useRef, useState } from "react";
import {
  buildCreateTopupOrderFromRefundHandler,
  buildSaveNewOrderHandler,
} from "./use-order-actions/createHandlers";
import {
  buildConfirmDeleteHandler,
  buildSaveEditHandler,
} from "./use-order-actions/mutationHandlers";
import {
  buildConfirmRefundHandler,
  buildMarkPaidHandler,
  buildRenewOrderHandler,
} from "./use-order-actions/paymentHandlers";
import type { OrderActionsDeps } from "./use-order-actions/types";

export type { OrderActionsDeps } from "./use-order-actions/types";

export function useOrderActions(deps: OrderActionsDeps) {
  const {
    fetchOrders,
    closeCreateModal,
    closeEditModal,
    closeModal,
    openCreateModal,
    handleViewOrder,
    orderToDelete,
    setOrderToDelete,
    setOrders,
  } = deps;

  const [renewingOrderCode, setRenewingOrderCode] = useState<string | null>(null);
  const [completingOrderCode, setCompletingOrderCode] = useState<string | null>(null);
  const isCreatingOrderRef = useRef(false);

  const handleSaveNewOrder = useMemo(
    () =>
      buildSaveNewOrderHandler({
        isCreatingOrderRef,
        closeCreateModal,
        fetchOrders,
        handleViewOrder,
      }),
    [closeCreateModal, fetchOrders, handleViewOrder]
  );

  const handleCreateTopupOrderFromRefund = useMemo(
    () => buildCreateTopupOrderFromRefundHandler({ fetchOrders, openCreateModal }),
    [fetchOrders, openCreateModal]
  );

  const handleMarkPaid = useMemo(
    () =>
      buildMarkPaidHandler({
        fetchOrders,
        setRenewingOrderCode,
        setCompletingOrderCode,
      }),
    [fetchOrders]
  );

  const handleRenewOrder = useMemo(
    () => buildRenewOrderHandler({ fetchOrders, setRenewingOrderCode }),
    [fetchOrders]
  );

  const handleConfirmRefund = useMemo(
    () => buildConfirmRefundHandler({ fetchOrders }),
    [fetchOrders]
  );

  const handleSaveEdit = useMemo(
    () => buildSaveEditHandler({ closeEditModal, fetchOrders }),
    [closeEditModal, fetchOrders]
  );

  const confirmDelete = useMemo(
    () =>
      buildConfirmDeleteHandler({
        closeModal,
        orderToDelete,
        setOrderToDelete,
        setOrders,
      }),
    [closeModal, orderToDelete, setOrderToDelete, setOrders]
  );

  return {
    handleSaveNewOrder,
    handleMarkPaid,
    handleRenewOrder,
    handleCreateTopupOrderFromRefund,
    handleConfirmRefund,
    handleSaveEdit,
    confirmDelete,
    renewingOrderCode,
    completingOrderCode,
  };
}
