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

const registerWarehouseSubscribers = () => {
  eventBus.on(EVENTS.WAREHOUSE_STOCK_CREATED, handleWarehouseStockCreated);
  eventBus.on(EVENTS.IMPORT_ORDER_CREATED, handleImportOrderCreated);
  logger.info('[WarehouseSubscriber] Đã khởi tạo và gắn Event WAREHOUSE_STOCK_CREATED, IMPORT_ORDER_CREATED');
};

module.exports = {
  registerWarehouseSubscribers,
  handleWarehouseStockCreated
};