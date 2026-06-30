import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

type ActiveKeysSearchProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
};

export function ActiveKeysSearch({ searchTerm, onSearchChange }: ActiveKeysSearchProps) {
  return (
      <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
        <div className="relative w-full max-w-md">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300/70 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn hàng, sản phẩm, key, thời hạn..."
            className="w-full pl-11 pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
            value={searchTerm}
            onChange={(e) => {
              onSearchChange(e.target.value);
            }}
          />
        </div>
      </div>
  );
}
