import React, { useState, useEffect } from "react";
import { ShoppingBag, Plus } from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";
import { useRealtimeEvent } from "@/shared/context/RealtimeContext";
import {
  Order,
  OrdersPageProps,
  OrderFormData,
  DEFAULT_FORM_DATA,
  ORDER_STATUS,
  useOrders,
  useOrderCatalog,
  OrderFilterBar,
  OrderTable,
  OrderCreateEditModal,
  OrderDetailModal,
  OrderDeleteModal,
  PayWithCreditModal,
} from "../features/orders";
import {
  ORDER_PREFIX,
  getOrderPrefixConfig,
  resolvePriceByPrefix,
} from "../features/orders/constants/orderPrefix";
import {
  calculateExpirationDateFromStart,
  formatDateYYYYMMDD,
} from "../features/orders/utils/durationUtils";

export const OrdersPage: React.FC<OrdersPageProps> = ({ initialTab = "active" }) => {
  const notify = useNotification();

  // Custom Hooks for Orders Data & Catalog Data
  const {
    activeTab,
    setActiveTab,
    orders,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    page,
    setPage,
    totalPages,
    totalOrders,
    pageSize,
    setPageSize,
    tabCounts,
    summaryData,
    fetchOrders,
    refreshOrders,
  } = useOrders(initialTab);

  // Lắng nghe sự kiện Realtime làm mới đơn hàng lập tức (Chỉ đạo của Master)
  useRealtimeEvent(
    [
      "ORDER_CREATED",
      "ORDER_UPDATED",
      "ORDER_DELETED",
      "ORDER_PAID",
      "ORDER_RENEWED",
      "ORDER_EXPIRED",
      "WEBHOOK_MONEY_IN",
    ],
    () => {
      refreshOrders();
    }
  );

  const {
    productsCatalog,
    allSuppliersCatalog,
    packageProductsList,
    packageCategoriesList,
    loadingCatalog,
    ensureOrderCatalog,
    productSuppliersCatalog,
    setProductSuppliersCatalog,
    loadingSuppliers,
    selectedProductId,
    setSelectedProductId,
    fetchSuppliersForProduct,
  } = useOrderCatalog();

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [isPayWithCreditModalOpen, setIsPayWithCreditModalOpen] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Form states
  const [formData, setFormData] = useState<OrderFormData>(DEFAULT_FORM_DATA);
  const [isCustomPriceMode, setIsCustomPriceMode] = useState<boolean>(false);

  const handleMarkPaid = async (order: Order) => {
    try {
      const res = await fetch(`/api/orders/${order.id}/process`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        notify.success(`Đã chuyển đơn #${order.id_order} sang Đang Xử Lý thành công!`);
        refreshOrders();
      } else {
        throw new Error(data.error || "Không thể chuyển trạng thái.");
      }
    } catch (err: any) {
      console.error("Lỗi chuyển đơn sang Đang Xử Lý:", err);
      notify.error(err.message || "Lỗi hệ thống.");
    }
  };

  const handleCompleteOrder = async (order: Order) => {
    try {
      const res = await fetch(`/api/orders/${order.id}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        notify.success(`Đã hoàn thành đơn #${order.id_order} (Đã Thanh Toán)! Đã ghi nhận doanh thu.`);
        refreshOrders();
      } else {
        throw new Error(data.error || "Không thể hoàn thành đơn hàng.");
      }
    } catch (err: any) {
      console.error("Lỗi hoàn thành đơn hàng:", err);
      notify.error(err.message || "Lỗi hệ thống.");
    }
  };

  const handleOpenPayWithCredit = (order: Order) => {
    setSelectedOrder(order);
    setIsPayWithCreditModalOpen(true);
  };

  const handleRenewOrder = async (order: Order) => {
    try {
      const res = await fetch(`/api/orders/${order.id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        const isImport = Boolean(
          (order.id_order && String(order.id_order).toUpperCase().startsWith("MAVN")) ||
          (order.customer && String(order.customer).trim().toLowerCase() === "mavryk") ||
          activeTab === "import"
        );
        if (isImport) {
          notify.success(`Đã gia hạn đơn nhập hàng #${order.id_order} thành công (Đã Thanh Toán)!`);
        } else {
          notify.success(`Yêu cầu gia hạn đơn #${order.id_order} thành công!`);
        }
        refreshOrders();
      } else {
        throw new Error(data.error || "Không thể gia hạn.");
      }
    } catch (err: any) {
      console.error("Lỗi gia hạn:", err);
      notify.error(err.message || "Lỗi hệ thống khi gia hạn.");
    }
  };

  const handlePrefixChange = (prefixVal: string) => {
    const isImport = prefixVal.startsWith(ORDER_PREFIX.MAVN);
    const isGift = prefixVal.startsWith(ORDER_PREFIX.MAVT);

    setFormData((prev) => {
      const updated = { ...prev, order_prefix: prefixVal };

      if (isImport) {
        updated.status = ORDER_STATUS.PAID;
        if (!prev.customer || prev.customer === "Khách Hàng" || prev.customer === "test") {
          updated.customer = "Mavryk";
        }
        updated.price = 0;
        updated.gross_selling_price = 0;
      } else {
        if (!isEditModalOpen) {
          updated.status = ORDER_STATUS.UNPAID;
        }
        if (selectedProductId) {
          const prod = productsCatalog.find((p) => p.id === selectedProductId);
          if (prod) {
            const resolvedPrice = isGift ? 0 : resolvePriceByPrefix(prod, prefixVal);
            let existingSuffix = 0;
            if (isEditModalOpen && selectedOrder && !isGift) {
              const p = Number(selectedOrder.price || 0);
              const g = Number(selectedOrder.gross_selling_price || 0);
              if (p > 0 && g > 0 && p > g && p - g >= 1 && p - g <= 100) {
                existingSuffix = Math.round(p - g);
              } else if (p > 0) {
                const rem = Math.round(p) % 100;
                existingSuffix = rem === 0 ? 100 : rem;
              }
            }
            updated.price = isGift ? 0 : (existingSuffix > 0 ? resolvedPrice + existingSuffix : resolvedPrice);
            updated.gross_selling_price = isGift ? 0 : resolvedPrice;
          }
        }
      }

      return updated;
    });
  };

  const handleProductChange = async (productIdVal: string) => {
    if (!productIdVal) {
      setSelectedProductId(null);
      setProductSuppliersCatalog([]);
      setFormData((prev) => ({ ...prev, id_product: "", supply_id: "", cost: 0 }));
      return;
    }

    const pId = Number(productIdVal);
    const prod = productsCatalog.find(
      (p) => p.id === pId || String(p.id) === String(productIdVal) || p.san_pham === productIdVal
    );
    if (!prod) return;

    setSelectedProductId(prod.id);
    const prefix = formData.order_prefix || ORDER_PREFIX.MAVC;
    const isImport = prefix.startsWith(ORDER_PREFIX.MAVN);
    const sellingPrice = isImport ? 0 : resolvePriceByPrefix(prod, prefix);

    await fetchSuppliersForProduct(prod.id);

    const textToMatch = `${prod.san_pham} ${prod.package_product || ""}`;
    const baseDateStr = formData.order_date || formatDateYYYYMMDD(new Date());
    const duration = calculateExpirationDateFromStart(baseDateStr, textToMatch, formData.days);

    let existingSuffix = 0;
    if (isEditModalOpen && selectedOrder && !isImport) {
      const p = Number(selectedOrder.price || 0);
      const g = Number(selectedOrder.gross_selling_price || 0);
      if (p > 0 && g > 0 && p > g && p - g >= 1 && p - g <= 100) {
        existingSuffix = Math.round(p - g);
      } else if (p > 0) {
        const rem = Math.round(p) % 100;
        existingSuffix = rem === 0 ? 100 : rem;
      }
    }

    setFormData((prev) => ({
      ...prev,
      id_product: prod.san_pham,
      price: isImport ? 0 : (existingSuffix > 0 ? sellingPrice + existingSuffix : sellingPrice),
      gross_selling_price: isImport ? 0 : sellingPrice,
      supply_id: "",
      cost: 0,
      days: duration.days,
      expired_at: duration.expired_at,
    }));
  };

  const handleSupplierChange = (supplierVal: string) => {
    const prefix = formData.order_prefix || ORDER_PREFIX.MAVC;
    const isImport = prefix.startsWith(ORDER_PREFIX.MAVN);

    if (!supplierVal) {
      setFormData((prev) => ({
        ...prev,
        supply_id: "",
        cost: 0,
        price: isImport ? 0 : prev.price,
        gross_selling_price: isImport ? 0 : prev.gross_selling_price,
      }));
      return;
    }

    const foundInProduct = productSuppliersCatalog.find(
      (s) => (s.supplier_name || s.ncc_name) === supplierVal || String(s.supplier_id) === supplierVal
    );

    if (foundInProduct) {
      const costVal = Number(foundInProduct.price || foundInProduct.gia_nhap || 0);
      setFormData((prev) => ({
        ...prev,
        supply_id: foundInProduct.supplier_name || foundInProduct.ncc_name || supplierVal,
        cost: costVal,
        price: isImport ? costVal : prev.price,
        gross_selling_price: isImport ? costVal : prev.gross_selling_price,
      }));
    } else {
      const foundInAll = allSuppliersCatalog.find(
        (s) => (s.supplier_name || s.ncc_name) === supplierVal || String(s.id) === supplierVal
      );
      setFormData((prev) => ({
        ...prev,
        supply_id: foundInAll ? (foundInAll.supplier_name || foundInAll.ncc_name || supplierVal) : supplierVal,
      }));
    }
  };

  // Lock background body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = isCreateModalOpen || isEditModalOpen || isDeleteModalOpen || isViewModalOpen || isPayWithCreditModalOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCreateModalOpen, isEditModalOpen, isDeleteModalOpen, isViewModalOpen, isPayWithCreditModalOpen]);

  const handleOpenCreate = async () => {
    try {
      await ensureOrderCatalog({ refresh: true });
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Không thể tải catalog đơn hàng.");
      return;
    }
    const today = formatDateYYYYMMDD(new Date());
    const nextYear = calculateExpirationDateFromStart(today, "--1y", 365).expired_at;
    setSelectedProductId(null);
    setProductSuppliersCatalog([]);
    setIsCustomPriceMode(false);
    if (activeTab === "import") {
      setFormData({
        ...DEFAULT_FORM_DATA,
        order_prefix: ORDER_PREFIX.MAVN,
        status: ORDER_STATUS.PAID,
        customer: "Mavryk",
        order_date: today,
        expired_at: nextYear,
        save_to_warehouse: true,
        save_to_package: true,
      });
    } else {
      setFormData({
        ...DEFAULT_FORM_DATA,
        order_prefix: ORDER_PREFIX.MAVC,
        status: ORDER_STATUS.UNPAID,
        order_date: today,
        expired_at: nextYear,
        save_to_warehouse: false,
        save_to_package: false,
      });
    }
    setIsCreateModalOpen(true);
  };

  const handleOpenView = (order: Order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  const handleOpenEdit = async (order: Order) => {
    try {
      await ensureOrderCatalog({ refresh: true });
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Không thể tải catalog đơn hàng.");
      return;
    }

    setSelectedOrder(order);
    setIsCustomPriceMode(false);
    const prodIdOrName = order.id_product ? String(order.id_product) : "";
    const pId = Number(prodIdOrName);
    const matchedProd = productsCatalog.find(
      (p) =>
        (!isNaN(pId) && Number(p.id) === pId) ||
        String(p.id) === prodIdOrName ||
        (p.package_product && p.package_product.toLowerCase() === prodIdOrName.toLowerCase()) ||
        p.san_pham.toLowerCase() === prodIdOrName.toLowerCase()
    );

    const prefixConfig = getOrderPrefixConfig(order.id_order);
    const prefix = prefixConfig.prefix;

    if (matchedProd) {
      setSelectedProductId(Number(matchedProd.id));
      await fetchSuppliersForProduct(Number(matchedProd.id));
    } else if (!isNaN(pId) && pId > 0) {
      setSelectedProductId(pId);
      await fetchSuppliersForProduct(pId);
    } else {
      setSelectedProductId(null);
      setProductSuppliersCatalog([]);
    }

    const suppliersPool = allSuppliersCatalog.length > 0 ? allSuppliersCatalog : [];
    const matchedSupplier = suppliersPool.find(
      (s) => String(s.id) === String(order.supply_id) || (s.supplier_name || s.ncc_name) === order.supply_id
    );
    const resolvedSupplierName =
      (order.supplier_name && order.supplier_name.trim() && !/^\d+$/.test(order.supplier_name) ? order.supplier_name : null) ||
      (matchedSupplier ? (matchedSupplier.supplier_name || matchedSupplier.ncc_name) : null) ||
      "";
    const supplierName = resolvedSupplierName || (order.supply_id ? String(order.supply_id) : "") || "";

    const resolvedVariantName = order.variant_name || matchedProd?.package_product || matchedProd?.san_pham || prodIdOrName;
    const resolvedDisplayName = order.display_name || matchedProd?.san_pham || "";

    setFormData({
      customer: order.customer || "",
      contact: order.contact || "",
      information_order: order.information_order || "",
      slot: order.slot || "",
      id_product: prodIdOrName,
      variant_name: resolvedVariantName,
      display_name: resolvedDisplayName,
      supply_id: supplierName,
      supplier_name: resolvedSupplierName || supplierName,
      price: Number(order.price || 0),
      gross_selling_price: Number(order.gross_selling_price || order.price || 0),
      cost: Number(order.cost || 0),
      status: order.status || ORDER_STATUS.UNPAID,
      payment_method: order.payment_method || "bank",
      note: order.note || "",
      days: Number(order.days || 365),
      order_date: formatDateYYYYMMDD(order.order_date),
      expired_at: formatDateYYYYMMDD(order.expired_at),
      order_prefix: prefix,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (order: Order) => {
    setSelectedOrder(order);
    setIsDeleteModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isImportTab = activeTab === "import" || formData.order_prefix === ORDER_PREFIX.MAVN;
    if (!selectedProductId && !formData.id_product) {
      notify.error("Vui lòng chọn sản phẩm từ catalog", "Thiếu Thông Tin");
      return;
    }
    if (!formData.supply_id) {
      notify.error("Vui lòng chọn nhà cung cấp (NCC)", "Thiếu Thông Tin");
      return;
    }
    if (!isImportTab && (!formData.customer || !formData.customer.trim())) {
      notify.error("Vui lòng nhập tên khách hàng", "Thiếu Thông Tin");
      return;
    }
    if (!formData.information_order || !formData.information_order.trim()) {
      notify.error("Vui lòng nhập thông tin sản phẩm", "Thiếu Thông Tin");
      return;
    }
    try {
      const prefix = isImportTab ? ORDER_PREFIX.MAVN : (formData.order_prefix || ORDER_PREFIX.MAVC);
      const generatedCode = `${prefix}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const payload = {
        ...formData,
        order_prefix: prefix,
        id_order: generatedCode,
        status: isImportTab ? ORDER_STATUS.PAID : ORDER_STATUS.UNPAID,
        customer: isImportTab ? "Mavryk" : (formData.customer || "Khách Hàng"),
        save_to_warehouse: isImportTab ? (formData.save_to_warehouse !== false) : false,
        save_to_package: isImportTab ? (formData.save_to_package !== false) : false,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const createdOrder = await res.json();
        setIsCreateModalOpen(false);
        refreshOrders();
        if (createdOrder && createdOrder.id_order) {
          setSelectedOrder(createdOrder);
          setIsViewModalOpen(true);
        }
      } else {
        const errData = await res.json();
        notify.error(errData.error || "Tạo đơn thất bại", "Lỗi Tạo Đơn");
      }
    } catch (err) {
      notify.error("Lỗi kết nối máy chủ", "Kết Nối Thất Bại");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId && !formData.id_product) {
      notify.error("Vui lòng chọn sản phẩm từ catalog", "Thiếu Thông Tin");
      return;
    }
    if (!formData.supply_id) {
      notify.error("Vui lòng chọn nhà cung cấp (NCC)", "Thiếu Thông Tin");
      return;
    }
    if (!formData.customer || !formData.customer.trim()) {
      notify.error("Vui lòng nhập tên khách hàng", "Thiếu Thông Tin");
      return;
    }
    if (!formData.information_order || !formData.information_order.trim()) {
      notify.error("Vui lòng nhập thông tin sản phẩm", "Thiếu Thông Tin");
      return;
    }
    if (!selectedOrder) return;
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        notify.success("Cập nhật đơn hàng thành công!", "Cập Nhật Đơn Hàng");
        refreshOrders();
      } else {
        const errData = await res.json();
        notify.error(errData.error || "Cập nhật đơn thất bại", "Lỗi Cập Nhật");
      }
    } catch (err) {
      notify.error("Lỗi kết nối máy chủ", "Kết Nối Thất Bại");
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedOrder) return;
    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setIsDeleteModalOpen(false);
        notify.success(data.message || "Đã xử lý xóa đơn hàng!", "Xóa Đơn Hàng");
        refreshOrders();
      } else {
        notify.error(data.error || "Xóa đơn thất bại", "Lỗi Xóa Đơn");
      }
    } catch (err) {
      notify.error("Lỗi kết nối máy chủ", "Kết Nối Thất Bại");
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1650px] mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 text-cyan-400 rounded-xl border border-cyan-500/30 shadow-inner">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">Quản Lý Đơn Hàng (Orders)</h1>
            <p className="text-xs text-slate-400">Theo dõi doanh thu, trạng thái gia hạn, đơn nhập kho & đối soát hoàn tiền</p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Tạo Đơn Hàng Mới</span>
        </button>
      </div>

      {/* Filter and Tabs Section */}
      <OrderFilterBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setPage(1);
        }}
        tabCounts={tabCounts}
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => {
          setStatusFilter(val);
          setPage(1);
        }}
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={(start, end) => {
          setStartDate(start);
          setEndDate(end);
          setPage(1);
        }}
        totalRevenue={summaryData.totalRevenue}
        totalCost={summaryData.totalCost}
        paidCount={summaryData.paidCount}
        pendingCount={summaryData.pendingCount}
        todayCount={summaryData.todayCount}
        renewCount={summaryData.renewCount}
        processingCount={summaryData.processingCount}
        totalOrdersCount={summaryData.totalOrders}
        totalRemainingValue={summaryData.totalRemainingValue}
        supplierRemainingValue={summaryData.supplierRemainingValue}
        refundCustomerAmount={summaryData.refundCustomerAmount}
        refundedCustomerAmount={summaryData.refundedCustomerAmount}
        refundSupplierAmount={summaryData.refundSupplierAmount}
        pendingRefundCount={summaryData.pendingRefundCount}
        refundedCount={summaryData.refundedCount}
        canceledCount={summaryData.canceledCount}
      />

      {/* Order Table Section */}
      <OrderTable
        orders={orders}
        loading={loading}
        activeTab={activeTab}
        productsCatalog={productsCatalog}
        allSuppliersCatalog={allSuppliersCatalog}
        page={page}
        totalPages={totalPages}
        totalOrders={totalOrders}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onPageChange={(newPage) => setPage(newPage)}
        onOpenView={handleOpenView}
        onOpenEdit={handleOpenEdit}
        onOpenDelete={handleOpenDelete}
        onMarkPaid={handleMarkPaid}
        onCompleteOrder={handleCompleteOrder}
        onPayWithCredit={handleOpenPayWithCredit}
        onRenewOrder={handleRenewOrder}
      />

      {/* Create Order Modal */}
      {(() => {
        const selectedProduct = productsCatalog.find((p) => p.id === selectedProductId);
        const selectedProductName = selectedProduct ? (selectedProduct.san_pham || "").trim().toLowerCase() : "";
        const hasPackage = selectedProductName
          ? packageProductsList.some((pkg) => {
              const pkgName = (pkg.product_name || "").trim().toLowerCase();
              return pkgName === selectedProductName || selectedProductName.includes(pkgName) || pkgName.includes(selectedProductName);
            })
          : true;

        const matchedCategory = packageCategoriesList.find((cat) => {
          const catName = (cat.name || "").trim().toLowerCase();
          return selectedProductName === catName || selectedProductName.includes(catName) || catName.includes(selectedProductName);
        });
        const requiresStorage = matchedCategory ? Boolean(matchedCategory.requiresStorage) : false;

        return (
          <OrderCreateEditModal
            isOpen={isCreateModalOpen}
            isEdit={false}
            isImportTab={activeTab === "import"}
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreateSubmit}
            formData={formData}
            setFormData={setFormData}
            productsCatalog={productsCatalog}
            allSuppliersCatalog={allSuppliersCatalog}
            productSuppliersCatalog={productSuppliersCatalog}
            loadingSuppliers={loadingSuppliers || loadingCatalog}
            selectedProductId={selectedProductId}
            onProductChange={handleProductChange}
            onSupplierChange={handleSupplierChange}
            onPrefixChange={handlePrefixChange}
            isCustomPriceMode={isCustomPriceMode}
            setIsCustomPriceMode={setIsCustomPriceMode}
            hasPackage={hasPackage}
            requiresStorage={requiresStorage}
          />
        );
      })()}

      {/* Edit Order Modal */}
      <OrderCreateEditModal
        isOpen={isEditModalOpen}
        isEdit={true}
        isImportTab={activeTab === "import"}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmit}
        formData={formData}
        setFormData={setFormData}
        productsCatalog={productsCatalog}
        allSuppliersCatalog={allSuppliersCatalog}
        productSuppliersCatalog={productSuppliersCatalog}
        loadingSuppliers={loadingSuppliers || loadingCatalog}
        selectedProductId={selectedProductId}
        onProductChange={handleProductChange}
        onSupplierChange={handleSupplierChange}
        onPrefixChange={handlePrefixChange}
        isCustomPriceMode={isCustomPriceMode}
        setIsCustomPriceMode={setIsCustomPriceMode}
      />

      {/* View Order Detail Modal */}
      <OrderDetailModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        order={selectedOrder}
        productsCatalog={productsCatalog}
      />

      {/* Delete Order Confirmation Modal */}
      <OrderDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirmDelete={handleDeleteSubmit}
        order={selectedOrder}
      />

      {/* Pay With Credit Modal */}
      <PayWithCreditModal
        isOpen={isPayWithCreditModalOpen}
        onClose={() => setIsPayWithCreditModalOpen(false)}
        order={selectedOrder}
        onSuccess={() => {
          refreshOrders();
        }}
      />
    </div>
  );
};
