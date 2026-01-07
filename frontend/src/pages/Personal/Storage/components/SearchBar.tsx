import React from "react";
import { ExclamationTriangleIcon, MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";

type SearchBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
  loading: boolean;
  error: string | null;
};

export const SearchBar: React.FC<SearchBarProps> = ({
  search,
  onSearchChange,
  onCreate,
  loading,
  error,
}) => {
  const inputClass =
    "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white placeholder:text-slate-300 focus:ring-2 focus:ring-blue-400/60 focus:border-blue-400/60";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 shadow-lg shadow-indigo-900/40 p-4 space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="h-5 w-5 text-white/60 absolute left-3 top-2.5" />
          <input
            className={`${inputClass} pl-10`}
            placeholder="Tim theo goi, tai khoan, nha cung cap..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
          disabled={loading}
        >
          <PlusIcon className="h-4 w-4" />
          Them
        </button>
        {loading && (
          <div className="text-sm text-white/80 flex items-center gap-2">
            <span className="animate-spin h-4 w-4 rounded-full border-2 border-white/40 border-t-transparent" />
            Dang tai...
          </div>
        )}
        {error && (
          <div className="text-sm text-rose-200 flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
