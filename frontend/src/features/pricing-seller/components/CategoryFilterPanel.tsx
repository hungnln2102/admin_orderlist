import type { SellerPricingCategory } from "../types";

type CategoryFilterPanelProps = {
  categories: SellerPricingCategory[];
  activeCategoryId: number | null;
  onChangeCategory: (categoryId: number | null) => void;
};

export default function CategoryFilterPanel({
  categories,
  activeCategoryId,
  onChangeCategory,
}: CategoryFilterPanelProps) {
  return (
    <aside className="h-fit rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Danh mục</p>
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => onChangeCategory(null)}
          className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
            activeCategoryId == null
              ? "bg-blue-600 text-white"
              : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          Tất cả
        </button>

        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onChangeCategory(category.id)}
            className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
              activeCategoryId === category.id
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </aside>
  );
}
