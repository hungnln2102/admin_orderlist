import React from "react";
import { ExclamationTriangleIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import GradientButton from "../../../../components/ui/GradientButton";

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
  return (
    <div className="space-y-4">
      <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.25)] backdrop-blur-sm relative z-10">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          {/* Search Group */}
          <div className="relative w-full lg:flex-1 group">
            <MagnifyingGlassIcon className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300 pointer-events-none z-10 transition-opacity duration-300 ${loading ? 'opacity-30' : 'opacity-70 group-focus-within:opacity-100'}`} />
            <input
              type="text"
              placeholder="Tìm kiếm tài khoản, danh mục, mật khẩu..."
              className="w-full pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
              style={{ paddingLeft: '3.25rem' }}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {loading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            )}
          </div>

          {/* Action Group */}
          <div className="flex items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
            <div className="hidden lg:block w-px h-8 bg-white/10 mx-1"></div>
            
            <GradientButton
              onClick={onCreate}
              disabled={loading}
              className="!py-2.5 !px-6 text-sm whitespace-nowrap"
            >
              Tạo mới
            </GradientButton>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mx-2 text-sm text-rose-300 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-xl">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
