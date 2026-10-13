import React, { useState, useEffect } from "react";
import { ShoppingBag, Plus } from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";
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
  parsePackageDuration,
  calculateExpirationDate,
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
    tabCounts,
    summaryData,
    fetchOrders,
  } = useOrders(initialTab);

  const {
    productsCatalog,
    allSuppliersCatalog,
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
  const [packageProductsList, setPackageProductsList] = useState<any[]>([]);
  const [packageCategoriesList, setPackageCategoriesList] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/products/packages")
      .then((res) => res.json())
      .then((data) => setPackageProductsList(data.data || []))
      .catch(() => {});

    fetch("/api/products/packages/categories")
      .then((res) => res.json())
      .then((data) => setPackageCategoriesList(data.data || data || []))
      .catch(() => {});
  }, []);

  const handleMarkPaid = async (order: Order) => {
    try {
      const res = await fetch(`/api/orders/${order.id}/process`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        notify.success(`Đã chuyển đơn #${order.id_order} sang Đang Xử Lý thành công!`);
        fetchOrders();
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
        fetchOrders();
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
        notify.success(`Yêu cầu gia hạn đơn #${order.id_order} thành công!`);
        fetchOrders();
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
        updated.price = prev.cost || 0;
        updated.gross_selling_price = prev.cost || 0;
      } else {
        if (!isEditModalOpen) {
          updated.status = ORDER_STATUS.UNPAID;
        }
        if (selectedProductId) {
          const prod = productsCatalog.find((p) => p.id === selectedProductId);
          if (prod) {
            const resolvedPrice = isGift ? 0 : resolvePriceByPrefix(prod, prefixVal);
            updated.price = resolvedPrice;
            updated.gross_selling_price = resolvedPrice;
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
      return;
    }

    const pId = Number(productIdVal);
    const prod = productsCatalog.find((p) => p.id === pId);
    if (!prod) return;

    setSelectedProductId(prod.id);
    const prefix = formData.order_prefix || ORDER_PREFIX.MAVC;
    const isImport = prefix.startsWith(ORDER_PREFIX.MAVN);
    const sellingPrice = isImport ? 0 : resolvePriceByPrefix(prod, prefix);

    await fetchSuppliersForProduct(prod.id);

    const textToMatch = `${prod.san_pham} ${prod.package_product || ""}`;
    const { days: derivedDays } = parsePackageDuration(textToMatch);
    const baseDateStr = formData.order_date || formatDateYYYYMMDD(new Date());
    const expiryStr = calculateExpirationDate(baseDateStr, derivedDays);

    setFormData((prev) => ({
      ...prev,
      id_product: prod.san_pham,
      price: sellingPrice,
      gross_selling_price: sellingPrice,
      supply_id: "",
      cost: 0,
      days: derivedDays,
      expired_at: expiryStr,
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

  const handleOpenCreate = () => {
    const today = formatDateYYYYMMDD(new Date());
    const nextYear = calculateExpirationDate(today, 365);
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
      });
    } else {
      setFormData({
        ...DEFAULT_FORM_DATA,
        order_prefix: ORDER_PREFIX.MAVC,
        status: ORDER_STATUS.UNPAID,
        order_date: today,
        expired_at: nextYear,
      });
    }
    setIsCreateModalOpen(true);
  };

  const handleOpenView = (order: Order) => {
    setSelectedOrder(order);
    setIsViewModalOpen(true);
  };

  const handleOpenEdit = async (order: Order) => {
    setSelectedOrder(order);
    setIsCustomPriceMode(false);
    const prodName = order.id_product ? String(order.id_product) : "";
    const matchedProd = productsCatalog.find(
      (p) => p.san_pham.toLowerCase() === prodName.toLowerCase() || String(p.id) === prodName
    );

    const prefixConfig = getOrderPrefixConfig(order.id_order);
    const prefix = prefixConfig.prefix;

    if (matchedProd) {
      setSelectedProductId(matchedProd.id);
      await fetchSuppliersForProduct(matchedProd.id);
    } else {
      setSelectedProductId(null);
      setProductSuppliersCatalog([]);
    }

    const matchedSupplier = allSuppliersCatalog.find(
      (s) => String(s.id) === String(order.supply_id) || (s.supplier_name || s.ncc_name) === order.supply_id
    );
    const supplierName = (matchedSupplier ? (matchedSupplier.supplier_name || matchedSupplier.ncc_name) : null) || (order.supply_id ? String(order.supply_id) : "") || "";

    setFormData({
      customer: order.customer || "",
      contact: order.contact || "",
      information_order: order.information_order || "",
      slot: order.slot || "",
      id_product: prodName,
      supply_id: supplierName,
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
      const generatedCode = isImportTab ? undefined : `${prefix}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const payload = {
        ...formData,
        order_prefix: prefix,
        id_order: generatedCode,
        status: isImportTab ? ORDER_STATUS.PAID : ORDER_STATUS.UNPAID,
        customer: isImportTab ? "Mavryk" : (formData.customer || "Khách Hàng"),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const createdOrder = await res.json();
        setIsCreateModalOpen(false);
        fetchOrders();
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
        fetchOrders();
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
        fetchOrders();
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
            loadingSuppliers={loadingSuppliers}
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
        loadingSuppliers={loadingSuppliers}
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
          fetchOrders();
        }}
      />
    </div>
  );
};
