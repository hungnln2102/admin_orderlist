import { useCallback, useRef } from "react";
import type { CreateOrderModalProps, Order } from "../types";

type NewOrderData = Parameters<CreateOrderModalProps["onSave"]>[0];
type OrderSavePayload = Partial<Order> | Order;

const attachImportPackageMeta = (
  payload: OrderSavePayload,
  meta: Record<string, unknown>
) => ({
  ...(payload as Record<string, unknown>),
  __import_package: meta,
});

export const useCreateOrderImportPackageSave = (
  onSave: CreateOrderModalProps["onSave"]
) => {
  const pendingImportPackageRef = useRef<Record<string, unknown> | null>(null);

  const handleSaveWithImportPackage = useCallback(
    (newOrderData: NewOrderData) => {
      const meta = pendingImportPackageRef.current;
      pendingImportPackageRef.current = null;
      if (!meta) {
        onSave(newOrderData);
        return;
      }

      const payloadWithImport = (Array.isArray(newOrderData)
        ? newOrderData.map((payload) => attachImportPackageMeta(payload, meta))
        : attachImportPackageMeta(newOrderData, meta)) as unknown as NewOrderData;

      onSave(payloadWithImport);
    },
    [onSave]
  );

  return { pendingImportPackageRef, handleSaveWithImportPackage };
};
