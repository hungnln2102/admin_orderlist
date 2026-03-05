import { useMemo, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import Pagination from "@/components/ui/Pagination";

type AdminStatus = "active" | "expired" | "pending";

type AdminAccount = {
  id: string;
  account: string;
  email: string;
  status: AdminStatus;
};

const MOCK_ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    id: "1",
    account: "admin-main-01",
    email: "admin-main-01@example.com",
    status: "active",
  },
  {
    id: "2",
    account: "admin-team-02",
    email: "admin-team-02@example.com",
    status: "expired",
  },
  {
    id: "3",
    account: "admin-backup-03",
    email: "admin-backup-03@example.com",
    status: "pending",
  },
];

const STATUS_LABELS: Record<AdminStatus, string> = {
  active: "Đang hoạt động",
  expired: "Hết hạn",
  pending: "Chờ gia hạn",
};

const PAGE_SIZE = 10;

export default function RenewAdobeAdmin() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return MOCK_ADMIN_ACCOUNTS;
    const q = searchTerm.trim().toLowerCase();
    return MOCK_ADMIN_ACCOUNTS.filter(
      (item) =>
        item.account.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q)
    );
  }, [searchTerm]);

  const totalItems = filtered.length;
  const start = (currentPage - 1) * PAGE_SIZE;
  const currentRows = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Renew <span className="text-indigo-400">Adobe</span>
          </h1>
          <p className="text-sm font-medium text-white/50 tracking-wide">
            Danh sách tài khoản admin dùng cho Renew Adobe
          </p>
        </div>
      </div>

      <div className="rounded-[32px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-5 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm">
        <div className="relative w-full max-w-md">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-300/70 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo tài khoản, email..."
            className="w-full pl-11 pr-4 py-2.5 border border-white/10 rounded-2xl bg-slate-950/40 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition-all placeholder:text-slate-400/70"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
        <ResponsiveTable
          showCardOnMobile
          cardView={
            currentRows.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-white/70 text-lg mb-2">
                  Không tìm thấy tài khoản nào
                </p>
                <p className="text-white/60 text-sm">
                  Thử thay đổi từ khóa tìm kiếm
                </p>
              </div>
            ) : (
              <TableCard
                data={currentRows}
                renderCard={(item, idx) => {
                  const acc = item as AdminAccount;
                  return (
                    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-white/50">
                            #{start + idx + 1}
                          </p>
                          <p className="text-sm font-semibold text-white">
                            {acc.account}
                          </p>
                        </div>
                        <StatusBadge status={acc.status} />
                      </div>
                      <p className="text-xs text-white/70 break-all">
                        {acc.email}
                      </p>
                    </div>
                  );
                }}
                className="p-4"
              />
            )
          }
        >
          <table className="min-w-full divide-y divide-white/5 text-white">
            <thead>
              <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-[10px] [&>th]:sm:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.1em] [&>th]:text-indigo-300/70 [&>th]:text-left [&>th]:bg-white/[0.03] [&>th]:whitespace-nowrap">
                <th className="w-12 text-center">STT</th>
                <th className="min-w-[160px]">TÀI KHOẢN ADMIN</th>
                <th className="min-w-[200px]">EMAIL</th>
                <th className="w-32">TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-white/70"
                  >
                    <p className="text-lg mb-2">
                      Không tìm thấy tài khoản nào
                    </p>
                    <p className="text-sm text-white/60">
                      Thử thay đổi từ khóa tìm kiếm
                    </p>
                  </td>
                </tr>
              ) : (
                currentRows.map((item, i) => {
                  const acc = item as AdminAccount;
                  return (
                    <tr key={acc.id}>
                      <td className="px-2 sm:px-4 py-3 text-center text-xs text-white/70">
                        {start + i + 1}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-sm font-medium">
                        {acc.account}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-sm text-white/80 break-all">
                        {acc.email}
                      </td>
                      <td className="px-2 sm:px-4 py-3">
                        <StatusBadge status={acc.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </ResponsiveTable>

        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10 bg-slate-900/85 px-4 py-3 sm:px-6">
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

type StatusBadgeProps = {
  status: AdminStatus;
};

function StatusBadge({ status }: StatusBadgeProps) {
  const label = STATUS_LABELS[status];

  const colorClasses =
    status === "active"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/40"
      : status === "expired"
      ? "bg-rose-500/15 text-rose-300 border-rose-400/40"
      : "bg-amber-500/15 text-amber-300 border-amber-400/40";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${colorClasses}`}
    >
      {label}
    </span>
  );
}

