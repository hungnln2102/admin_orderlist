const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");
const logger = require("@/utils/logger");

const handleWarehouseStockCreated = async (payload) => {
  const { stockId, account, services } = payload;
  logger.info(`[WarehouseSubscriber] Bắt được sự kiện WAREHOUSE_STOCK_CREATED cho tài khoản: ${account}`);

  try {
    // TODO: Viết logic Lắp ráp (Auto-Assembly) vào bảng package_product ở đây
    
    logger.info(`[WarehouseSubscriber] Đã hoàn thành quá trình xử lý lắp ráp (nếu có) cho stockId: ${stockId}`);
  } catch (error) {
    logger.error(`[WarehouseSubscriber] Lỗi khi xử lý lắp ráp sự kiện WAREHOUSE_STOCK_CREATED`, {
      stockId,
      error: error.message,
      stack: error.stack
    });
  }
};

const handleImportOrderCreated = async (orderData) => {
  const orderCode = orderData?.id_order || orderData?.idOrder || 'N/A';
  logger.info(`[WarehouseSubscriber] Bắt được sự kiện IMPORT_ORDER_CREATED cho đơn nhập: ${orderCode}`);

  try {
    // Luồng tự động tạo Kho Hàng & Gói Sản Phẩm hiện tại đang được xử lý song song 
    // qua API createImportPackage gọi từ frontend khi tạo đơn.
    // Để tránh duplicate, ta không gọi lại logic thao tác DB ở đây nữa.
    logger.info(`[WarehouseSubscriber] Đã uỷ quyền xử lý Kho Hàng cho module import-packages API.`);
  } catch (error) {
    logger.error(`[WarehouseSubscriber] Lỗi khi xử lý sự kiện IMPORT_ORDER_CREATED`, {
      orderCode,
      error: error.message,
      stack: error.stack
    });
  }
};

const handleWarehouseStockUpdated = async (payload) => {
  const { stockId, account } = payload;
  logger.info(`[WarehouseSubscriber] Bắt được sự kiện WAREHOUSE_STOCK_UPDATED cho tài khoản: ${account}`, { source: 'warehouse', stockId });
};

const handleWarehouseStockDeleted = async (payload) => {
  const { stockId } = payload;
  logger.info(`[WarehouseSubscriber] Bắt được sự kiện WAREHOUSE_STOCK_DELETED cho stockId: ${stockId}`, { source: 'warehouse', stockId });
};

const handleProductNameCreated = async (payload) => {
  const { id, name } = payload || {};
  logger.info(`[WarehouseSubscriber] Bắt được sự kiện PRODUCT_NAME_CREATED: ${name} (ID: ${id})`, { source: 'warehouse', id, name });
};

const handleProductNameUpdated = async (payload) => {
  const { id, name } = payload || {};
  logger.info(`[WarehouseSubscriber] Bắt được sự kiện PRODUCT_NAME_UPDATED: ${name} (ID: ${id})`, { source: 'warehouse', id, name });
};

const handleProductNameDeleted = async (payload) => {
  const { id } = payload || {};
  logger.info(`[WarehouseSubscriber] Bắt được sự kiện PRODUCT_NAME_DELETED (ID: ${id})`, { source: 'warehouse', id });
};

const handlePackageProductCreated = async (payload) => {
  const { id, package_id } = payload || {};
  logger.info(`[WarehouseSubscriber] Bắt được sự kiện PACKAGE_PRODUCT_CREATED: Package ID ${package_id} (ID: ${id})`, { source: 'package_product', id, package_id });
};

const handlePackageProductUpdated = async (payload) => {
  const { packageId, updatedData } = payload || {};
  logger.info(`[WarehouseSubscriber] Bắt được sự kiện PACKAGE_PRODUCT_UPDATED (ID: ${packageId})`, { source: 'package_product', packageId, updatedData });
};

const handlePackageProductDeleted = async (payload) => {
  const { packageId } = payload || {};
  logger.info(`[WarehouseSubscriber] Bắt được sự kiện PACKAGE_PRODUCT_DELETED (ID: ${packageId})`, { source: 'package_product', packageId });
};

const registerWarehouseSubscribers = () => {
  eventBus.on(EVENTS.WAREHOUSE_STOCK_CREATED, handleWarehouseStockCreated);
  eventBus.on(EVENTS.WAREHOUSE_STOCK_UPDATED, handleWarehouseStockUpdated);
  eventBus.on(EVENTS.WAREHOUSE_STOCK_DELETED, handleWarehouseStockDeleted);
  
  eventBus.on(EVENTS.PRODUCT_NAME_CREATED, handleProductNameCreated);
  eventBus.on(EVENTS.PRODUCT_NAME_UPDATED, handleProductNameUpdated);
  eventBus.on(EVENTS.PRODUCT_NAME_DELETED, handleProductNameDeleted);
  
  eventBus.on(EVENTS.PACKAGE_PRODUCT_CREATED, handlePackageProductCreated);
  eventBus.on(EVENTS.PACKAGE_PRODUCT_UPDATED, handlePackageProductUpdated);
  eventBus.on(EVENTS.PACKAGE_PRODUCT_DELETED, handlePackageProductDeleted);
  
  eventBus.on(EVENTS.IMPORT_ORDER_CREATED, handleImportOrderCreated);
  logger.info('[WarehouseSubscriber] Đã khởi tạo và gắn các Event cho Warehouse, Danh mục kho & Gói sản phẩm');
};

module.exports = {
  registerWarehouseSubscribers,
  handleWarehouseStockCreated
};