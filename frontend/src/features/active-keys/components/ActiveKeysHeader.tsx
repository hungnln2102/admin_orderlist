import { PlusIcon } from "@heroicons/react/24/outline";

type ActiveKeysHeaderProps = { onCreate: () => void };

export function ActiveKeysHeader({ onCreate }: ActiveKeysHeaderProps) {
  return (
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Quản lí <span className="text-indigo-400">Key active</span>
          </h1>
          <p className="text-sm font-medium text-white/50 tracking-wide">
            Xem và quản lý key kích hoạt sản phẩm
          </p>
        </div>
        <button
          type="button"
          onClick={() => onCreate()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
        >
          <PlusIcon className="h-5 w-5" />
          Tạo key
        </button>
      </div>
  );
}
