import type { SupplyLike, SupplyPriceLike } from "@/features/supply/utils/supplierRules";
import { Order as ApiOrder } from "../../../constants";

export type Order = Omit<ApiOrder, "cost" | "price"> & {
  cost: number | string;
  price: number | string;
};

export interface Supply extends SupplyLike {
  id?: number;
  supplier_name?: string;
  source_name?: string;
  name?: string;
}

export interface SupplyPrice extends SupplyPriceLike {
  id?: number;
  source_id?: number;
  price?: number;
  source_name?: string;
}

export interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSave: (updatedOrder: Order) => Promise<void> | void;
}
