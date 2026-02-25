import { useEffect, useState } from "react";
import {
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import { fetchFormNames, type FormNameDto } from "@/lib/formsApi";

export type FormInfoItem = {
  id: number;
  name: string;
  description: string;
};

export default function FormInfo() {
  const [items, setItems] = useState<FormInfoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const rows: FormNameDto[] = await fetchFormNames();
        if (cancelled) return;
        const mapped: FormInfoItem[] = rows.map((row) => ({
          id: Number(row.id),
          name: (row.name || "").trim() || "Chưa đặt tên",
          description: (row.description || "").trim() || "Không có mô tả",
        }));
        setItems(mapped);
      } catch (err) {
        if (!cancelled) {
          setError("Không thể tải danh sách form");
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleView = (item: FormInfoItem) => {
    console.log("Xem", item);
  };

  const handleEdit = (item: FormInfoItem) => {
    console.log("Sửa", item);
  };

  const handleDelete = (item: FormInfoItem) => {
    console.log("Xóa", item);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Form <span className="text-indigo-400">thông tin</span>
          </h1>
          <p className="text-sm font-medium text-white/50 tracking-wide">
            Quản lý danh sách form và mô tả
          </p>
        </div>
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
                <p className="text-white/70 text-lg">Đang tải danh sách form...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-white/70 text-lg">Chưa có form nào</p>
              </div>
            ) : (
              <TableCard
                data={items}
                renderCard={(item: Record<string, unknown>, index: number) => {
                  const row = item as unknown as FormInfoItem;
                  return (
                    <div className="rounded-xl border border-white/10 bg-slate-800/50 p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs text-white/50 font-medium">
                          #{index + 1}
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleView(row)}
                            className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-500/20"
                            aria-label="Xem"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(row)}
                            className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/20"
                            aria-label="Sửa"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20"
                            aria-label="Xóa"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="font-semibold text-white">{row.name}</p>
                      <p className="text-sm text-white/70 line-clamp-2">
                        {row.description}
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
                  Tên Form
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/80"
                >
                  Mô tả form
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/80"
                >
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-white/60"
                  >
                    Đang tải danh sách form...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-white/60"
                  >
                    Chưa có form nào
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
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-white/80 max-w-md">
                      {row.description}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleView(row)}
                          className="p-2 rounded-lg text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                          title="Xem"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(row)}
                          className="p-2 rounded-lg text-amber-400 hover:bg-amber-500/20 transition-colors"
                          title="Sửa"
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(row)}
                          className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Xóa"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
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
