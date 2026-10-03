import React, { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Wallet,
  Plus,
  Search,
  Copy,
  Check,
  Building2,
  DollarSign,
  ArrowUpRight,
  Edit2,
  Trash2,
  Star,
  RefreshCw,
  Loader2,
  XCircle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";

export type PaymentTabKey = "bank" | "usdt";

export interface BankAccountItem {
  id: number;
  label?: string | null;
  accountNumber: string;
  accountHolder: string;
  bankDisplayName?: string | null;
  bankBin?: string | null;
  bankShortCode?: string | null;
  qrNotePrefix?: string | null;
  isDefault: boolean;
  isActive: boolean;
  totalReceived: number;
  totalWithdrawn: number;
  balanceRemaining: number;
}

export interface UsdtWalletItem {
  id: number;
  label?: string | null;
  walletAddress: string;
  network: string;
  isDefault: boolean;
  isActive: boolean;
  totalReceived: number;
  totalWithdrawn: number;
  balanceRemaining: number;
}

const formatVND = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount || 0);

const formatUSDT = (amount: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount || 0) + " USDT";

export const PaymentWalletsPage: React.FC = () => {
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState<PaymentTabKey>("bank");
  const [search, setSearch] = useState("");

  // Data states
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [usdtWallets, setUsdtWallets] = useState<UsdtWalletItem[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(25450);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<BankAccountItem | UsdtWalletItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Withdraw modal state
  const [withdrawModalOpen, setWithdrawModalOpen] = useState<boolean>(false);
  const [withdrawTarget, setWithdrawTarget] = useState<{ id: number; type: "bank" | "usdt"; title: string } | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawNote, setWithdrawNote] = useState<string>("");

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; type: "bank" | "usdt"; title: string } | null>(null);

  // Form states for Add/Edit
  const [formData, setFormData] = useState({
    accountNumber: "",
    accountHolder: "",
    bankDisplayName: "",
    bankShortCode: "",
    bankBin: "",
    qrNotePrefix: "",
    label: "",
    walletAddress: "",
    network: "TRC20",
    isDefault: false,
    isActive: true,
  });

  const fetchBankAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/wallets/shop-bank-accounts");
      if (!res.ok) throw new Error("Không thể tải tài khoản ngân hàng.");
      const data = await res.json();
      setBankAccounts(data.items || []);
    } catch (err) {
      console.error(err);
      notify.error("Không thể tải danh sách tài khoản ngân hàng.", "Lỗi Máy Chủ");
    }
  }, [notify]);

  const fetchUsdtWallets = useCallback(async () => {
    try {
      const res = await fetch("/api/wallets/usdt-wallets");
      if (!res.ok) throw new Error("Không thể tải danh sách ví USDT.");
      const data = await res.json();
      setUsdtWallets(data.items || []);
    } catch (err) {
      console.error(err);
      notify.error("Không thể tải danh sách ví USDT.", "Lỗi Máy Chủ");
    }
  }, [notify]);

  const fetchExchangeRate = useCallback(async () => {
    try {
      const res = await fetch("/api/wallets/usdt-wallets/exchange-rate");
      if (res.ok) {
        const data = await res.json();
        if (data.vndPerUsdt) setExchangeRate(data.vndPerUsdt);
      }
    } catch (err) {
      console.error("Lỗi tải tỷ giá Binance:", err);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchBankAccounts(), fetchUsdtWallets(), fetchExchangeRate()]);
    setLoading(false);
  }, [fetchBankAccounts, fetchUsdtWallets, fetchExchangeRate]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    notify.success("Đã sao chép địa chỉ ví vào bộ nhớ tạm!", "Sao Chép Thành Công");
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  // Default toggle handlers
  const handleSetDefaultBank = async (id: number) => {
    try {
      const res = await fetch(`/api/wallets/shop-bank-accounts/${id}/set-default`, { method: "POST" });
      if (!res.ok) throw new Error();
      notify.success("Đã đặt tài khoản ngân hàng mặc định.", "Thành Công");
      fetchBankAccounts();
    } catch {
      notify.error("Không thể thay đổi tài khoản mặc định.", "Lỗi");
    }
  };

  const handleSetDefaultUsdt = async (id: number) => {
    try {
      const res = await fetch(`/api/wallets/usdt-wallets/${id}/set-default`, { method: "POST" });
      if (!res.ok) throw new Error();
      notify.success("Đã đặt ví USDT mặc định.", "Thành Công");
      fetchUsdtWallets();
    } catch {
      notify.error("Không thể thay đổi ví mặc định.", "Lỗi");
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      accountNumber: "",
      accountHolder: "",
      bankDisplayName: "MBBank",
      bankShortCode: "MB",
      bankBin: "970422",
      qrNotePrefix: "MAV",
      label: "",
      walletAddress: "",
      network: "TRC20",
      isDefault: false,
      isActive: true,
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item: BankAccountItem | UsdtWalletItem) => {
    setEditingItem(item);
    if (activeTab === "bank") {
      const bank = item as BankAccountItem;
      setFormData({
        accountNumber: bank.accountNumber || "",
        accountHolder: bank.accountHolder || "",
        bankDisplayName: bank.bankDisplayName || "",
        bankShortCode: bank.bankShortCode || "",
        bankBin: bank.bankBin || "",
        qrNotePrefix: bank.qrNotePrefix || "",
        label: bank.label || "",
        walletAddress: "",
        network: "TRC20",
        isDefault: bank.isDefault,
        isActive: bank.isActive,
      });
    } else {
      const usdt = item as UsdtWalletItem;
      setFormData({
        accountNumber: "",
        accountHolder: "",
        bankDisplayName: "",
        bankShortCode: "",
        bankBin: "",
        qrNotePrefix: "",
        label: usdt.label || "",
        walletAddress: usdt.walletAddress || "",
        network: usdt.network || "TRC20",
        isDefault: usdt.isDefault,
        isActive: usdt.isActive,
      });
    }
    setModalOpen(true);
  };

  // Submit Form (Create / Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (activeTab === "bank") {
        const url = editingItem
          ? `/api/wallets/shop-bank-accounts/${editingItem.id}`
          : "/api/wallets/shop-bank-accounts";
        const method = editingItem ? "PUT" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountNumber: formData.accountNumber,
            accountHolder: formData.accountHolder,
            bankDisplayName: formData.bankDisplayName,
            bankShortCode: formData.bankShortCode,
            bankBin: formData.bankBin,
            qrNotePrefix: formData.qrNotePrefix,
            label: formData.label,
            isDefault: formData.isDefault,
            isActive: formData.isActive,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Không thể lưu tài khoản ngân hàng.");
        }
        notify.success(editingItem ? "Đã cập nhật tài khoản ngân hàng." : "Đã thêm tài khoản ngân hàng mới.", "Thành Công");
        fetchBankAccounts();
      } else {
        const url = editingItem
          ? `/api/wallets/usdt-wallets/${editingItem.id}`
          : "/api/wallets/usdt-wallets";
        const method = editingItem ? "PUT" : "POST";
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: formData.walletAddress,
            network: formData.network,
            label: formData.label,
            isDefault: formData.isDefault,
            isActive: formData.isActive,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Không thể lưu ví USDT.");
        }
        notify.success(editingItem ? "Đã cập nhật ví USDT." : "Đã thêm ví USDT mới.", "Thành Công");
        fetchUsdtWallets();
      }
      setModalOpen(false);
    } catch (err: any) {
      notify.error(err.message || "Có lỗi xảy ra khi lưu dữ liệu.", "Lỗi Thao Tác");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Withdraw Submit
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawTarget) return;
    const amountNum = Number(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      notify.warning("Số tiền rút phải lớn hơn 0.", "Cảnh Báo");
      return;
    }
    setSubmitting(true);
    try {
      const endpoint =
        withdrawTarget.type === "bank"
          ? `/api/wallets/shop-bank-accounts/${withdrawTarget.id}/withdraw`
          : `/api/wallets/usdt-wallets/${withdrawTarget.id}/withdraw`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountNum, note: withdrawNote }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Không thể thực hiện ghi nhận rút tiền.");
      }
      notify.success("Đã ghi nhận lệnh rút tiền thành công.", "Thành Công");
      setWithdrawModalOpen(false);
      setWithdrawAmount("");
      setWithdrawNote("");
      if (withdrawTarget.type === "bank") fetchBankAccounts();
      else fetchUsdtWallets();
    } catch (err: any) {
      notify.error(err.message || "Có lỗi xảy ra.", "Lỗi Rút Tiền");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Submit
  const handleDeleteSubmit = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const endpoint =
        deleteTarget.type === "bank"
          ? `/api/wallets/shop-bank-accounts/${deleteTarget.id}`
          : `/api/wallets/usdt-wallets/${deleteTarget.id}`;
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Không thể xóa tài khoản.");
      }
      notify.success("Đã xóa tài khoản thành công.", "Thành Công");
      setDeleteTarget(null);
      if (deleteTarget.type === "bank") fetchBankAccounts();
      else fetchUsdtWallets();
    } catch (err: any) {
      notify.error(err.message || "Không thể xóa tài khoản.", "Lỗi Thao Tác");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered lists
  const filteredBanks = bankAccounts.filter(
    (b) =>
      b.accountNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.accountHolder.toLowerCase().includes(search.toLowerCase()) ||
      (b.bankDisplayName && b.bankDisplayName.toLowerCase().includes(search.toLowerCase())) ||
      (b.label && b.label.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredUsdt = usdtWallets.filter(
    (u) =>
      u.walletAddress.toLowerCase().includes(search.toLowerCase()) ||
      u.network.toLowerCase().includes(search.toLowerCase()) ||
      (u.label && u.label.toLowerCase().includes(search.toLowerCase()))
  );

  // Totals
  const totalBankBalance = bankAccounts.reduce((sum, item) => sum + (item.balanceRemaining || 0), 0);
  const totalUsdtBalance = usdtWallets.reduce((sum, item) => sum + (item.balanceRemaining || 0), 0);

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1650px] mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 text-cyan-400 rounded-xl border border-cyan-500/30 shadow-inner">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                Hệ Thống & Ví
              </span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Đang Hoạt Động
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide mt-1">
              Quản Lý Tài Khoản Thanh Toán & Ví USDT
            </h1>
            <p className="text-xs text-slate-400">
              Cấu hình tài khoản nhận chuyển khoản ngân hàng và địa chỉ ví USDT nhận tiền từ đơn hàng
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAllData}
            title="Làm mới dữ liệu"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{activeTab === "bank" ? "Thêm STK Mới" : "Thêm Ví USDT Mới"}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Tổng Số Dư Ngân Hàng</div>
            <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono mt-1">
              {formatVND(totalBankBalance)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{bankAccounts.length} tài khoản đang quản lý</div>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Tổng Số Dư Ví USDT</div>
            <div className="text-lg sm:text-xl font-bold text-purple-400 font-mono mt-1">
              {formatUSDT(totalUsdtBalance)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              ≈ {formatVND(totalUsdtBalance * exchangeRate)}
            </div>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Tỷ Giá Quy Đổi USDT / VND</div>
            <div className="text-lg sm:text-xl font-bold text-cyan-300 font-mono mt-1">
              {formatVND(exchangeRate)} / USDT
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Tỷ giá tham chiếu trực tuyến</div>
          </div>
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tab 1 Button */}
        <button
          onClick={() => setActiveTab("bank")}
          className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between ${
            activeTab === "bank"
              ? "bg-slate-900 border-cyan-500/50 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30"
              : "bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700/80"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl border ${activeTab === "bank" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-slate-800 text-slate-400 border-slate-700/50"}`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className={`text-sm font-bold ${activeTab === "bank" ? "text-cyan-300" : "text-slate-200"}`}>
                Tài Khoản Thanh Toán Ngân Hàng
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Chuyển khoản QR ngân hàng & Tự động Sepay ({bankAccounts.length} tài khoản)
              </div>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${activeTab === "bank" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "bg-slate-800 text-slate-400"}`}>
            {bankAccounts.length} TK
          </span>
        </button>

        {/* Tab 2 Button */}
        <button
          onClick={() => setActiveTab("usdt")}
          className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between ${
            activeTab === "usdt"
              ? "bg-slate-900 border-purple-500/50 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/30"
              : "bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700/80"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl border ${activeTab === "usdt" ? "bg-purple-500/20 text-purple-300 border-purple-500/40" : "bg-slate-800 text-slate-400 border-slate-700/50"}`}>
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className={`text-sm font-bold ${activeTab === "usdt" ? "text-purple-300" : "text-slate-200"}`}>
                Quản Lý Ví USDT Quốc Tế
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Địa chỉ ví Crypto TRC20 / BEP20 nhận tiền ({usdtWallets.length} ví)
              </div>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${activeTab === "usdt" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "bg-slate-800 text-slate-400"}`}>
            {usdtWallets.length} Ví
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={activeTab === "bank" ? "Tìm theo số tài khoản, chủ tài khoản, ngân hàng..." : "Tìm theo địa chỉ ví USDT, mạng lưới, nhãn..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        <div className="text-xs text-slate-400 font-medium whitespace-nowrap">
          Hiển thị: <span className="font-bold text-white">{activeTab === "bank" ? filteredBanks.length : filteredUsdt.length}</span> kết quả
        </div>
      </div>

      {/* Tab 1: Bank Payment Accounts Table */}
      {activeTab === "bank" && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="w-full">  {/* Desktop Bank Table */}  <div className="hidden sm:block overflow-x-auto custom-scrollbar flex-1 w-full">    <table className="w-full text-left border-collapse text-xs min-w-[850px]">      
              <thead>
                <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">STK / Chủ Tài Khoản</th>
                  <th className="py-3.5 px-4">Ngân Hàng</th>
                  <th className="py-3.5 px-4 text-right">Tổng Tiền CK</th>
                  <th className="py-3.5 px-4 text-right">Đã Rút</th>
                  <th className="py-3.5 px-4 text-right">Số Dư Còn Lại</th>
                  <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto mb-2" />
                      <span>Đang tải dữ liệu từ cơ sở dữ liệu...</span>
                    </td>
                  </tr>
                ) : filteredBanks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      Chưa có tài khoản ngân hàng nào. Bấm nút "Thêm STK Mới" để bắt đầu.
                    </td>
                  </tr>
                ) : (
                  filteredBanks.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-center text-slate-500 font-mono">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-cyan-300 text-sm">{item.accountNumber}</div>
                        <div className="text-slate-200 font-semibold mt-0.5">{item.accountHolder}</div>
                        {item.label && <div className="text-[11px] text-cyan-400/70 mt-0.5">{item.label}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="font-bold text-slate-200">{item.bankDisplayName || item.bankShortCode || "—"}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {item.bankShortCode ? `${item.bankShortCode} · ` : ""}BIN: {item.bankBin || "—"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-300 whitespace-nowrap">
                        {formatVND(item.totalReceived)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400/90 whitespace-nowrap">
                        {formatVND(item.totalWithdrawn)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 text-sm whitespace-nowrap">
                        {formatVND(item.balanceRemaining)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-row items-center justify-center gap-1.5 whitespace-nowrap">
                          {item.isDefault && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                              ★ Mặc định
                            </span>
                          )}
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${item.isActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-500 border border-slate-700"}`}>
                            {item.isActive ? "Đang bật" : "Tắt"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!item.isDefault && (
                            <button
                              onClick={() => handleSetDefaultBank(item.id)}
                              title="Đặt mặc định"
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-300 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setWithdrawTarget({ id: item.id, type: "bank", title: `${item.bankDisplayName || "STK"} - ${item.accountNumber}` });
                              setWithdrawAmount("");
                              setWithdrawNote("");
                              setWithdrawModalOpen(true);
                            }}
                            title="Rút tiền"
                            className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" /> Rút Tiền
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            title="Sửa"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: item.id, type: "bank", title: `STK ${item.accountNumber}` })}
                            title="Xóa"
                            className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
                </table>  </div>  {/* Mobile Bank Card View */}  <div className="block sm:hidden divide-y divide-slate-800/80 p-3 space-y-3">    {filteredBank.map((item) => (      <div key={item.id} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3 shadow-md">        <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">          <span className="font-bold text-cyan-400 font-mono text-sm">{item.accountNumber}</span>          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.isActive ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/15 text-rose-400 border border-rose-500/30"}`}>{item.isActive ? "Đang chạy" : "Tắt"}</span>        </div>        <div className="space-y-1 text-xs text-slate-300">          <div className="flex justify-between"><span>Chủ tài khoản:</span><span className="font-semibold">{item.accountHolder}</span></div>          <div className="flex justify-between"><span>Ngân hàng:</span><span>{item.bankShortCode || item.bankDisplayName || "—"}</span></div>          <div className="flex justify-between"><span>Số dư khả dụng:</span><span className="font-bold text-emerald-400 font-mono">{formatVND(item.balanceRemaining)}</span></div>        </div>        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">          <button onClick={() => setWithdrawModalTarget({ id: item.id, type: "bank", label: `STK ${item.accountNumber}`, currentBalance: item.balanceRemaining })} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold">Rút Tiền</button>          <button onClick={() => openEditModal(item)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs">Sửa</button>        </div>      </div>    ))}  </div></div>
        </div>
      )}

      {/* Tab 2: USDT Wallets Table */}
      {activeTab === "usdt" && (
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl overflow-hidden space-y-4">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none whitespace-nowrap">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Ví USDT / Nhãn</th>
                  <th className="py-3.5 px-4">Mạng Lưới</th>
                  <th className="py-3.5 px-4 text-right">Tổng Nhận ($ USDT)</th>
                  <th className="py-3.5 px-4 text-right">Đã Rút ($ USDT)</th>
                  <th className="py-3.5 px-4 text-right">Số Dư USDT ($)</th>
                  <th className="py-3.5 px-4 text-center">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
                      <span>Đang tải danh sách ví USDT...</span>
                    </td>
                  </tr>
                ) : filteredUsdt.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      Chưa có ví USDT nào. Bấm nút "Thêm Ví USDT Mới" để bắt đầu.
                    </td>
                  </tr>
                ) : (
                  filteredUsdt.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-center text-slate-500 font-mono">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-200 font-bold tracking-tight text-xs break-all">
                            {item.walletAddress}
                          </span>
                          <button
                            onClick={() => handleCopy(item.walletAddress)}
                            title="Sao chép địa chỉ ví"
                            className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            {copiedAddress === item.walletAddress ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {item.label && <div className="text-[11px] text-purple-400/80 mt-1">{item.label}</div>}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-lg font-bold text-xs">
                          {item.network}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-300 whitespace-nowrap">
                        {formatUSDT(item.totalReceived)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400/90 whitespace-nowrap">
                        {formatUSDT(item.totalWithdrawn)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                        <div className="font-bold text-emerald-400 text-sm">{formatUSDT(item.balanceRemaining)}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">≈ {formatVND(item.balanceRemaining * exchangeRate)}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-row items-center justify-center gap-1.5 whitespace-nowrap">
                          {item.isDefault && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                              ★ Mặc định
                            </span>
                          )}
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap ${item.isActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-slate-800 text-slate-500 border border-slate-700"}`}>
                            {item.isActive ? "Đang bật" : "Tắt"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!item.isDefault && (
                            <button
                              onClick={() => handleSetDefaultUsdt(item.id)}
                              title="Đặt mặc định"
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-300 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setWithdrawTarget({ id: item.id, type: "usdt", title: `Ví USDT ${item.network} (${item.walletAddress.substring(0, 8)}...)` });
                              setWithdrawAmount("");
                              setWithdrawNote("");
                              setWithdrawModalOpen(true);
                            }}
                            title="Rút USDT"
                            className="px-2.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" /> Rút USDT
                          </button>
                          <button
                            onClick={() => openEditModal(item)}
                            title="Sửa"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-purple-300 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: item.id, type: "usdt", title: `Ví USDT ${item.walletAddress.substring(0, 10)}...` })}
                            title="Xóa"
                            className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {activeTab === "bank" ? <Building2 className="w-5 h-5 text-cyan-400" /> : <Wallet className="w-5 h-5 text-purple-400" />}
                {editingItem ? (activeTab === "bank" ? "Chỉnh Sửa Tài Khoản Ngân Hàng" : "Chỉnh Sửa Ví USDT") : (activeTab === "bank" ? "Thêm Tài Khoản Ngân Hàng Mới" : "Thêm Ví USDT Mới")}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {activeTab === "bank" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Số Tài Khoản (STK) *</label>
                      <input
                        type="text"
                        required
                        placeholder="VD: 9183400998"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Chủ Tài Khoản *</label>
                      <input
                        type="text"
                        required
                        placeholder="VD: NGO LE NGOC HUNG"
                        value={formData.accountHolder}
                        onChange={(e) => setFormData({ ...formData, accountHolder: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Tên Ngân Hàng</label>
                      <input
                        type="text"
                        placeholder="VD: MBBank"
                        value={formData.bankDisplayName}
                        onChange={(e) => setFormData({ ...formData, bankDisplayName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Mã Ngân Hàng (Short Code)</label>
                      <input
                        type="text"
                        placeholder="VD: MB"
                        value={formData.bankShortCode}
                        onChange={(e) => setFormData({ ...formData, bankShortCode: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Mã BIN Ngân Hàng</label>
                      <input
                        type="text"
                        placeholder="VD: 970422"
                        value={formData.bankBin}
                        onChange={(e) => setFormData({ ...formData, bankBin: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Tiền tố ghi chú QR</label>
                      <input
                        type="text"
                        placeholder="VD: MAV"
                        value={formData.qrNotePrefix}
                        onChange={(e) => setFormData({ ...formData, qrNotePrefix: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Nhãn đại diện / Ghi chú</label>
                    <input
                      type="text"
                      placeholder="VD: STK Chính Mavryk Shop"
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Địa Chỉ Ví USDT *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: T9zX8yK2mN4pL7qR0sV5wX1yZ3aB5cD7eF"
                      value={formData.walletAddress}
                      onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Mạng Lưới (Network)</label>
                      <select
                        value={formData.network}
                        onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                      >
                        <option value="TRC20">TRC20 (Tron Network)</option>
                        <option value="BEP20">BEP20 (Binance Smart Chain)</option>
                        <option value="ERC20">ERC20 (Ethereum)</option>
                        <option value="POLYGON">POLYGON (Polygon)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Nhãn / Ghi chú</label>
                      <input
                        type="text"
                        placeholder="VD: Ví USDT chính TRC20"
                        value={formData.label}
                        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Đặt làm mặc định</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Kích hoạt (Bật nhận tiền)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-500 rounded-xl flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? "Cập Nhật" : "Tạo Mới"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Withdraw */}
      {withdrawModalOpen && withdrawTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                Ghi Nhận Rút Tiền
              </h3>
              <button onClick={() => setWithdrawModalOpen(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="p-6 space-y-4">
              <div className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
                Tài khoản: <span className="font-bold text-white">{withdrawTarget.title}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Số tiền rút {withdrawTarget.type === "bank" ? "(VND)" : "(USDT)"} *
                </label>
                <input
                  type="number"
                  required
                  step="any"
                  placeholder={withdrawTarget.type === "bank" ? "VD: 5000000" : "VD: 100"}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Ghi chú rút tiền</label>
                <input
                  type="text"
                  placeholder="VD: Rút tiền mặt lợi nhuận shop"
                  value={withdrawNote}
                  onChange={(e) => setWithdrawNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setWithdrawModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Xác Nhận Rút</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/20">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Xác Nhận Xóa Tài Khoản?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Bạn có chắc chắn muốn xóa <span className="font-bold text-white">{deleteTarget.title}</span> khỏi hệ thống?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Xóa Tài Khoản</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
