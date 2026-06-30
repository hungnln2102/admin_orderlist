import { useCallback, useEffect, useMemo, useState } from "react";
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
import { IpWhitelistListPanel } from "../components/IpWhitelistListPanel";
import { IpWhitelistPageHeader } from "../components/IpWhitelistPageHeader";
import { IpWhitelistSearchSummary } from "../components/IpWhitelistSearchSummary";
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
      <IpWhitelistPageHeader onCreate={handleOpenCreate} />

      <SiteMaintenancePanel
        status={maintenanceStatus}
        loading={maintenanceLoading}
        updating={maintenanceUpdating}
        error={maintenanceError}
        whitelistCount={items.length}
        onToggle={handleToggleMaintenance}
      />

      <IpWhitelistSearchSummary
        searchTerm={searchTerm}
        totalCount={items.length}
        visibleCount={totalItems}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
      />

      {error && (
        <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      <IpWhitelistListPanel
        loading={loading}
        items={currentRows}
        startIndex={startIndex}
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={PAGE_SIZE}
        onPageChange={setCurrentPage}
        onEdit={handleOpenEdit}
        onDelete={setDeleteItem}
      />

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
