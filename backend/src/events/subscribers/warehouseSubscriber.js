const eventBus = require("@/events/eventBus");
const EVENTS = require("@/events/eventTypes");
const logger = require("@/utils/logger");

const handleWarehouseStockCreated = async (payload) => {
  const { stockId, account, _services } = payload;
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

    // Đồng bộ ngày hết hạn kho hàng nếu tài khoản đã tồn tại sẵn
    const { syncStockExpiryForAccountAndPackage, resolvePackageIdFromOrderProduct } = require("@/services/mavnRenewalStockExpirySync");
    const { db } = require("@/db");
    const packageId = await resolvePackageIdFromOrderProduct(db, orderData?.id_product || orderData?.idProduct);
    if (packageId && orderData?.information_order) {
      await syncStockExpiryForAccountAndPackage(db, packageId, orderData.information_order);
    }
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

const handleOrderUpdated = async (payload) => {
  const order = payload?.order;
  if (!order) return;
  const { isMavnImportOrder } = require("@/utils/orderHelpers");
  if (!isMavnImportOrder(order)) return;

  const orderCode = order?.id_order || order?.idOrder || 'N/A';
  logger.info(`[WarehouseSubscriber] Bắt được sự kiện ORDER_UPDATED cho đơn nhập MAVN: ${orderCode}`);

  const { syncStockExpiryForAccountAndPackage, resolvePackageIdFromOrderProduct } = require("@/services/mavnRenewalStockExpirySync");
  const { db } = require("@/db");

  try {
    // Đồng bộ giá trị hiện tại (mới)
    const packageId = await resolvePackageIdFromOrderProduct(db, order.id_product);
    if (packageId && order.information_order) {
      await syncStockExpiryForAccountAndPackage(db, packageId, order.information_order);
    }

    // Nếu thông tin cũ khác mới, đồng bộ lại thông tin cũ để cập nhật/xóa ngày hết hạn của kho cũ
    const before = payload.before;
    if (before) {
      const oldInfo = before.information_order;
      const oldProduct = before.id_product;
      if (oldInfo && oldProduct && (oldInfo !== order.information_order || oldProduct !== order.id_product)) {
        const oldPackageId = await resolvePackageIdFromOrderProduct(db, oldProduct);
        if (oldPackageId) {
          await syncStockExpiryForAccountAndPackage(db, oldPackageId, oldInfo);
        }
      }
    }
  } catch (error) {
    logger.error(`[WarehouseSubscriber] Lỗi khi xử lý sự kiện ORDER_UPDATED cho đơn nhập MAVN`, {
      orderCode,
      error: error.message,
      stack: error.stack
    });
  }
};

const handleOrderDeleted = async (payload) => {
  const order = payload?.order;
  if (!order) return;
  const { isMavnImportOrder } = require("@/utils/orderHelpers");
  if (!isMavnImportOrder(order)) return;

  const orderCode = order?.id_order || order?.idOrder || 'N/A';
  logger.info(`[WarehouseSubscriber] Bắt được sự kiện ORDER_DELETED cho đơn nhập MAVN: ${orderCode}`);

  const { syncStockExpiryForAccountAndPackage, resolvePackageIdFromOrderProduct } = require("@/services/mavnRenewalStockExpirySync");
  const { db } = require("@/db");

  try {
    const packageId = await resolvePackageIdFromOrderProduct(db, order.id_product);
    if (packageId && order.information_order) {
      await syncStockExpiryForAccountAndPackage(db, packageId, order.information_order);
    }
  } catch (error) {
    logger.error(`[WarehouseSubscriber] Lỗi khi xử lý sự kiện ORDER_DELETED cho đơn nhập MAVN`, {
      orderCode,
      error: error.message,
      stack: error.stack
    });
  }
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
  eventBus.on(EVENTS.ORDER_UPDATED, handleOrderUpdated);
  eventBus.on(EVENTS.ORDER_DELETED, handleOrderDeleted);
  logger.info('[WarehouseSubscriber] Đã khởi tạo và gắn các Event cho Warehouse, Danh mục kho & Gói sản phẩm');
};

module.exports = {
  registerWarehouseSubscribers,
  handleWarehouseStockCreated
};