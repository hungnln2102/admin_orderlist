import React, { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Wallet,
  Plus,
  Building2,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";
import {
  PaymentTabKey,
  BankAccountItem,
  UsdtWalletItem,
  WalletFormData,
  WalletTarget,
  WalletFilterBar,
  BankAccountsTable,
  UsdtWalletsTable,
  WalletCreateEditModal,
  WithdrawModal,
  WalletDeleteModal,
} from "@/features/payment-wallets";

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
  const [withdrawTarget, setWithdrawTarget] = useState<WalletTarget | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawNote, setWithdrawNote] = useState<string>("");

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<WalletTarget | null>(null);

  // Form states for Add/Edit
  const [formData, setFormData] = useState<WalletFormData>({
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
      <WalletFilterBar
        activeTab={activeTab}
        search={search}
        onSearchChange={setSearch}
        resultCount={activeTab === "bank" ? filteredBanks.length : filteredUsdt.length}
      />

      {/* Tab 1: Bank Payment Accounts Table */}
      {activeTab === "bank" && (
        <BankAccountsTable
          loading={loading}
          bankAccounts={filteredBanks}
          onSetDefault={handleSetDefaultBank}
          onOpenWithdraw={(item) => {
            setWithdrawTarget({ id: item.id, type: "bank", title: `${item.bankDisplayName || "STK"} - ${item.accountNumber}` });
            setWithdrawAmount("");
            setWithdrawNote("");
            setWithdrawModalOpen(true);
          }}
          onOpenEdit={openEditModal}
          onOpenDelete={(item) => setDeleteTarget({ id: item.id, type: "bank", title: `STK ${item.accountNumber}` })}
        />
      )}

      {/* Tab 2: USDT Wallets Table */}
      {activeTab === "usdt" && (
        <UsdtWalletsTable
          loading={loading}
          usdtWallets={filteredUsdt}
          exchangeRate={exchangeRate}
          copiedAddress={copiedAddress}
          onCopy={handleCopy}
          onSetDefault={handleSetDefaultUsdt}
          onOpenWithdraw={(item) => {
            setWithdrawTarget({ id: item.id, type: "usdt", title: `Ví USDT ${item.network} (${item.walletAddress.substring(0, 8)}...)` });
            setWithdrawAmount("");
            setWithdrawNote("");
            setWithdrawModalOpen(true);
          }}
          onOpenEdit={openEditModal}
          onOpenDelete={(item) => setDeleteTarget({ id: item.id, type: "usdt", title: `Ví USDT ${item.walletAddress.substring(0, 10)}...` })}
        />
      )}

      {/* Modal Add / Edit */}
      <WalletCreateEditModal
        open={modalOpen}
        activeTab={activeTab}
        editingItem={editingItem}
        formData={formData}
        submitting={submitting}
        onClose={() => setModalOpen(false)}
        onFormChange={setFormData}
        onSubmit={handleFormSubmit}
      />

      {/* Modal Withdraw */}
      <WithdrawModal
        open={withdrawModalOpen}
        target={withdrawTarget}
        amount={withdrawAmount}
        note={withdrawNote}
        submitting={submitting}
        onClose={() => setWithdrawModalOpen(false)}
        onAmountChange={setWithdrawAmount}
        onNoteChange={setWithdrawNote}
        onSubmit={handleWithdrawSubmit}
      />

      {/* Modal Delete Confirm */}
      <WalletDeleteModal
        target={deleteTarget}
        submitting={submitting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteSubmit}
      />
    </div>
  );
};
