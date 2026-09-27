import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ShoppingBag, Plus } from "lucide-react";
import { useNotification } from "@/shared/context/NotificationContext";
import {
  Order,
  OrderDatasetKey,
  OrdersPageProps,
  DEFAULT_FORM_DATA,
  CatalogProduct,
  CatalogSupplierCost,
  CatalogSupplier,
  OrderFilterBar,
  OrderTable,
  OrderCreateEditModal,
  OrderDetailModal,
  OrderDeleteModal,
} from "../features/orders";

export const OrdersPage: React.FC<OrdersPageProps> = ({ initialTab = "active" }) => {
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState<OrderDatasetKey>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [tabCounts, setTabCounts] = useState({ active: 0, import: 0, expired: 0, canceled: 0 });

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Form states
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  // Catalog Data States for Dropdowns & Auto-fill
  const [productsCatalog, setProductsCatalog] = useState<CatalogProduct[]>([]);
  const [allSuppliersCatalog, setAllSuppliersCatalog] = useState<CatalogSupplier[]>([]);
  const [productSuppliersCatalog, setProductSuppliersCatalog] = useState<CatalogSupplierCost[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [isCustomPriceMode, setIsCustomPriceMode] = useState<boolean>(false);

  // Fetch product catalog and all suppliers catalog once on mount
  useEffect(() => {
    fetch("/api/products/prices?limit=500")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) setProductsCatalog(data.data);
      })
      .catch((err) => console.error("Lỗi tải danh mục sản phẩm:", err));

    fetch("/api/products/all-suppliers")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.data || [];
        setAllSuppliersCatalog(list);
      })
      .catch((err) => console.error("Lỗi tải danh sách NCC:", err));
  }, []);

  const fetchSuppliersForProduct = async (productId: number) => {
    setLoadingSuppliers(true);
    try {
      const res = await fetch(`/api/products/${productId}/suppliers`);
      const data = await res.json();
      if (res.ok) {
        const list: CatalogSupplierCost[] = Array.isArray(data) ? data : data.data || [];
        setProductSuppliersCatalog(list);
        return list;
      }
    } catch (err) {
      console.error("Lỗi tải NCC cho sản phẩm:", err);
    } finally {
      setLoadingSuppliers(false);
    }
    setProductSuppliersCatalog([]);
    return [];
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
    const sellingPrice = prod.retail_price > 0 ? prod.retail_price : (prod.ctv_price > 0 ? prod.ctv_price : prod.base_price);
    const infoOrder = prod.package_product && prod.package_product !== prod.san_pham
      ? `${prod.san_pham} (${prod.package_product})`
      : prod.san_pham;

    // Fetch suppliers for this specific product
    const suppliers = await fetchSuppliersForProduct(prod.id);

    let defaultSupplyName = formData.supply_id;
    let defaultCost = formData.cost;

    if (suppliers.length > 0) {
      const lowestSupplier = [...suppliers].sort((a, b) => (Number(a.price || a.gia_nhap || 0)) - (Number(b.price || b.gia_nhap || 0)))[0];
      defaultSupplyName = lowestSupplier.supplier_name || lowestSupplier.ncc_name || "";
      defaultCost = Number(lowestSupplier.price || lowestSupplier.gia_nhap || 0);
    } else if (prod.base_price > 0) {
      defaultCost = prod.base_price;
    }

    // Auto-calculate duration days & expired_at from product package name
    const textToMatch = `${prod.san_pham} ${prod.package_product || ""}`;
    let derivedDays = 365;
    const matchM = textToMatch.match(/--(\d+)m/i) || textToMatch.match(/(\d+)\s*(tháng|month|m\b)/i);
    const matchY = textToMatch.match(/(\d+)\s*(năm|year|y\b)/i);

    if (matchM) {
      const months = Number(matchM[1]);
      if (months > 0) derivedDays = months === 12 ? 365 : months * 30;
    } else if (matchY) {
      const years = Number(matchY[1]);
      if (years > 0) derivedDays = years * 365;
    }

    const baseDateStr = formData.order_date || new Date().toISOString().split("T")[0];
    const baseDate = new Date(baseDateStr);
    const expiryDate = new Date(baseDate.getTime() + derivedDays * 24 * 60 * 60 * 1000);
    const expiryStr = expiryDate.toISOString().split("T")[0];

    setFormData((prev) => ({
      ...prev,
      id_product: prod.san_pham,
      information_order: infoOrder,
      price: sellingPrice,
      gross_selling_price: sellingPrice,
      supply_id: defaultSupplyName,
      cost: defaultCost,
      days: derivedDays,
      expired_at: expiryStr,
    }));
  };

  const handleSupplierChange = (supplierVal: string) => {
    if (!supplierVal) {
      setFormData((prev) => ({ ...prev, supply_id: "", cost: 0 }));
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

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/orders?page=${page}&limit=15&search=${encodeURIComponent(
          search
        )}&status=${encodeURIComponent(statusFilter)}&tab=${activeTab}`
      );
      const data = await res.json();
      if (res.ok) {
        setOrders(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalOrders(data.pagination?.total || 0);
        if (data.tabCounts) setTabCounts(data.tabCounts);
      } else {
        console.error("Lỗi lấy danh sách đơn:", data.error);
      }
    } catch (err) {
      console.error("Lỗi kết nối API:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, activeTab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Lock background body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = isCreateModalOpen || isEditModalOpen || isDeleteModalOpen || isViewModalOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCreateModalOpen, isEditModalOpen, isDeleteModalOpen, isViewModalOpen]);

  // Stat summary calculations for active view (memoized)
  const { totalRevenue, paidCount, pendingCount } = useMemo(() => {
    const revenue = orders.reduce((sum: number, o: Order) => sum + Number(o.price || 0), 0);
    const paid = orders.filter((o: Order) => o.status === "Hoàn thành" || o.status === "Đã Thanh Toán").length;
    const pending = orders.filter((o: Order) => o.status === "Chờ xử lý" || o.status === "Chưa Thanh Toán" || o.status === "Cần gia hạn" || o.status === "CẦN GIA HẠN" || o.status === "Hết Hạn").length;
    return { totalRevenue: revenue, paidCount: paid, pendingCount: pending };
  }, [orders]);

  const handleOpenCreate = () => {
    const today = new Date().toISOString().split("T")[0];
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    setSelectedProductId(null);
    setProductSuppliersCatalog([]);
    setIsCustomPriceMode(false);
    setFormData({
      ...DEFAULT_FORM_DATA,
      order_date: today,
      expired_at: nextYear,
    });
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

    if (matchedProd) {
      setSelectedProductId(matchedProd.id);
      await fetchSuppliersForProduct(matchedProd.id);
    } else {
      setSelectedProductId(null);
      setProductSuppliersCatalog([]);
    }

    setFormData({
      customer: order.customer || "",
      contact: order.contact || "",
      information_order: order.information_order || "",
      slot: order.slot || "",
      id_product: prodName,
      supply_id: order.supply_id ? String(order.supply_id) : "",
      price: Number(order.price || 0),
      gross_selling_price: Number(order.gross_selling_price || order.price || 0),
      cost: Number(order.cost || 0),
      status: order.status || "Đã Thanh Toán",
      payment_method: order.payment_method || "bank",
      note: order.note || "",
      days: Number(order.days || 365),
      order_date: order.order_date ? new Date(order.order_date).toISOString().split("T")[0] : "",
      expired_at: order.expired_at ? new Date(order.expired_at).toISOString().split("T")[0] : "",
    });
    setIsEditModalOpen(true);
  };

  const handleOpenDelete = (order: Order) => {
    setSelectedOrder(order);
    setIsDeleteModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsCreateModalOpen(false);
        notify.success("Tạo đơn hàng thành công!", "Tạo Đơn Hàng");
        fetchOrders();
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
        totalRevenue={totalRevenue}
        paidCount={paidCount}
        pendingCount={pendingCount}
      />

      {/* Order Table Section */}
      <OrderTable
        orders={orders}
        loading={loading}
        activeTab={activeTab}
        productsCatalog={productsCatalog}
        page={page}
        totalPages={totalPages}
        totalOrders={totalOrders}
        onPageChange={(newPage) => setPage(newPage)}
        onOpenView={handleOpenView}
        onOpenEdit={handleOpenEdit}
        onOpenDelete={handleOpenDelete}
      />

      {/* Create Order Modal */}
      <OrderCreateEditModal
        isOpen={isCreateModalOpen}
        isEdit={false}
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
        isCustomPriceMode={isCustomPriceMode}
        setIsCustomPriceMode={setIsCustomPriceMode}
      />

      {/* Edit Order Modal */}
      <OrderCreateEditModal
        isOpen={isEditModalOpen}
        isEdit={true}
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
    </div>
  );
};
