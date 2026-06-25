import React from "react";
import {
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { MergedProduct } from "../utils/productInfoHelpers";

type ProductRowActionsProps = {
  item: MergedProduct;
  isExpanded: boolean;
  onToggle: (id: number | null) => void;
  onEdit: (item: MergedProduct) => void;
};

export const ProductRowActions: React.FC<ProductRowActionsProps> = ({
  item,
  isExpanded,
  onToggle,
  onEdit,
}) => (
  <td className="product-row__actions px-4 py-3 text-center align-top whitespace-nowrap">
    <button
      className="product-info-action-button product-info-action-button--view inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-blue-400 transition-all hover:border-blue-500/30 hover:bg-blue-500/10 active:scale-90"
      title="Xem"
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle(isExpanded ? null : Number(item.id));
      }}
    >
      <EyeIcon className="h-3.5 w-3.5" />
    </button>

    <button
      className="product-info-action-button product-info-action-button--edit ml-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-emerald-400 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10 active:scale-90"
      title="S?a"
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onEdit(item);
      }}
    >
      <PencilSquareIcon className="h-3.5 w-3.5" />
    </button>

    <button
      className="product-info-action-button product-info-action-button--delete ml-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-rose-400 transition-all hover:border-rose-500/30 hover:bg-rose-500/10 active:scale-90"
      title="X?a"
      type="button"
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <TrashIcon className="h-3.5 w-3.5" />
    </button>
  </td>
);
