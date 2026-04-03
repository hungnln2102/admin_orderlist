import { PlusIcon } from "@heroicons/react/24/outline";
import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import GradientButton from "@/components/ui/GradientButton";
import type { InputDto } from "@/lib/formsApi";

interface InputListSectionProps {
  items: InputDto[];
  loading: boolean;
  error: string | null;
  onCreateInput: () => void;
}

export function InputListSection({
  items,
  loading,
  error,
  onCreateInput,
}: InputListSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <GradientButton
          icon={PlusIcon}
          onClick={onCreateInput}
          className="!py-2.5 !px-5 text-sm"
        >
          Tạo input
        </GradientButton>
      </div>
      <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
        {error && (
          <div className="px-4 py-3 bg-red-500/15 border-b border-red-500/30 text-sm text-red-200">
            {error}
          </div>
        )}
        <ResponsiveTable
          showCardOnMobile
          cardView={
            loading ? (
              <div className="p-8 text-center">
                <p className="text-white/70 text-lg">
                  Đang tải danh sách input...
                </p>
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-white/70 text-lg">Chưa có input nào</p>
              </div>
            ) : (
              <TableCard
                data={items}
                renderCard={(item: Record<string, unknown>, index: number) => {
                  const row = item as unknown as InputDto;
                  return (
                    <div className="rounded-xl border border-white/10 bg-slate-800/50 p-4 space-y-2">
                      <span className="text-xs text-white/50 font-medium">
                        #{index + 1}
                      </span>
                      <p className="font-semibold text-white">
                        {row.name || "Chưa đặt tên"}
                      </p>
                      <p className="text-sm text-white/70 uppercase tracking-wide">
                        {row.type || "text"}
                      </p>
                    </div>
                  );
                }}
              />
            )
          }
        >
          <table className="min-w-full divide-y divide-white/10">
            <thead>
              <tr className="bg-white/5">
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/80"
                >
                  STT
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/80"
                >
                  Tên input
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/80"
                >
                  Loại
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-white/60"
                  >
                    Đang tải danh sách input...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-white/60"
                  >
                    Chưa có input nào
                  </td>
                </tr>
              ) : (
                items.map((row, index) => (
                  <tr
                    key={row.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-white/90 font-medium">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {row.name || "Chưa đặt tên"}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/80 uppercase tracking-wide">
                      {row.type || "text"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ResponsiveTable>
      </div>
    </div>
  );
}

