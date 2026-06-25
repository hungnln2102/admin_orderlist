import React from "react";
import {
  CheckIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { CategoryItem } from "@/lib/categoryApi";
import { getCategoryVisualStyle } from "../utils/categoryColors";

type CategoryTagCardProps = {
  category: CategoryItem;
  isDeleting: boolean;
  editDisabled: boolean;
  deleteDisabled: boolean;
  deleting: boolean;
  onEdit: (category: CategoryItem) => void;
  onRequestDelete: (id: number) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (id: number) => void;
};

export const CategoryTagCard: React.FC<CategoryTagCardProps> = ({
  category,
  isDeleting,
  editDisabled,
  deleteDisabled,
  deleting,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}) => (
  <div className="group rounded-2xl border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 p-5 shadow-sm backdrop-blur-sm hover:border-white/25 transition-all">
    <div className="flex items-start gap-4">
      <div
        className="h-14 w-14 rounded-xl border-2 border-white/20 flex-shrink-0 shadow-md"
        style={getCategoryVisualStyle(category.color)}
      />

      <div className="flex-1 min-w-0">
        <h4 className="text-base font-semibold text-white truncate">
          {category.name}
        </h4>
        <p className="text-xs text-slate-400 mt-1 font-mono break-all line-clamp-3">
          {category.color || "#facc15"}
        </p>
      </div>

      {isDeleting ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancelDelete}
            disabled={deleting}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            title="H?y"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onConfirmDelete(category.id)}
            disabled={deleting}
            className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            title="X?c nh?n x?a"
          >
            <CheckIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(category)}
            disabled={editDisabled}
            className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
            title="S?a"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onRequestDelete(category.id)}
            disabled={deleteDisabled}
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            title="X?a"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  </div>
);
