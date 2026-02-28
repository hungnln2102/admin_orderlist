import { useEffect, useState } from "react";
import {
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { ResponsiveTable, TableCard } from "@/components/ui/ResponsiveTable";
import GradientButton from "@/components/ui/GradientButton";
import {
  fetchFormNames,
  fetchFormDetail,
  fetchInputs,
  type FormNameDto,
  type FormDetailDto,
  type FormInputDto,
  type InputDto,
} from "@/lib/formsApi";
import { ModalShell } from "../PackageProduct/components/Modals/ModalShell";

type FormInfoTab = "form" | "input";

export type FormInfoItem = {
  id: number;
  name: string;
  description: string;
};

type FormDetailView = FormDetailDto & {
  inputs: FormInputDto[];
};

export default function FormInfo() {
  const [activeTab, setActiveTab] = useState<FormInfoTab>("form");
  const [items, setItems] = useState<FormInfoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputItems, setInputItems] = useState<InputDto[]>([]);
  const [inputLoading, setInputLoading] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState<FormDetailView | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setInputLoading(true);
        setInputError(null);
        const rows = await fetchInputs();
        if (cancelled) return;
        setInputItems(rows);
      } catch (err) {
        if (!cancelled) {
          setInputError("Không thể tải danh sách input");
          setInputItems([]);
        }
      } finally {
        if (!cancelled) setInputLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleView = async (item: FormInfoItem) => {
    setViewOpen(true);
    setViewError(null);
    setViewLoading(true);
    try {
      const detail = await fetchFormDetail(item.id);
      setViewData({
        id: detail.id ?? item.id,
        name: (detail.name || "").trim() || item.name,
        description:
          (detail.description || "").trim() || item.description,
        inputs: Array.isArray(detail.inputs) ? detail.inputs : [],
      });
    } catch (err) {
      console.error("Không thể tải chi tiết form", err);
      setViewError("Không thể tải chi tiết form");
      setViewData({
        id: item.id,
        name: item.name,
        description: item.description,
        inputs: [],
      });
    } finally {
      setViewLoading(false);
    }
  };

  const handleCloseView = () => {
    setViewOpen(false);
    setViewError(null);
    setViewData(null);
  };

  const handleEdit = (item: FormInfoItem) => {
    console.log("Sửa", item);
  };

  const handleDelete = (item: FormInfoItem) => {
    console.log("Xóa", item);
  };

  const handleCreateForm = () => {
    console.log("Tạo form");
  };

  const handleCreateInput = () => {
    console.log("Tạo input");
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("form")}
          className={`px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-medium transition-colors ${
            activeTab === "form"
              ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/40"
              : "bg-slate-900/70 text-indigo-200/80 hover:bg-slate-800"
          }`}
        >
          Form
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("input")}
          className={`px-3.5 py-1.5 rounded-2xl text-xs sm:text-sm font-medium transition-colors ${
            activeTab === "input"
              ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/40"
              : "bg-slate-900/70 text-indigo-200/80 hover:bg-slate-800"
          }`}
        >
          Input
        </button>
      </div>

      {activeTab === "form" && (
      <div className="space-y-4">
      <div className="flex justify-end">
        <GradientButton icon={PlusIcon} onClick={handleCreateForm} className="!py-2.5 !px-5 text-sm">
          Tạo form
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
      )}

      {activeTab === "input" && (
      <div className="space-y-4">
      <div className="flex justify-end">
        <GradientButton icon={PlusIcon} onClick={handleCreateInput} className="!py-2.5 !px-5 text-sm">
          Tạo input
        </GradientButton>
      </div>
      <div className="rounded-[18px] bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 border border-white/12 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)] overflow-hidden">
        {inputError && (
          <div className="px-4 py-3 bg-red-500/15 border-b border-red-500/30 text-sm text-red-200">
            {inputError}
          </div>
        )}
        <ResponsiveTable
          showCardOnMobile
          cardView={
            inputLoading ? (
              <div className="p-8 text-center">
                <p className="text-white/70 text-lg">Đang tải danh sách input...</p>
              </div>
            ) : inputItems.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-white/70 text-lg">Chưa có input nào</p>
              </div>
            ) : (
              <TableCard
                data={inputItems}
                renderCard={(item: Record<string, unknown>, index: number) => {
                  const row = item as unknown as InputDto;
                  return (
                    <div className="rounded-xl border border-white/10 bg-slate-800/50 p-4 space-y-2">
                      <span className="text-xs text-white/50 font-medium">#{index + 1}</span>
                      <p className="font-semibold text-white">{row.name || "Chưa đặt tên"}</p>
                      <p className="text-sm text-white/70 uppercase tracking-wide">{row.type || "text"}</p>
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
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/80">STT</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/80">Tên input</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white/80">Loại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {inputLoading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-white/60">Đang tải danh sách input...</td>
                </tr>
              ) : inputItems.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-white/60">Chưa có input nào</td>
                </tr>
              ) : (
                inputItems.map((row, index) => (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-sm text-white/90 font-medium">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-white">{row.name || "Chưa đặt tên"}</td>
                    <td className="px-4 py-3 text-sm text-white/80 uppercase tracking-wide">{row.type || "text"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ResponsiveTable>
      </div>
      </div>
      )}

      <ModalShell
        open={viewOpen}
        title={
          viewData
            ? `Chi tiết form: ${viewData.name || "Không có tên"}`
            : "Đang tải chi tiết form..."
        }
        onClose={handleCloseView}
        footer={
          <button
            onClick={handleCloseView}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
          >
            Đóng
          </button>
        }
      >
        <div className="space-y-4 rounded-lg bg-slate-800/95 px-1 py-1 text-white">
          {viewError && (
            <div className="px-3 py-2 rounded-md bg-red-500/20 border border-red-400/50 text-sm text-red-200">
              {viewError}
            </div>
          )}

          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">
              {viewData?.name || "Đang tải..."}
            </h3>
            <p className="text-sm text-white/80">
              {viewData?.description || "Không có mô tả"}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-white">
              Các khối input
            </h4>
            {viewLoading && (
              <p className="text-sm text-white/70">
                Đang tải danh sách khối input...
              </p>
            )}
            {!viewLoading && viewData && viewData.inputs.length === 0 && (
              <p className="text-sm text-white/70">
                Form này chưa có khối input nào.
              </p>
            )}
            {!viewLoading && viewData && viewData.inputs.length > 0 && (
              <ul className="space-y-1">
                {viewData.inputs.map((input) => (
                  <li
                    key={input.id}
                    className="flex items-center justify-between rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-white">
                      {input.name || "Chưa đặt tên"}
                    </span>
                    <span className="text-xs uppercase tracking-wide text-white/70">
                      {input.type || "text"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
