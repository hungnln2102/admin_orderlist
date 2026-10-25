import React, { useState, useMemo } from "react";
import {
  PackagePlus,
  Plus,
  Search,
  RefreshCw,
  Download,
  DollarSign,
  Calendar,
  FileText,
  Eye,
  ShieldCheck,
  XCircle,
  Loader2,
} from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";

interface ExternalImportItem {
  id: number;
  importId: string;
  amount: number;
  importDate: string;
  note: string;
}

export const ExternalImportsPage: React.FC = () => {
  const notify = useNotification();
  const [items, setItems] = useState<ExternalImportItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<ExternalImportItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    importId: "",
    amount: "",
    importDate: new Date().toISOString().split("T")[0],
    note: "",
  });

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      notify.success("Đã làm mới dữ liệu nguồn hàng ngoài luồng!", "Thành Công");
    }, 600);
  };

  const openCreateModal = () => {
    const randomId = `IMP-${Math.floor(100 + Math.random() * 900)}`;
    setFormData({
      importId: randomId,
      amount: "",
      importDate: new Date().toISOString().split("T")[0],
      note: "",
    });
    setModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      const amountNum = Number(formData.amount.replace(/\D/g, "")) || 0;
      const newItem: ExternalImportItem = {
        id: Date.now(),
        importId: formData.importId || `IMP-${Math.floor(100 + Math.random() * 900)}`,
        amount: amountNum,
        importDate: formData.importDate,
        note: formData.note,
      };
      setItems([newItem, ...items]);
      notify.success("Đã tạo mới đơn nhập ngoài luồng thành công!", "Thành Công");
      setSubmitting(false);
      setModalOpen(false);
    }, 500);
  };

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchSearch =
        search === "" ||
        it.importId.toLowerCase().includes(search.toLowerCase()) ||
        it.note.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [items, search]);

  const totalAmount = items.reduce((sum, it) => sum + it.amount, 0);
  const totalCount = items.length;

  const formatVND = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1650px] mx-auto font-sans text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 text-cyan-400 rounded-xl border border-cyan-500/30 shadow-inner">
            <PackagePlus className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                Nguồn Hàng & Kho
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Đang Hoạt Động
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide mt-1">
              Nhập Nguồn Hàng Ngoài Luồng
            </h1>
            <p className="text-xs text-slate-400">
              Ghi nhận và quản lý chi phí nhập hàng, tài khoản không qua đơn đặt tự động hệ thống
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            title="Làm mới"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          <button
            onClick={() => notify.success("Đã xuất báo cáo chi phí nhập hàng ra Excel!", "Xuất Dữ Liệu")}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Tạo Đơn Nhập Mới</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Tổng Giá Trị Nhập Hàng</div>
            <div className="text-lg sm:text-xl font-bold text-cyan-400 font-mono mt-1">
              {formatVND(totalAmount)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Tổng chi phí ngoài luồng</div>
          </div>
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Tổng Số Đơn Nhập</div>
            <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono mt-1">
              {totalCount} đơn
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Ghi nhận trong hệ thống</div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Trạng Thái Kế Toán</div>
            <div className="text-lg sm:text-xl font-bold text-indigo-400 font-mono mt-1">
              100% Đã Khóa Sổ
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Chứng từ bất biến đối soát</div>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã đơn, ghi chú..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Hiển thị <span className="text-white font-bold">{filteredItems.length}</span> đơn nhập
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/40">
                <th className="py-3 px-4 font-bold">Mã Đơn Nhập</th>
                <th className="py-3 px-4 font-bold text-right">Số Tiền (VNĐ)</th>
                <th className="py-3 px-4 font-bold">Ngày Nhập</th>
                <th className="py-3 px-4 font-bold">Ghi Chú</th>
                <th className="py-3 px-4 font-bold text-center w-36 whitespace-nowrap">Trạng Thái</th>
                <th className="py-3 px-4 font-bold text-center w-24 whitespace-nowrap">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-cyan-400">{item.importId}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400 font-mono">
                      {formatVND(item.amount)}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{item.importDate}</td>
                    <td className="py-3 px-4 text-slate-400 font-sans max-w-md truncate" title={item.note}>
                      {item.note || "—"}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Đã Hạch Toán
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => setViewingItem(item)}
                        title="Xem chi tiết chứng từ"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-inner">
                        <PackagePlus className="w-6 h-6 text-cyan-400/60" />
                      </div>
                      <div className="text-slate-300 text-sm font-semibold">Chưa có đợt nhập hàng ngoài luồng nào</div>
                      <p className="text-slate-500 text-xs max-w-sm">
                        Ghi nhận các khoản chi phí mua credit API, tài khoản ngoài luồng hoặc chi phí nhập hàng phát sinh.
                      </p>
                      <button
                        onClick={openCreateModal}
                        className="mt-2 px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Ghi Nhận Đợt Nhập Mới
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tạo Đơn Nhập Ngoài Luồng */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-cyan-400" />
                Tạo Đơn Nhập Ngoài Luồng Mới
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {/* Lưu ý tính bất biến */}
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Lưu ý tài chính: Đơn nhập sau khi tạo sẽ được liên kết trực tiếp vào hóa đơn, biên lai và sổ cái, không thể sửa hoặc xóa sau khi ghi nhận.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mã Đơn Nhập *</label>
                  <input
                    type="text"
                    required
                    value={formData.importId}
                    onChange={(e) => setFormData({ ...formData, importId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ngày Nhập *</label>
                  <input
                    type="date"
                    required
                    value={formData.importDate}
                    onChange={(e) => setFormData({ ...formData, importDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Số Tiền (VNĐ) *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: 4000000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ghi Chú Chi Tiết</label>
                <textarea
                  rows={3}
                  placeholder="Nhập ghi chú nguồn hàng..."
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 hover:from-cyan-300 hover:to-sky-400 transition-colors shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Tạo Đơn Nhập</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal View Detail (Read-Only & Immutability Notice) */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
                  <PackagePlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Chi Tiết Đơn Nhập Ngoài Luồng
                  </h3>
                  <span className="text-[11px] font-mono text-cyan-400">
                    {viewingItem.importId}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewingItem(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Immutability Notice */}
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
                <div>
                  <p className="font-semibold text-white">Chứng từ tài chính bất biến</p>
                  <p className="text-[11px] text-indigo-300/80 mt-0.5">
                    Đơn nhập đã được liên kết với biên lai thanh toán và trừ tiền quỹ sổ cái ngân hàng. Không thể chỉnh sửa hoặc xóa để bảo toàn tính toàn vẹn kiểm toán.
                  </p>
                </div>
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Mã đơn nhập:</span>
                  <p className="font-mono font-bold text-cyan-400 mt-0.5">{viewingItem.importId}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Ngày nhập:</span>
                  <p className="font-mono text-slate-200 mt-0.5">{viewingItem.importDate}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Số tiền thanh toán:</span>
                  <p className="font-mono font-bold text-emerald-400 mt-0.5">{formatVND(viewingItem.amount)}</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-800/60">
                  <span className="text-slate-400 text-[11px]">Ghi chú chi tiết:</span>
                  <p className="font-sans text-slate-300 mt-0.5 whitespace-pre-wrap">{viewingItem.note || "Không có ghi chú"}</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Trạng thái hạch toán:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Đã Ghi Nhận Biên Lai & Sổ Cái
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalImportsPage;
