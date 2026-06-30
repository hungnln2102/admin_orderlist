import Pagination from "@/components/ui/Pagination";
import { IpWhitelistTable } from "./IpWhitelistTable";
import type { IpWhitelistItem } from "../types";

type IpWhitelistListPanelProps = {
  loading: boolean;
  items: IpWhitelistItem[];
  startIndex: number;
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onEdit: (item: IpWhitelistItem) => void;
  onDelete: (item: IpWhitelistItem) => void;
};

export function IpWhitelistListPanel({
  loading,
  items,
  startIndex,
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onEdit,
  onDelete,
}: IpWhitelistListPanelProps) {
  return (
      <div className="overflow-hidden rounded-[18px] border border-white/12 bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)]">
        {loading ? (
          <div className="px-4 py-14 text-center text-white/70">
            Đang tải danh sách IP whitelist...
          </div>
        ) : (
          <>
            <IpWhitelistTable
              items={items}
              startIndex={startIndex}
              onEdit={onEdit}
              onDelete={onDelete}
            />

            {totalItems > 0 && (
              <div className="flex flex-col gap-3 border-t border-white/10 bg-slate-900/85 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalItems}
                  pageSize={pageSize}
                  onPageChange={onPageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
  );
}
