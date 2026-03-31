import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import Pagination from "@/components/ui/Pagination";
import GradientButton from "@/components/ui/GradientButton";
import { showAppNotification } from "@/lib/notifications";
import {
  createIpWhitelistItem,
  deleteIpWhitelistItem,
  fetchIpWhitelistItems,
  updateIpWhitelistItem,
} from "../api/ipWhitelistApi";
import {
  fetchSiteMaintenanceStatus,
  updateSiteMaintenanceStatus,
} from "../api/siteMaintenanceApi";
import {
  DeleteIpWhitelistModal,
} from "../components/DeleteIpWhitelistModal";
import { IpWhitelistFormModal } from "../components/IpWhitelistFormModal";
import { IpWhitelistTable } from "../components/IpWhitelistTable";
import { SiteMaintenancePanel } from "../components/SiteMaintenancePanel";
import type {
  IpWhitelistItem,
  IpWhitelistPayload,
  SiteMaintenanceStatus,
} from "../types";

const PAGE_SIZE = 10;

export function IpWhitelistPage() {
  const [items, setItems] = useState<IpWhitelistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IpWhitelistItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<IpWhitelistItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [maintenanceStatus, setMaintenanceStatus] =
    useState<SiteMaintenanceStatus | null>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [maintenanceUpdating, setMaintenanceUpdating] = useState(false);
  const [maintenanceError, setMaintenanceError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchIpWhitelistItems();
      setItems(data);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải danh sách IP whitelist.";
      setItems([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const loadMaintenanceStatus = useCallback(async () => {
    try {
      setMaintenanceLoading(true);
      setMaintenanceError(null);
      const data = await fetchSiteMaintenanceStatus();
      setMaintenanceStatus(data);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải trạng thái bảo trì website.";
      setMaintenanceStatus(null);
      setMaintenanceError(message);
    } finally {
      setMaintenanceLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMaintenanceStatus();
  }, [loadMaintenanceStatus]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) {
      return items;
    }

    const keyword = searchTerm.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.ipAddress.toLowerCase().includes(keyword) ||
        (item.description ?? "").toLowerCase().includes(keyword)
    );
  }, [items, searchTerm]);

  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const currentRows = filteredItems.slice(startIndex, startIndex + PAGE_SIZE);

  const handleOpenCreate = () => {
    setFormMode("create");
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (item: IpWhitelistItem) => {
    setFormMode("edit");
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    if (submitting) {
      return;
    }

    setFormOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (payload: IpWhitelistPayload) => {
    try {
      setSubmitting(true);

      if (formMode === "edit" && editingItem) {
        const updatedItem = await updateIpWhitelistItem(editingItem.id, payload);
        setItems((prev) =>
          prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
        );
        showAppNotification({
          type: "success",
          message: `Đã cập nhật IP whitelist ${updatedItem.ipAddress}.`,
        });
      } else {
        const createdItem = await createIpWhitelistItem(payload);
        setItems((prev) => [createdItem, ...prev]);
        setCurrentPage(1);
        showAppNotification({
          type: "success",
          message: `Đã thêm IP whitelist ${createdItem.ipAddress}.`,
        });
      }

      setFormOpen(false);
      setEditingItem(null);
    } catch (submitError) {
      showAppNotification({
        type: "error",
        title:
          formMode === "edit"
            ? "Lỗi cập nhật IP whitelist"
            : "Lỗi thêm IP whitelist",
        message:
          submitError instanceof Error
            ? submitError.message
            : "Không thể lưu IP whitelist.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) {
      return;
    }

    try {
      setDeleting(true);
      await deleteIpWhitelistItem(deleteItem.id);
      setItems((prev) => prev.filter((item) => item.id !== deleteItem.id));
      showAppNotification({
        type: "success",
        message: `Đã xóa IP whitelist ${deleteItem.ipAddress}.`,
      });
      setDeleteItem(null);
    } catch (deleteError) {
      showAppNotification({
        type: "error",
        title: "Lỗi xóa IP whitelist",
        message:
          deleteError instanceof Error
            ? deleteError.message
            : "Không thể xóa IP whitelist.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleMaintenance = async (enabled: boolean) => {
    try {
      setMaintenanceUpdating(true);
      const nextStatus = await updateSiteMaintenanceStatus(enabled);
      setMaintenanceStatus(nextStatus);
      setMaintenanceError(null);
      showAppNotification({
        type: "success",
        message: enabled
          ? "Đã bật chế độ bảo trì cho website."
          : "Đã tắt chế độ bảo trì cho website.",
      });
    } catch (toggleError) {
      const message =
        toggleError instanceof Error
          ? toggleError.message
          : "Không thể cập nhật trạng thái bảo trì.";
      setMaintenanceError(message);
      showAppNotification({
        type: "error",
        title: "Lỗi cập nhật bảo trì",
        message,
      });
    } finally {
      setMaintenanceUpdating(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/80">
            <ShieldCheckIcon className="h-4 w-4" />
            IP whitelist
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Quản lý IP whitelist
            </h1>
            <p className="mt-1 text-sm font-medium tracking-wide text-white/50">
              Thêm, chỉnh sửa và gỡ các địa chỉ IP được phép truy cập hệ thống.
            </p>
          </div>
        </div>

        <GradientButton
          icon={PlusIcon}
          onClick={handleOpenCreate}
          className="shrink-0"
        >
          Thêm IP whitelist
        </GradientButton>
      </div>

      <SiteMaintenancePanel
        status={maintenanceStatus}
        loading={maintenanceLoading}
        updating={maintenanceUpdating}
        error={maintenanceError}
        whitelistCount={items.length}
        onToggle={handleToggleMaintenance}
      />

      <div className="rounded-[32px] border border-white/15 bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 p-4 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7),0_14px_34px_-26px_rgba(255,255,255,0.2)] backdrop-blur-sm lg:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-300/70" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo IP hoặc mô tả..."
              className="w-full rounded-2xl border border-white/10 bg-slate-950/40 py-2.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-400/70 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-950/35 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
              Tổng IP
            </p>
            <p className="mt-2 text-2xl font-bold text-white">{items.length}</p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-slate-950/35 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
              Hiển thị
            </p>
            <p className="mt-2 text-2xl font-bold text-white">{totalItems}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-[18px] border border-white/12 bg-gradient-to-br from-indigo-900/70 via-slate-900/70 to-slate-950/70 shadow-[0_20px_65px_-30px_rgba(0,0,0,0.85)]">
        {loading ? (
          <div className="px-4 py-14 text-center text-white/70">
            Đang tải danh sách IP whitelist...
          </div>
        ) : (
          <>
            <IpWhitelistTable
              items={currentRows}
              startIndex={startIndex}
              onEdit={handleOpenEdit}
              onDelete={setDeleteItem}
            />

            {totalItems > 0 && (
              <div className="flex flex-col gap-3 border-t border-white/10 bg-slate-900/85 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalItems}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      <IpWhitelistFormModal
        isOpen={formOpen}
        mode={formMode}
        item={editingItem}
        submitting={submitting}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
      />

      <DeleteIpWhitelistModal
        isOpen={!!deleteItem}
        item={deleteItem}
        deleting={deleting}
        onClose={() => {
          if (!deleting) {
            setDeleteItem(null);
          }
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
