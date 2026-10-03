import React, { useState, useMemo } from "react";
import {
  Search,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronUp,
  Download,
  Key,
  Package,
  Layers,
  AlertTriangle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Pencil,
  Trash2,
  X,
  Filter,
  ShieldCheck,
  Mail,
  Calendar,
  Sparkles,
  ExternalLink,
  Info,
  Archive,
} from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";

export interface WarehouseServiceSlot {
  id: number;
  display_name: string;
  category: string;
  password?: string;
  backup_email?: string;
  two_fa?: string;
  expires_at?: string;
  note?: string;
  status: "AVAILABLE" | "IN_USE" | "EXPIRED" | "RESERVED";
}

export interface WarehouseAccountItem {
  id: number;
  account: string;
  created_at: string;
  updated_at: string;
  services: WarehouseServiceSlot[];
}

export interface ServiceNameCategoryItem {
  id: number;
  name: string;
  category: string;
  inStockSlots: number;
  reservedSlots: number;
  status: "ACTIVE" | "LOW_STOCK" | "OUT_OF_STOCK";
}

const SAMPLE_WAREHOUSE_ACCOUNTS: WarehouseAccountItem[] = [
  {
    id: 101,
    account: "adobe_master_team01@mavrykstore.com",
    created_at: "10/09/2026",
    updated_at: "28/09/2026",
    services: [
      {
        id: 1,
        display_name: "Adobe All Apps 12M Slot 01",
        category: "Thiết Kế Đồ Họa",
        password: "AdobePass2026!#",
        backup_email: "backup_adobe01@gmail.com",
        two_fa: "JBSWY3DPEHPK3PXP",
        expires_at: "15/10/2027",
        note: "Đã cấp cho khách MAV1029",
        status: "IN_USE",
      },
      {
        id: 2,
        display_name: "Adobe All Apps 12M Slot 02",
        category: "Thiết Kế Đồ Họa",
        password: "AdobePass2026!#",
        backup_email: "backup_adobe01@gmail.com",
        two_fa: "JBSWY3DPEHPK3PXP",
        expires_at: "15/10/2027",
        note: "Slot sẵn sàng giao khách lẻ",
        status: "AVAILABLE",
      },
      {
        id: 3,
        display_name: "Adobe All Apps 12M Slot 03",
        category: "Thiết Kế Đồ Họa",
        password: "AdobePass2026!#",
        backup_email: "backup_adobe01@gmail.com",
        two_fa: "JBSWY3DPEHPK3PXP",
        expires_at: "15/10/2027",
        note: "Slot sẵn sàng giao khách lẻ",
        status: "AVAILABLE",
      },
      {
        id: 4,
        display_name: "Adobe All Apps 12M Slot 04",
        category: "Thiết Kế Đồ Họa",
        password: "AdobePass2026!#",
        backup_email: "backup_adobe01@gmail.com",
        two_fa: "JBSWY3DPEHPK3PXP",
        expires_at: "15/10/2027",
        note: "Đã giữ chỗ đơn MAV9921",
        status: "RESERVED",
      },
    ],
  },
  {
    id: 102,
    account: "canva_team_pro_pro02@mavrykstore.com",
    created_at: "12/08/2026",
    updated_at: "27/09/2026",
    services: [
      {
        id: 5,
        display_name: "Canva Pro Team Slot 01",
        category: "Thiết Kế Đồ Họa",
        password: "CanvaSecret998$",
        backup_email: "mavryk_canva_backup@gmail.com",
        two_fa: "HXDM54321QWERTY",
        expires_at: "20/12/2026",
        note: "Slot tài khoản Edu PRO",
        status: "AVAILABLE",
      },
      {
        id: 6,
        display_name: "Canva Pro Team Slot 02",
        category: "Thiết Kế Đồ Họa",
        password: "CanvaSecret998$",
        backup_email: "mavryk_canva_backup@gmail.com",
        two_fa: "HXDM54321QWERTY",
        expires_at: "20/12/2026",
        note: "Slot tài khoản Edu PRO",
        status: "AVAILABLE",
      },
    ],
  },
  {
    id: 103,
    account: "netflix_premium_4k_family01@gmail.com",
    created_at: "01/09/2026",
    updated_at: "25/09/2026",
    services: [
      {
        id: 7,
        display_name: "Netflix Premium 4K - Slot #1 (PIN: 1234)",
        category: "Giải Trí & Phim",
        password: "NetFlixPass888@",
        backup_email: "netflix_recov@gmail.com",
        two_fa: "NFX2FA99881122",
        expires_at: "01/10/2026",
        note: "Sắp hết hạn 3 ngày tới!",
        status: "EXPIRED",
      },
      {
        id: 8,
        display_name: "Netflix Premium 4K - Slot #2 (PIN: 5678)",
        category: "Giải Trí & Phim",
        password: "NetFlixPass888@",
        backup_email: "netflix_recov@gmail.com",
        two_fa: "NFX2FA99881122",
        expires_at: "15/11/2026",
        note: "Đã gán đơn MAV8812",
        status: "IN_USE",
      },
    ],
  },
  {
    id: 104,
    account: "chatgpt_plus_shared_v04@mavrykstore.com",
    created_at: "18/09/2026",
    updated_at: "28/09/2026",
    services: [
      {
        id: 9,
        display_name: "ChatGPT Plus Shared - Slot 1",
        category: "Trí Tuệ Nhân Tạo AI",
        password: "OpenAiPassword2026",
        backup_email: "openai_backup04@gmail.com",
        two_fa: "AIKEY887766554433",
        expires_at: "18/10/2026",
        note: "Tài khoản OpenAI Plus chính chủ",
        status: "AVAILABLE",
      },
    ],
  },
  {
    id: 105,
    account: "spotify_family_us05@mavrykstore.com",
    created_at: "05/07/2026",
    updated_at: "20/09/2026",
    services: [
      {
        id: 10,
        display_name: "Spotify Premium Family Slot 01",
        category: "Âm Nhạc",
        password: "SpotifyPass999",
        backup_email: "spot_backup@gmail.com",
        two_fa: "SPOT2FA77665544",
        expires_at: "05/07/2027",
        note: "Nâng cấp qua invite link",
        status: "AVAILABLE",
      },
    ],
  },
];

const SAMPLE_SERVICE_CATALOG: ServiceNameCategoryItem[] = [
  { id: 1, name: "Adobe All Apps Slot", category: "Thiết Kế Đồ Họa", inStockSlots: 45, reservedSlots: 2, status: "ACTIVE" },
  { id: 2, name: "Canva Pro Team Slot", category: "Thiết Kế Đồ Họa", inStockSlots: 120, reservedSlots: 5, status: "ACTIVE" },
  { id: 3, name: "Netflix Premium 4K Slot", category: "Giải Trí & Phim", inStockSlots: 8, reservedSlots: 4, status: "LOW_STOCK" },
  { id: 4, name: "ChatGPT Plus Shared Slot", category: "Trí Tuệ Nhân Tạo AI", inStockSlots: 15, reservedSlots: 1, status: "ACTIVE" },
  { id: 5, name: "Spotify Premium Family Slot", category: "Âm Nhạc", inStockSlots: 30, reservedSlots: 0, status: "ACTIVE" },
  { id: 6, name: "Office 365 E5 License Key", category: "Văn Phòng & Phần Mềm", inStockSlots: 0, reservedSlots: 0, status: "OUT_OF_STOCK" },
];

export const WarehousePage: React.FC = () => {
  const notification = useNotification();

  const [activeTab, setActiveTab] = useState<"accounts" | "catalog">("accounts");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedAccountIds, setExpandedAccountIds] = useState<number[]>([101, 102]);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<number, boolean>>({});
  const [copiedKeyMap, setCopiedKeyMap] = useState<Record<string, boolean>>({});

  // Modals
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);

  // Form states
  const [accountForm, setAccountForm] = useState({
    account: "",
    serviceName: "Adobe All Apps 12M Slot",
    category: "Thiết Kế Đồ Họa",
    password: "",
    backupEmail: "",
    twoFa: "",
    expiresAt: "",
    note: "",
  });

  const [catalogForm, setCatalogForm] = useState({
    name: "",
    category: "Thiết Kế Đồ Họa",
  });

  const toggleExpand = (id: number) => {
    setExpandedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleShowPassword = (serviceId: number) => {
    setShowPasswordMap((prev) => ({ ...prev, [serviceId]: !prev[serviceId] }));
  };

  const copyToClipboard = (text: string, label: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyMap((prev) => ({ ...prev, [keyId]: true }));
    notification.success(`Đã sao chép ${label} vào bộ nhớ tạm!`, "Sao chép thành công");
    setTimeout(() => {
      setCopiedKeyMap((prev) => ({ ...prev, [keyId]: false }));
    }, 2000);
  };

  // Filtered accounts
  const filteredAccounts = useMemo(() => {
    return SAMPLE_WAREHOUSE_ACCOUNTS.filter((acc) => {
      const matchSearch =
        searchTerm === "" ||
        acc.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.services.some(
          (s) =>
            s.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.note && s.note.toLowerCase().includes(searchTerm.toLowerCase()))
        );

      const matchCategory =
        categoryFilter === "all" ||
        acc.services.some((s) => s.category === categoryFilter);

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "AVAILABLE" && acc.services.some((s) => s.status === "AVAILABLE")) ||
        (statusFilter === "EXPIRED" && acc.services.some((s) => s.status === "EXPIRED")) ||
        (statusFilter === "RESERVED" && acc.services.some((s) => s.status === "RESERVED"));

      return matchSearch && matchCategory && matchStatus;
    });
  }, [searchTerm, categoryFilter, statusFilter]);

  // Statistics calculation
  const totalAccounts = SAMPLE_WAREHOUSE_ACCOUNTS.length;
  const totalAvailableSlots = SAMPLE_WAREHOUSE_ACCOUNTS.reduce(
    (acc, item) => acc + item.services.filter((s) => s.status === "AVAILABLE").length,
    0
  );
  const totalReservedSlots = SAMPLE_WAREHOUSE_ACCOUNTS.reduce(
    (acc, item) => acc + item.services.filter((s) => s.status === "IN_USE" || s.status === "RESERVED").length,
    0
  );
  const totalExpiredSlots = SAMPLE_WAREHOUSE_ACCOUNTS.reduce(
    (acc, item) => acc + item.services.filter((s) => s.status === "EXPIRED").length,
    0
  );

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1650px] mx-auto">
      {/* PAGE HEADER BANNER (Standardized flex-col sm:flex-row) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-cyan-400 uppercase mb-1">
            <span>NGUỒN HÀNG & KHO</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-normal">
              Hệ thống V2 Active
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Kho Hàng & Tồn Kho Key
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Theo dõi chi tiết tài khoản kho, slot bản quyền, chìa khóa 2FA và cảnh báo tự động
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <button
            onClick={() => notification.info("Đã làm mới dữ liệu danh mục kho!", "Làm mới kho")}
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-slate-600 text-slate-300 text-xs sm:text-sm font-medium transition-all hover:bg-slate-800 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            onClick={() => notification.success("Đã xuất file kho hàng ra Excel!", "Xuất dữ liệu")}
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-slate-600 text-slate-300 text-xs sm:text-sm font-medium transition-all hover:bg-slate-800 flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>

          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Mới Kho</span>
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS (Standardized Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 shadow-xl backdrop-blur-xl group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">TỔNG TÀI KHOẢN KHO</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Archive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-white tracking-tight">{totalAccounts}</span>
            <span className="text-xs text-slate-400">Tài khoản</span>
          </div>
          <div className="mt-2 text-xs text-emerald-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>+4 tài khoản thêm tuần này</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 shadow-xl backdrop-blur-xl group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">SLOTS SẴN HÀNG</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-emerald-400 tracking-tight">{totalAvailableSlots}</span>
            <span className="text-xs text-slate-400">Slots</span>
          </div>
          <div className="mt-2 text-xs text-emerald-400/80 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sẵn sàng giao cho khách</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 shadow-xl backdrop-blur-xl group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">ĐÃ GIỮ CHỖ / ĐÃ BÁN</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              <Key className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-indigo-400 tracking-tight">{totalReservedSlots}</span>
            <span className="text-xs text-slate-400">Slots</span>
          </div>
          <div className="mt-2 text-xs text-indigo-300/80 font-medium flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            <span>Đang gắn vào đơn mua</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="relative overflow-hidden rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 sm:p-5 shadow-xl backdrop-blur-xl group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">CẢNH BÁO HẾT HẠN</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold text-amber-400 tracking-tight">{totalExpiredSlots}</span>
            <span className="text-xs text-slate-400">Cần xử lý</span>
          </div>
          <div className="mt-2 text-xs text-amber-300/80 font-medium flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Cần gia hạn / thay thế key</span>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-px">
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
          <button
            onClick={() => setActiveTab("accounts")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "accounts"
                ? "bg-slate-800/90 text-white shadow-md border border-slate-700/60"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <Archive className="w-4 h-4 text-blue-400" />
            <span>Tài Khoản Kho & Slot Key</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-300 font-medium">
              {filteredAccounts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("catalog")}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "catalog"
                ? "bg-slate-800/90 text-white shadow-md border border-slate-700/60"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Danh Mục Tên Dịch Vụ</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 font-medium">
              {SAMPLE_SERVICE_CATALOG.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: TÀI KHOẢN KHO & SLOT KEY */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          {/* SEARCH & FILTER TOOLBAR */}
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo email, tên sản phẩm, ghi chú..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Danh mục:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">Tất cả</option>
                  <option value="Thiết Kế Đồ Họa" className="bg-slate-900 text-slate-200">Thiết Kế Đồ Họa</option>
                  <option value="Giải Trí & Phim" className="bg-slate-900 text-slate-200">Giải Trí & Phim</option>
                  <option value="Trí Tuệ Nhân Tạo AI" className="bg-slate-900 text-slate-200">Trí Tuệ Nhân Tạo AI</option>
                  <option value="Âm Nhạc" className="bg-slate-900 text-slate-200">Âm Nhạc</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-300">
                <span>Trạng thái:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">Tất cả</option>
                  <option value="AVAILABLE" className="bg-slate-900 text-slate-200">Có Slot Sẵn</option>
                  <option value="RESERVED" className="bg-slate-900 text-slate-200">Đã Giữ Chỗ</option>
                  <option value="EXPIRED" className="bg-slate-900 text-slate-200">Hết Hạn</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl overflow-hidden shadow-xl">
            {/* 1. Desktop & Tablet View (Hidden on mobile < 640px) */}
            <div className="hidden sm:block overflow-x-auto custom-scrollbar flex-1 w-full">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-4 w-10"></th>
                    <th className="py-3.5 px-4">TÀI KHOẢN KHO</th>
                    <th className="py-3.5 px-4">DANH MỤC SẢN PHẨM</th>
                    <th className="py-3.5 px-4 text-center">SLOTS SẴN HÀNG</th>
                    <th className="py-3.5 px-4">NGÀY TẠO / CẬP NHẬT</th>
                    <th className="py-3.5 px-4 text-right">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredAccounts.map((account) => {
                    const isExpanded = expandedAccountIds.includes(account.id);
                    const availableCount = account.services.filter((s) => s.status === "AVAILABLE").length;
                    const totalSlots = account.services.length;

                    return (
                      <React.Fragment key={account.id}>
                        {/* MAIN PARENT ROW */}
                        <tr
                          onClick={() => toggleExpand(account.id)}
                          className={`group transition-colors cursor-pointer ${
                            isExpanded ? "bg-slate-800/40" : "hover:bg-slate-800/20"
                          }`}
                        >
                          <td className="py-4 px-4 text-center">
                            <button className="text-slate-400 group-hover:text-white transition-colors">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-blue-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-semibold text-xs shrink-0">
                                @
                              </div>
                              <div>
                                <div className="font-semibold text-white group-hover:text-blue-300 transition-colors flex items-center gap-2">
                                  <span>{account.account}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyToClipboard(account.account, "Email tài khoản", `acc_${account.id}`);
                                    }}
                                    className="text-slate-400 hover:text-white transition-colors"
                                  >
                                    {copiedKeyMap[`acc_${account.id}`] ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  ID Kho: #{account.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1.5">
                              {Array.from(new Set(account.services.map((s) => s.category))).map((cat, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700/60"
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                availableCount > 0
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : "bg-red-500/15 text-red-400 border border-red-500/30"
                              }`}
                            >
                              {availableCount} / {totalSlots} Slots Sẵn
                            </span>
                          </td>

                          <td className="py-4 px-4 text-xs text-slate-400">
                            <div>Tạo: {account.created_at}</div>
                            <div className="text-slate-500 mt-0.5">Sửa: {account.updated_at}</div>
                          </td>

                          <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => notification.info(`Chỉnh sửa tài khoản kho ${account.account}`)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                                title="Sửa tài khoản"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  notification.confirm({
                                    title: "Xóa tài khoản kho?",
                                    message: `Bạn có chắc muốn xóa tài khoản ${account.account}? các slot bên trong sẽ bị gỡ bỏ!`,
                                    onConfirm: () => notification.success("Đã xóa tài khoản kho"),
                                  })
                                }
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                                title="Xóa tài khoản"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDED SUB-TABLE OF SLOTS */}
                        {isExpanded && (
                          <tr className="bg-slate-950/60">
                            <td colSpan={6} className="p-4 border-t border-b border-slate-800/80">
                              <div className="pl-6 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                                    <Key className="w-3.5 h-3.5" />
                                    <span>Danh Sách Slot Bản Quyền Tồn Kho</span>
                                  </h4>
                                  <button
                                    onClick={() => notification.info("Thêm slot mới cho tài khoản")}
                                    className="text-xs text-blue-400 hover:underline font-semibold flex items-center gap-1"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Thêm Slot Mới</span>
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {account.services.map((slot) => {
                                    const isPassShown = showPasswordMap[slot.id] || false;

                                    return (
                                      <div
                                        key={slot.id}
                                        className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 transition-all space-y-2.5 shadow-md"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div>
                                            <span className="font-semibold text-white text-sm block">
                                              {slot.display_name}
                                            </span>
                                            <span className="text-xs text-slate-400 font-mono">
                                              Danh mục: {slot.category}
                                            </span>
                                          </div>

                                          <span
                                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                              slot.status === "AVAILABLE"
                                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                                : slot.status === "IN_USE"
                                                ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                                : slot.status === "RESERVED"
                                                ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                                                : "bg-red-500/15 text-red-400 border border-red-500/30"
                                            }`}
                                          >
                                            {slot.status === "AVAILABLE"
                                              ? "Sẵn hàng"
                                              : slot.status === "IN_USE"
                                              ? "Đã giao"
                                              : slot.status === "RESERVED"
                                              ? "Giữ chỗ"
                                              : "Hết hạn"}
                                          </span>
                                        </div>

                                        {/* CREDENTIALS BLOCK */}
                                        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs">
                                          {slot.password && (
                                            <div className="flex items-center justify-between">
                                              <span className="text-slate-400 flex items-center gap-1.5">
                                                <Mail className="w-3.5 h-3.5 text-slate-500" />
                                                Mật khẩu:
                                              </span>
                                              <div className="flex items-center gap-2 font-mono">
                                                <span>
                                                  {isPassShown ? slot.password : "••••••••••••"}
                                                </span>
                                                <button
                                                  onClick={() => toggleShowPassword(slot.id)}
                                                  className="text-slate-400 hover:text-slate-200"
                                                >
                                                  {isPassShown ? (
                                                    <EyeOff className="w-3.5 h-3.5" />
                                                  ) : (
                                                    <Eye className="w-3.5 h-3.5" />
                                                  )}
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    copyToClipboard(slot.password!, "Mật khẩu", `pass_${slot.id}`)
                                                  }
                                                  className="text-slate-400 hover:text-white"
                                                >
                                                  {copiedKeyMap[`pass_${slot.id}`] ? (
                                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                  ) : (
                                                    <Copy className="w-3.5 h-3.5" />
                                                  )}
                                                </button>
                                              </div>
                                            </div>
                                          )}

                                          {slot.two_fa && (
                                            <div className="flex items-center justify-between">
                                              <span className="text-slate-400 flex items-center gap-1.5">
                                                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                                                Mã 2FA Secret:
                                              </span>
                                              <div className="flex items-center gap-2 font-mono text-amber-300">
                                                <span>{slot.two_fa}</span>
                                                <button
                                                  onClick={() =>
                                                    copyToClipboard(slot.two_fa!, "Mã 2FA", `2fa_${slot.id}`)
                                                  }
                                                  className="text-slate-400 hover:text-white"
                                                >
                                                  {copiedKeyMap[`2fa_${slot.id}`] ? (
                                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                  ) : (
                                                    <Copy className="w-3.5 h-3.5" />
                                                  )}
                                                </button>
                                              </div>
                                            </div>
                                          )}

                                          {slot.expires_at && (
                                            <div className="flex items-center justify-between">
                                              <span className="text-slate-400 flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                                Hạn sử dụng:
                                              </span>
                                              <span className="font-medium text-slate-200">
                                                {slot.expires_at}
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        {slot.note && (
                                          <div className="text-xs text-slate-400 italic">
                                            Ghi chú: {slot.note}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 2. Mobile Card List View (Visible ONLY on mobile screens < 640px) */}
            <div className="block sm:hidden divide-y divide-slate-800/80 p-3 space-y-3">
              {filteredAccounts.map((account) => {
                const availableCount = account.services.filter((s) => s.status === "AVAILABLE").length;
                const totalSlots = account.services.length;

                return (
                  <div
                    key={account.id}
                    className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3 shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                      <div className="font-bold text-white text-xs flex items-center gap-1.5">
                        <span className="text-blue-400">@</span>
                        <span className="truncate max-w-[200px]">{account.account}</span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          availableCount > 0
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-500/15 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {availableCount}/{totalSlots} Slots
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {account.services.map((slot) => (
                        <div key={slot.id} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">{slot.display_name}</span>
                            <span className="text-[10px] text-emerald-400 font-mono">{slot.status}</span>
                          </div>
                          {slot.password && (
                            <div className="text-slate-400 font-mono text-[11px] flex items-center justify-between">
                              <span>Pass: {slot.password}</span>
                              <button
                                onClick={() => copyToClipboard(slot.password!, "Mật khẩu", `mob_pass_${slot.id}`)}
                                className="text-slate-400 hover:text-white"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                      <button
                        onClick={() => notification.info(`Sửa tài khoản ${account.account}`)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 font-medium"
                      >
                        Sửa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DANH MỤC TÊN DỊCH VỤ */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl">
            <div>
              <h3 className="text-base font-bold text-white">Danh Mục Tên Dịch Vụ Kho</h3>
              <p className="text-xs text-slate-400">
                Khai báo danh mục tên gói dịch vụ để phân loại và cảnh báo tồn kho tự động
              </p>
            </div>
            <button
              onClick={() => setIsCatalogModalOpen(true)}
              className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Dịch Vụ Mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SAMPLE_SERVICE_CATALOG.map((cat) => (
              <div
                key={cat.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 backdrop-blur-xl transition-all shadow-xl space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-white text-sm sm:text-base">{cat.name}</h4>
                    <span className="text-xs text-slate-400 font-medium">{cat.category}</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                      cat.status === "ACTIVE"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : cat.status === "LOW_STOCK"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : "bg-red-500/15 text-red-400 border border-red-500/30"
                    }`}
                  >
                    {cat.status === "ACTIVE"
                      ? "Sẵn hàng"
                      : cat.status === "LOW_STOCK"
                      ? "Sắp hết hàng"
                      : "Hết hàng"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950/60">
                    <span className="text-slate-400 block text-[11px]">TỒN KHO SLOT</span>
                    <span className="text-sm sm:text-base font-bold text-emerald-400">{cat.inStockSlots} Slots</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/60">
                    <span className="text-slate-400 block text-[11px]">ĐÃ GIỮ CHỖ</span>
                    <span className="text-sm sm:text-base font-bold text-indigo-400">{cat.reservedSlots} Slots</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => notification.info(`Chỉnh sửa dịch vụ ${cat.name}`)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                  >
                    Sửa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: TẠO MỚI TÀI KHOẢN KHO */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Archive className="w-5 h-5 text-blue-400" />
                <span>Thêm Tài Khoản Kho Mới</span>
              </h3>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Tài Khoản Kho (*)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: adobe_team01@mavrykstore.com"
                  value={accountForm.account}
                  onChange={(e) => setAccountForm({ ...accountForm, account: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Loại Dịch Vụ (*)</label>
                <select
                  value={accountForm.serviceName}
                  onChange={(e) => setAccountForm({ ...accountForm, serviceName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="Adobe All Apps 12M Slot">Adobe All Apps 12M Slot</option>
                  <option value="Canva Pro Team Slot">Canva Pro Team Slot</option>
                  <option value="Netflix Premium 4K Slot">Netflix Premium 4K Slot</option>
                  <option value="ChatGPT Plus Shared Slot">ChatGPT Plus Shared Slot</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Mật khẩu</label>
                  <input
                    type="text"
                    placeholder="Nhập mật khẩu..."
                    value={accountForm.password}
                    onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Mã 2FA Secret Key</label>
                  <input
                    type="text"
                    placeholder="Mã 2FA (nếu có)..."
                    value={accountForm.twoFa}
                    onChange={(e) => setAccountForm({ ...accountForm, twoFa: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email Backup</label>
                  <input
                    type="text"
                    placeholder="Email khôi phục..."
                    value={accountForm.backupEmail}
                    onChange={(e) => setAccountForm({ ...accountForm, backupEmail: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Ngày Hết Hạn</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 30/12/2027"
                    value={accountForm.expiresAt}
                    onChange={(e) => setAccountForm({ ...accountForm, expiresAt: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={() => {
                  notification.success("Đã tạo mới tài khoản kho thành công!", "Tạo tài khoản");
                  setIsAccountModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all"
              >
                Lưu Tài Khoản
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: THÊM TÊN DỊCH VỤ MỚI */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <span>Thêm Dịch Vụ Mới</span>
              </h3>
              <button
                onClick={() => setIsCatalogModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tên Dịch Vụ / Gói (*)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Office 365 E5 License"
                  value={catalogForm.name}
                  onChange={(e) => setCatalogForm({ ...catalogForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Chuyên Mục (*)</label>
                <select
                  value={catalogForm.category}
                  onChange={(e) => setCatalogForm({ ...catalogForm, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="Thiết Kế Đồ Họa">Thiết Kế Đồ Họa</option>
                  <option value="Giải Trí & Phim">Giải Trí & Phim</option>
                  <option value="Trí Tuệ Nhân Tạo AI">Trí Tuệ Nhân Tạo AI</option>
                  <option value="Âm Nhạc">Âm Nhạc</option>
                  <option value="Văn Phòng & Phần Mềm">Văn Phòng & Phần Mềm</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsCatalogModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                onClick={() => {
                  notification.success("Đã thêm dịch vụ vào danh mục thành công!", "Tạo dịch vụ");
                  setIsCatalogModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25 transition-all"
              >
                Thêm Dịch Vụ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehousePage;
