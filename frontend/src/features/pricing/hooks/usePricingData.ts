import { useCallback, useEffect, useMemo } from "react";
import {
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { PricingStat, ProductPricingRow } from "../types";
import { normalizeProductKey } from "../utils";
import { useProductData } from "./useProductData";
import { useProductActions } from "./useProductActions";
import { useSupplyActions } from "./useSupplyActions";

export const usePricingData = () => {
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalRows,
    productPrices,
    setProductPrices,
    isLoading,
    error,
    statusOverrides,
    setStatusOverrides,
    updatedTimestampMap,
    setUpdatedTimestampMap,
    expandedProductId,
    setExpandedProductId,
    isRefreshing,
    setIsRefreshing,
    fetchProductPrices,
    filteredPricing,
  } = useProductData();

  const productActions = useProductActions({
    productPrices,
    setProductPrices,
    fetchProductPrices,
    statusOverrides,
    setStatusOverrides,
    updatedTimestampMap,
    setUpdatedTimestampMap,
  });
  const supplyActions = useSupplyActions({
    setProductPrices,
    fetchProductPrices,
    refreshSupplierOptions: productActions.refreshSupplierOptions,
  });
  const { supplyPriceMap, fetchSupplyPricesForProduct } = supplyActions;

  useEffect(() => {
    fetchProductPrices();
  }, [fetchProductPrices]);

  const handleRefreshAll = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetchProductPrices();
      const cachedNames = new Set<string>();
       Object.values(supplyPriceMap).forEach((entry) => {
         if (entry?.productName) {
           cachedNames.add(entry.productName);
         }
       });
       await Promise.all(
         Array.from(cachedNames).map((name) =>
           fetchSupplyPricesForProduct(name)
         )
       );
    } catch (err) {
      console.error("Failed to refresh pricing data:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    isRefreshing,
    fetchProductPrices,
    setIsRefreshing,
    supplyPriceMap,
    fetchSupplyPricesForProduct,
  ]);

  const handleToggleProductDetails = (product: ProductPricingRow) => {
    const nextId = expandedProductId === product.id ? null : product.id;
    setExpandedProductId(nextId);
    if (nextId === product.id) {
      const key = normalizeProductKey(product.sanPhamRaw);
      const currentState = supplyActions.supplyPriceMap[key];
      if (
        !currentState ||
        (!currentState.loading && currentState.items.length === 0)
      ) {
        supplyActions.fetchSupplyPricesForProduct(product.sanPhamRaw);
      }
    }
  };

  const pricingStats = useMemo<PricingStat[]>(() => {
    const total = productPrices.length;
    const activeCount = productPrices.filter((item) => item.isActive).length;
    const inactiveCount = total - activeCount;

    return [
      {
        name: "Tổng Sản Phẩm",
        value: total.toString(),
        icon: CurrencyDollarIcon,
        accent: "emerald",
        subtitle: "Tất cả sản phẩm",
        filterValue: "all",
      },
      {
        name: "Đang Hoạt Động",
        value: activeCount.toString(),
        icon: ArrowTrendingUpIcon,
        accent: "sky",
        subtitle: "Sẵn sàng bán",
        filterValue: "active",
      },
      {
        name: "Tạm Dừng",
        value: inactiveCount.toString(),
        icon: PencilIcon,
        accent: "violet",
        subtitle: "Đang ẩn trên bảng giá",
        filterValue: "inactive",
      },
    ];
  }, [productPrices]);

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalRows,
    filteredPricing,
    pricingStats,
    isLoading,
    error,
    isRefreshing,
    expandedProductId,
    supplyPriceMap: supplyPriceMap,
    editingSupplyRows: supplyActions.editingSupplyRows,
    supplyPriceDrafts: supplyActions.supplyPriceDrafts,
    savingSupplyRows: supplyActions.savingSupplyRows,
    newSupplyRows: supplyActions.newSupplyRows,
    editingProductId: productActions.editingProductId,
    productEditForm: productActions.productEditForm,
    productEditError: productActions.productEditError,
    isSavingProductEdit: productActions.isSavingProductEdit,
    isCreateModalOpen: productActions.isCreateModalOpen,
    createForm: productActions.createForm,
    createSuppliers: productActions.createSuppliers,
    createError: productActions.createError,
    isSubmittingCreate: productActions.isSubmittingCreate,
    productNameOptions: productActions.productNameOptions,
    productPackageOptionsByName: productActions.productPackageOptionsByName,
    supplierOptions: productActions.supplierOptions,
    isLoadingSuppliers: productActions.isLoadingSuppliers,
    bankOptions: productActions.bankOptions,
    isLoadingBanks: productActions.isLoadingBanks,
    statusOverrides,
    updatedTimestampMap,
    deleteProductState: productActions.deleteProductState,
    handleRefreshAll,
    handleToggleProductDetails,
    handleStartEditingSupply: supplyActions.handleStartEditingSupply,
    handleSupplyInputChange: supplyActions.handleSupplyInputChange,
    handleCancelSupplyEditing: supplyActions.handleCancelSupplyEditing,
    handleConfirmSupplyEditing: supplyActions.handleConfirmSupplyEditing,
    handleStartAddSupplierRow: supplyActions.handleStartAddSupplierRow,
    handleNewSupplierInputChange: supplyActions.handleNewSupplierInputChange,
    handleCancelAddSupplierRow: supplyActions.handleCancelAddSupplierRow,
    handleConfirmAddSupplierRow: supplyActions.handleConfirmAddSupplierRow,
    handleDeleteSupplyRow: supplyActions.handleDeleteSupplyRow,
    handleStartProductEdit: productActions.handleStartProductEdit,
    handleProductEditChange: productActions.handleProductEditChange,
    handleCancelProductEdit: productActions.handleCancelProductEdit,
    handleSubmitProductEdit: productActions.handleSubmitProductEdit,
    handleRequestDeleteProduct: productActions.handleRequestDeleteProduct,
    confirmDeleteProduct: productActions.confirmDeleteProduct,
    closeDeleteProductModal: productActions.closeDeleteProductModal,
    handleOpenCreateModal: productActions.handleOpenCreateModal,
    handleCloseCreateModal: productActions.handleCloseCreateModal,
    handleCreateFormChange: productActions.handleCreateFormChange,
    handleSupplierChange: productActions.handleSupplierChange,
    handleSupplierSelectChange: productActions.handleSupplierSelectChange,
    handleSupplierPriceInput: productActions.handleSupplierPriceInput,
    handleEnableCustomSupplier: productActions.handleEnableCustomSupplier,
    handleAddSupplierRow: productActions.handleAddSupplierRow,
    handleRemoveSupplierRow: productActions.handleRemoveSupplierRow,
    handleSubmitCreateProduct: productActions.handleSubmitCreateProduct,
    handleToggleStatus: productActions.handleToggleStatus,
    fetchSupplyPricesForProduct: supplyActions.fetchSupplyPricesForProduct,
  };
};
