import React, { useState, useMemo } from "react";
import {
  RefreshCw,
  Plus,
  Download,
  Key,
  Package,
  Layers,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Info,
  Archive,
} from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";
import {
  WarehouseAccountItem,
  ServiceNameCategoryItem,
  WarehouseAccountFormData,
  CatalogFormData,
  WarehouseFilterBar,
  WarehouseAccountsTable,
  WarehouseCatalogGrid,
  WarehouseCreateModal,
  CatalogCreateModal,
} from "@/features/warehouse";

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
  const [accountForm, setAccountForm] = useState<WarehouseAccountFormData>({
    account: "",
    serviceName: "Adobe All Apps 12M Slot",
    category: "Thiết Kế Đồ Họa",
    password: "",
    backupEmail: "",
    twoFa: "",
    expiresAt: "",
    note: "",
  });

  const [catalogForm, setCatalogForm] = useState<CatalogFormData>({
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
      {/* PAGE HEADER BANNER */}
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
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-slate-600 text-slate-300 text-xs sm:text-sm font-medium transition-all hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            onClick={() => notification.success("Đã xuất file kho hàng ra Excel!", "Xuất dữ liệu")}
            className="p-2 sm:px-3.5 sm:py-2 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:border-slate-600 text-slate-300 text-xs sm:text-sm font-medium transition-all hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>

          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Mới Kho</span>
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
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

      {/* FILTER & TABS TOOLBAR */}
      <WarehouseFilterBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        accountCount={filteredAccounts.length}
        catalogCount={SAMPLE_SERVICE_CATALOG.length}
      />

      {/* TAB 1: ACCOUNTS TABLE */}
      {activeTab === "accounts" && (
        <WarehouseAccountsTable
          accounts={filteredAccounts}
          expandedAccountIds={expandedAccountIds}
          showPasswordMap={showPasswordMap}
          copiedKeyMap={copiedKeyMap}
          onToggleExpand={toggleExpand}
          onToggleShowPassword={toggleShowPassword}
          onCopy={copyToClipboard}
          onEditAccount={(acc) => notification.info(`Chỉnh sửa tài khoản kho ${acc.account}`)}
          onDeleteAccount={(acc) =>
            notification.confirm({
              title: "Xóa tài khoản kho?",
              message: `Bạn có chắc muốn xóa tài khoản ${acc.account}? các slot bên trong sẽ bị gỡ bỏ!`,
              onConfirm: () => notification.success("Đã xóa tài khoản kho"),
            })
          }
          onAddSlot={(acc) => notification.info(`Thêm slot mới cho tài khoản ${acc.account}`)}
        />
      )}

      {/* TAB 2: CATALOG GRID */}
      {activeTab === "catalog" && (
        <WarehouseCatalogGrid
          catalogItems={SAMPLE_SERVICE_CATALOG}
          onOpenCreateCatalog={() => setIsCatalogModalOpen(true)}
          onEditCatalog={(cat) => notification.info(`Chỉnh sửa dịch vụ ${cat.name}`)}
        />
      )}

      {/* MODAL CREATE ACCOUNT */}
      <WarehouseCreateModal
        open={isAccountModalOpen}
        formData={accountForm}
        onClose={() => setIsAccountModalOpen(false)}
        onFormChange={setAccountForm}
        onSubmit={() => {
          notification.success("Đã tạo mới tài khoản kho thành công!", "Tạo tài khoản");
          setIsAccountModalOpen(false);
        }}
      />

      {/* MODAL CREATE CATALOG */}
      <CatalogCreateModal
        open={isCatalogModalOpen}
        formData={catalogForm}
        onClose={() => setIsCatalogModalOpen(false)}
        onFormChange={setCatalogForm}
        onSubmit={() => {
          notification.success("Đã thêm dịch vụ vào danh mục thành công!", "Tạo dịch vụ");
          setIsCatalogModalOpen(false);
        }}
      />
    </div>
  );
};

export default WarehousePage;
