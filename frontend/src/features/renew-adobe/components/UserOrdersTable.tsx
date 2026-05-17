/**
 * Bảng hiển thị Mã đơn hàng, Tên Khách Hàng, Email, Tình trạng Gói, Hạn Sử Dụng, Thao Tác.
 *
 * Luồng dữ liệu:
 * 1. order_list lọc theo variant_id thuộc hệ thống renew_adobe (product_system)
 * 2. API trả về order_code, information_order, customer, expiry_date, status
 * 3. Join order_user_tracking + mapping (API) → profile, tình trạng gói
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import Pagination from "@/components/ui/Pagination";
import ConfirmModal from "@/components/modals/ConfirmModal/ConfirmModal";
import {
  deleteTrackingOrder,
  fetchRenewAdobeUserOrders,
} from "@/features/renew-adobe/user-orders/api";
import type { OrderInfo, UserOrderRow } from "@/features/renew-adobe/user-orders/types";
import { flattenToUserRows } from "@/features/renew-adobe/user-orders/utils";
import { AddTrackingOrdersModal } from "@/features/renew-adobe/components/AddTrackingOrdersModal";
import { EditTrackingOrderModal } from "@/features/renew-adobe/components/EditTrackingOrderModal";
import { renewFixAdesAccount } from "@/features/renew-adobe/fix-ades/api";
import { showAppNotification } from "@/lib/notifications";
import { PAGE_SIZE } from "./user-orders-table/constants";
import { UserOrdersTableCard } from "./user-orders-table/UserOrdersTableCard";
import { UserOrdersTableControls } from "./user-orders-table/UserOrdersTableControls";
import { UserOrdersTableDesktopRow } from "./user-orders-table/UserOrdersTableDesktopRow";

export type UserOrdersTableProps = {
  /** Đổi khi load lại danh sách admin → refetch user-orders (join API). */
  accountsRefreshDep?: string;
  onDeleteUser?: (accountId: number, userEmail: string) => void;
  deletingId?: string | null;
  onFixUser?: (userEmail: string) => void;
  fixingId?: string | null;
  /** Fix tuần tự các user đang hiển thị (theo ô tìm kiếm) có accountId === 0 */
  onFixAllUsers?: (emails: string[]) => void;
  fixAllProgress?: { current: number; total: number } | null;
};

export function UserOrdersTable({
  accountsRefreshDep = "",
  onDeleteUser,
  deletingId,
  onFixUser,
  fixingId,
  onFixAllUsers,
  fixAllProgress,
}: UserOrdersTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [orderData, setOrderData] = useState<OrderInfo[]>([]);
  const [addTrackingOpen, setAddTrackingOpen] = useState(false);
  const [trackingRefreshKey, setTrackingRefreshKey] = useState(0);
  const [editTarget, setEditTarget] = useState<UserOrderRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserOrderRow | null>(null);
  const [deletingTrackingId, setDeletingTrackingId] = useState<string | null>(null);
  const [adesRenewTarget, setAdesRenewTarget] = useState<UserOrderRow | null>(null);
  const [adesRenewingId, setAdesRenewingId] = useState<string | null>(null);

  const reloadOrders = useCallback(() => {
    fetchRenewAdobeUserOrders()
      .then((data) => setOrderData(data))
      .catch(() => setOrderData([]));
  }, []);

  useEffect(() => {
    reloadOrders();
  }, [accountsRefreshDep, reloadOrders, trackingRefreshKey]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const code = deleteTarget.order_code;
    setDeletingTrackingId(code);
    try {
      await deleteTrackingOrder(code);
      showAppNotification({
        type: "success",
        title: "Đã xoá khỏi tracking",
        message: `Đơn ${code} đã được xoá khỏi order_user_tracking.`,
      });
      setDeleteTarget(null);
      setTrackingRefreshKey((k) => k + 1);
    } catch (err) {
      showAppNotification({
        type: "error",
        title: "Xoá thất bại",
        message: (err as Error)?.message || "Không thể xoá đơn khỏi tracking.",
      });
    } finally {
      setDeletingTrackingId(null);
    }
  }, [deleteTarget]);

  const handleConfirmAdesRenew = useCallback(async () => {
    if (!adesRenewTarget) return;
    const email = adesRenewTarget.email;
    const code = adesRenewTarget.order_code;
    setAdesRenewingId(email);
    try {
      const result = await renewFixAdesAccount(email);
      const user = result?.data?.user;
      const credits = result?.data?.creditsRemaining;
      const expires = user?.expiresAt
        ? new Date(user.expiresAt).toLocaleDateString("vi-VN")
        : "?";
      showAppNotification({
        type: "success",
        title: "Renew Fix Ades thành công",
        message: `${email} — đến ${expires}${
          typeof credits === "number" ? ` (còn ${credits} credit)` : ""
        }`,
      });
      setAdesRenewTarget(null);
      setTrackingRefreshKey((k) => k + 1);
    } catch (err) {
      showAppNotification({
        type: "error",
        title: "Renew Fix Ades thất bại",
        message: (err as Error)?.message || `Không thể renew đơn ${code} qua Fix Ades.`,
      });
    } finally {
      setAdesRenewingId(null);
    }
  }, [adesRenewTarget]);

  const allRows = useMemo(() => flattenToUserRows(orderData), [orderData]);
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return allRows;
    const q = searchTerm.trim().toLowerCase();
    return allRows.filter(
      (r) =>
        r.order_code.toLowerCase().includes(q) ||
        r.customer_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
    );
  }, [allRows, searchTerm]);
  const sortedRows = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.expirySortTs === null && b.expirySortTs === null) return 0;
      if (a.expirySortTs === null) return 1;
      if (b.expirySortTs === null) return -1;
      return a.expirySortTs - b.expirySortTs;
    });
  }, [filtered]);

  const fixableEmailsInView = useMemo(
    () => sortedRows.filter((r) => r.accountId === 0).map((r) => r.email),
    [sortedRows]
  );

  const totalItems = sortedRows.length;
  const start = (page - 1) * PAGE_SIZE;
  const currentRows = sortedRows.slice(start, start + PAGE_SIZE);
  const canInteract = !fixingId && !deletingId && !fixAllProgress;

  const actionProps = {
    onDeleteUser,
    deletingId,
    onFixUser,
    fixingId,
    fixAllProgress,
    deletingTrackingId,
    adesRenewingId,
    onOpenEdit: setEditTarget,
    onOpenDeleteTracking: setDeleteTarget,
    onOpenAdesRenew: setAdesRenewTarget,
  };

  return (
    <div className="rounded-[18px] bg-gradient-to-br from-slate-800/65 via-slate-700/55 to-slate-900/65 border border-white/15 p-4 lg:p-6 shadow-[0_20px_55px_-30px_rgba(0,0,0,0.7)] backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-white/90 mb-1">
        Danh sách user & đơn hàng
      </h3>
      <p className="text-xs text-white/50 mb-4">
        Mã đơn hàng, Tên Khách Hàng, Email, Profile, Tình trạng Gói, Hạn Sử Dụng
      </p>

      <UserOrdersTableControls
        searchTerm={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setPage(1);
        }}
        onAddOrder={() => setAddTrackingOpen(true)}
        canInteract={canInteract}
        onFixAllUsers={onFixAllUsers}
        fixableEmailsInView={fixableEmailsInView}
        fixAllProgress={fixAllProgress}
      />

      <AddTrackingOrdersModal
        open={addTrackingOpen}
        onClose={() => setAddTrackingOpen(false)}
        onSaved={() => setTrackingRefreshKey((k) => k + 1)}
      />

      <EditTrackingOrderModal
        open={editTarget !== null}
        orderCode={editTarget?.order_code ?? ""}
        initialSystemNote={editTarget?.systemNote}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          setEditTarget(null);
          setTrackingRefreshKey((k) => k + 1);
          showAppNotification({
            type: "success",
            title: "Đã cập nhật",
            message: "Hệ thống fix của đơn đã được lưu.",
          });
        }}
      />

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => {
          if (!deletingTrackingId) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Xoá đơn khỏi tracking?"
        message={
          deleteTarget
            ? `Xoá đơn ${deleteTarget.order_code} khỏi order_user_tracking?`
            : ""
        }
        secondaryMessage="Chỉ xoá khỏi bảng tracking. Mapping user ↔ admin Adobe vẫn còn — nếu cần xoá hẳn, dùng nút Xóa ở cột Adobe."
        confirmLabel={deletingTrackingId ? "Đang xoá…" : "Xoá"}
        cancelLabel="Hủy"
        isSubmitting={deletingTrackingId !== null}
      />

      <ConfirmModal
        isOpen={adesRenewTarget !== null}
        onClose={() => {
          if (!adesRenewingId) setAdesRenewTarget(null);
        }}
        onConfirm={handleConfirmAdesRenew}
        title="Renew qua Fix Ades?"
        message={
          adesRenewTarget
            ? `Gọi renew cho ${adesRenewTarget.email} (đơn ${adesRenewTarget.order_code})?`
            : ""
        }
        secondaryMessage="Thao tác sẽ trừ 1 credit Ades. Chỉ thực hiện khi tài khoản đến hạn / cần gia hạn — không bấm thử."
        confirmLabel={adesRenewingId ? "Đang renew…" : "Renew"}
        cancelLabel="Hủy"
        isSubmitting={adesRenewingId !== null}
      />

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <ResponsiveTable
          showCardOnMobile
          cardView={<UserOrdersTableCard rows={currentRows} {...actionProps} />}
        >
          <table className="min-w-full divide-y divide-white/5 text-white">
            <thead>
              <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-[10px] [&>th]:sm:text-[11px] [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-[0.1em] [&>th]:text-indigo-300/70 [&>th]:text-left [&>th]:bg-white/[0.03] [&>th]:whitespace-nowrap">
                <th className="min-w-[120px]">MÃ ĐƠN HÀNG</th>
                <th className="min-w-[160px]">TÊN KHÁCH HÀNG</th>
                <th className="min-w-[200px]">EMAIL</th>
                <th className="min-w-[140px]">PROFILE</th>
                <th className="min-w-[140px]">HỆ THỐNG</th>
                <th className="min-w-[12rem] whitespace-nowrap">TÌNH TRẠNG GÓI</th>
                <th className="min-w-[110px]">HẠN SỬ DỤNG</th>
                <th className="min-w-[10rem] text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-white/70">
                    Chưa có dữ liệu. Chạy Check để đồng bộ users từ Adobe.
                  </td>
                </tr>
              ) : (
                currentRows.map((row) => (
                  <UserOrdersTableDesktopRow key={row.id} row={row} {...actionProps} />
                ))
              )}
            </tbody>
          </table>
        </ResponsiveTable>

        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-white/10 bg-slate-900/85 px-4 py-3">
            <Pagination
              currentPage={page}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
