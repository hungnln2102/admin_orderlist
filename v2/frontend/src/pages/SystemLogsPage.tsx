import React, { useEffect, useState } from "react";
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Eye,
  Activity,
  Database,
  Settings,
  Sliders
} from "lucide-react";

interface AuditLog {
  id: number;
  event_name: string;
  event_name_vi: string;
  aggregate_type: string;
  aggregate_type_vi: string;
  aggregate_id: string;
  payload: any;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  success: number;
  errors: number;
  todayTotal: number;
  successRate: number;
}

const EVENT_CONFIG_META: Record<string, any> = {
  ORDER_CREATED: {
    label: "Tạo mới đơn hàng",
    module: "Đơn hàng",
    defaultField: "id_order",
    availableFields: [
      { key: "id_order", label: "Mã đơn hàng" },
      { key: "customer", label: "Tên khách hàng" },
      { key: "price", label: "Giá tiền" },
      { key: "information_order", label: "Thông tin đơn hàng" },
      { key: "slot", label: "Slot / Tài khoản" },
      { key: "id_product", label: "Mã sản phẩm" },
      { key: "note", label: "Ghi chú" },
      { key: "status", label: "Trạng thái" },
      { key: "contact", label: "Số liên hệ" },
    ],
  },
  ORDER_UPDATED: {
    label: "Cập nhật đơn hàng",
    module: "Đơn hàng",
    defaultField: "summary",
    availableFields: [
      { key: "summary", label: "📝 Tóm tắt thay đổi (Cũ ➔ Mới)" },
      { key: "id_order", label: "Mã đơn hàng" },
      { key: "customer", label: "Tên khách hàng" },
      { key: "price", label: "Giá tiền" },
      { key: "information_order", label: "Thông tin đơn hàng" },
      { key: "slot", label: "Slot / Tài khoản" },
      { key: "id_product", label: "Mã sản phẩm" },
      { key: "note", label: "Ghi chú" },
      { key: "status", label: "Trạng thái" },
    ],
  },
  ORDER_DELETED: {
    label: "Xóa đơn hàng",
    module: "Đơn hàng",
    defaultField: "id_order",
    availableFields: [
      { key: "id_order", label: "Mã đơn hàng" },
      { key: "customer", label: "Tên khách hàng" },
      { key: "information_order", label: "Thông tin đơn hàng" },
    ],
  },
  ORDER_PAID: {
    label: "Xác nhận thanh toán đơn",
    module: "Đơn hàng",
    defaultField: "id_order",
    availableFields: [
      { key: "id_order", label: "Mã đơn hàng" },
      { key: "price", label: "Số tiền thanh toán" },
      { key: "payment_method", label: "Phương thức" },
    ],
  },
  PRODUCT_CREATED: {
    label: "Thêm mới sản phẩm",
    module: "Sản phẩm",
    defaultField: "name",
    availableFields: [
      { key: "name", label: "Tên sản phẩm" },
      { key: "price", label: "Giá sản phẩm" },
      { key: "category", label: "Danh mục" },
    ],
  },
  SUPPLIER_CREATED: {
    label: "Thêm mới nhà cung cấp",
    module: "Nhà cung cấp",
    defaultField: "supplier_name",
    availableFields: [
      { key: "supplier_name", label: "Tên nhà cung cấp" },
      { key: "contact", label: "Thông tin liên hệ" },
    ],
  },
  WEBHOOK_MONEY_IN: {
    label: "Nhận tiền chuyển khoản",
    module: "Giao dịch SePay",
    defaultField: "description",
    availableFields: [
      { key: "description", label: "Nội dung chuyển khoản" },
      { key: "amount", label: "Số tiền nhận" },
      { key: "reference_number", label: "Mã giao dịch" },
    ],
  },
  WAREHOUSE_STOCK_CREATED: {
    label: "Thêm tài khoản kho",
    module: "Kho hàng",
    defaultField: "account_username",
    availableFields: [
      { key: "account_username", label: "Tên tài khoản kho" },
      { key: "status", label: "Trạng thái" },
    ],
  },
  FINANCE_FIXED_COST_MUTATED: {
    label: "Cập nhật chi phí cố định",
    module: "Tài chính",
    defaultField: "title",
    availableFields: [
      { key: "title", label: "Tiêu đề chi phí" },
      { key: "amount", label: "Số tiền" },
    ],
  },
};

export const SystemLogsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"logs" | "settings">("logs");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Field Mappings Configuration State (persisted in localStorage)
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("admin_orderlist_log_field_mappings");
      return saved ? JSON.parse(saved) : {
        ORDER_CREATED: "id_order",
        ORDER_UPDATED: "summary",
        ORDER_DELETED: "id_order",
        ORDER_PAID: "id_order",
        PRODUCT_CREATED: "name",
        SUPPLIER_CREATED: "supplier_name",
        WEBHOOK_MONEY_IN: "description",
        WAREHOUSE_STOCK_CREATED: "account_username",
        FINANCE_FIXED_COST_MUTATED: "title",
      };
    } catch {
      return {};
    }
  });

  const saveFieldMapping = (eventName: string, fieldKey: string) => {
    const updated = { ...fieldMappings, [eventName]: fieldKey };
    setFieldMappings(updated);
    localStorage.setItem("admin_orderlist_log_field_mappings", JSON.stringify(updated));
  };

  // Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [aggregateType, setAggregateType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/system/audit-logs/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Lỗi tải thống kê nhật ký:", err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(aggregateType && { aggregate_type: aggregateType }),
        ...(status && { status }),
        ...(debouncedSearch && { search: debouncedSearch }),
      });

      const res = await fetch(`/api/system/audit-logs?${params}`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Lỗi tải danh sách nhật ký:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, aggregateType, status, debouncedSearch]);

  const renderContentSummary = (log: AuditLog) => {
    const p = log.payload || {};
    const eventName = log.event_name;
    const selectedField = fieldMappings[eventName] || (eventName === "ORDER_UPDATED" ? "summary" : "id_order");

    // Professional structured diff view when summary is selected
    if (selectedField === "summary" && p.changes && typeof p.changes === "object" && Object.keys(p.changes).length > 0) {
      const fieldLabels: Record<string, string> = {
        customer: "Khách hàng",
        contact: "Liên hệ",
        information_order: "Thông tin đơn hàng",
        slot: "Slot / Tài khoản",
        id_product: "Mã sản phẩm",
        price: "Giá bán",
        gross_selling_price: "Giá bán gộp",
        cost: "Giá nhập",
        status: "Trạng thái",
        payment_method: "Thanh toán",
        note: "Ghi chú",
        days: "Thời hạn",
        expired_at: "Ngày hết hạn",
      };

      const formatVal = (key: string, val: any) => {
        if (val == null || val === "") return "(trống)";
        if (["price", "gross_selling_price", "cost"].includes(key) && !isNaN(Number(val))) {
          return Number(val).toLocaleString("vi-VN") + " ₫";
        }
        return String(val);
      };

      return (
        <div className="space-y-1.5 py-1.5 max-w-xl">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
            <span>✏️ Chi tiết các trường thay đổi:</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {Object.entries(p.changes).map(([field, diff]: [string, any]) => {
              const label = fieldLabels[field] || field;
              const oldStr = formatVal(field, diff?.old);
              const newStr = formatVal(field, diff?.new);
              return (
                <div key={field} className="flex flex-wrap items-center gap-2 text-xs bg-slate-50 dark:bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 min-w-[130px]">{label}:</span>
                  <span className="line-through text-rose-500 font-mono text-[11px] bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded border border-rose-200/50 dark:border-rose-900/40">{oldStr}</span>
                  <span className="text-slate-400 font-bold">➔</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold text-[11px] bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-900/40">{newStr}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (selectedField === "summary" && p.summary) {
      return (
        <div className="text-xs font-medium text-slate-800 dark:text-slate-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 px-3 py-2 rounded-xl max-w-xl">
          ✏️ {p.summary}
        </div>
      );
    }

    const value = p[selectedField] !== undefined && p[selectedField] !== null && p[selectedField] !== "" 
      ? p[selectedField] 
      : (p.id_order || p.supplier_name || log.aggregate_id || "—");

    let displayValue = String(value);
    if ((selectedField === "price" || selectedField === "amount" || selectedField === "cost") && !isNaN(Number(value))) {
      displayValue = Number(value).toLocaleString("vi-VN") + " đ";
    }

    return (
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50">
          {displayValue}
        </span>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl shadow-xl border border-indigo-900/40 text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-5 h-5" /> Quản trị hệ thống & Kiểm toán
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Nhật Ký Hoạt Động & Dữ Liệu (Audit Logs)</h1>
          <p className="text-slate-300 text-sm">
            Ghi nhận 100% mọi thao tác bấm nút, thay đổi dữ liệu của người dùng trên toàn bộ hệ thống.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* Tabs */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "logs"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Activity className="w-4 h-4" /> Danh sách Log
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "settings"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Sliders className="w-4 h-4" /> Tùy chỉnh hiển thị log
            </button>
          </div>

          <button
            onClick={() => { fetchStats(); fetchLogs(); }}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-indigo-600/30 active:scale-95 cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && activeTab === "logs" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tổng sự kiện ghi nhận</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Hoạt động hôm nay</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stats.todayTotal.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tỷ lệ thành công</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.successRate}%</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Sự kiện lỗi (Errors)</p>
              <h3 className={`text-2xl font-bold ${stats.errors > 0 ? "text-rose-600" : "text-slate-900 dark:text-white"}`}>
                {stats.errors.toLocaleString()}
              </h3>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stats.errors > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-600"}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: LOGS TABLE */}
      {activeTab === "logs" && (
        <>
          {/* Filters Toolbar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative min-w-[280px] flex-1 md:flex-initial">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo mã ID, sự kiện..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
              </div>

              <select
                value={aggregateType}
                onChange={(e) => { setAggregateType(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              >
                <option value="">Tất cả phân hệ</option>
                <option value="ORDER">Quản lý Đơn hàng</option>
                <option value="PRODUCT">Quản lý Sản phẩm</option>
                <option value="SUPPLIER">Nhà cung cấp</option>
                <option value="FINANCE">Tài chính & Dòng tiền</option>
                <option value="WAREHOUSE">Kho hàng & Tự động hóa</option>
                <option value="SYSTEM">Cấu hình hệ thống</option>
                <option value="WEBHOOK">Giao dịch SePay</option>
              </select>

              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PROCESSED">Thành công</option>
                <option value="ERROR">Lỗi hệ thống</option>
              </select>
            </div>

            <div className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Hiển thị trang <span className="font-semibold text-slate-900 dark:text-white">{page}</span> / <span className="font-semibold text-slate-900 dark:text-white">{totalPages}</span>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Thời gian</th>
                    <th className="py-3.5 px-4">Phân hệ</th>
                    <th className="py-3.5 px-4">Hành động nghiệp vụ (Tiếng Việt)</th>
                    <th className="py-3.5 px-4">Nội dung tóm tắt (1 trường / Diff)</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" /> Đang tải dữ liệu nhật ký...
                        </div>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        Không có bản ghi nhật ký nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-slate-400" />
                            {new Date(log.created_at).toLocaleString("vi-VN")}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {log.aggregate_type_vi || log.aggregate_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                          {log.event_name_vi || log.event_name}
                          <span className="block text-xs font-normal text-slate-400 font-mono mt-0.5">{log.event_name}</span>
                        </td>
                        <td className="py-3 px-4">
                          {renderContentSummary(log)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {log.status === "PROCESSED" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Thành công
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60" title={log.error_message || ""}>
                              <AlertTriangle className="w-3.5 h-3.5" /> Lỗi
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Xem Payload
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Trang trước
              </button>
              
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Trang <strong className="text-slate-900 dark:text-white">{page}</strong> / {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Trang sau <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: LOG CUSTOMIZATION SETTINGS (RECTANGULAR CARDS / TICKETS) */}
      {activeTab === "settings" && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" /> Tùy chỉnh trường hiển thị ngắn gọn cho từng loại sự kiện
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Chọn trường dữ liệu từ payload mà bạn muốn hiển thị ngắn gọn ra cột tóm tắt ở danh sách nhật ký hệ thống.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.entries(EVENT_CONFIG_META).map(([eventName, meta]: [string, any]) => {
              const currentField = fieldMappings[eventName] || meta.defaultField || "id_order";
              return (
                <div key={eventName} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-mono">
                        {eventName}
                      </span>
                      <span className="text-xs text-slate-400">{meta.module}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{meta.label}</h3>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                      Chọn trường / kiểu hiển thị trong bảng:
                    </label>
                    <select
                      value={currentField}
                      onChange={(e) => saveFieldMapping(eventName, e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                    >
                      {meta.availableFields.map((f: { key: string; label: string }) => (
                        <option key={f.key} value={f.key}>
                          {f.label} ({f.key})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between">
                    <span>Đang chọn: <strong className="text-indigo-600 dark:text-indigo-400">{currentField}</strong></span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {selectedLog.aggregate_type_vi}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedLog.event_name_vi}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-lg bg-slate-200/60 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-xs">Mã đối tượng (Aggregate ID):</span>
                  <strong className="text-slate-900 dark:text-white font-mono">{selectedLog.aggregate_id || "—"}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-xs">Thời điểm thực hiện:</span>
                  <strong className="text-slate-900 dark:text-white">{new Date(selectedLog.created_at).toLocaleString("vi-VN")}</strong>
                </div>
              </div>

              {selectedLog.error_message && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm">
                  <strong>Chi tiết lỗi:</strong> {selectedLog.error_message}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Dữ liệu thao tác chi tiết (JSON Payload):
                </label>
                <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto shadow-inner">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
