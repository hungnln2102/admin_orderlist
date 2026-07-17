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
    const accountInfo = String(orderData?.information_order || "").trim();
    if (!accountInfo) {
      logger.warn(`[WarehouseSubscriber] Đơn ${orderCode} không có thông tin tài khoản (information_order), bỏ qua.`);
      return;
    }
    
    // Split the account info: usually format is "email|password|backup|2fa" or just "email"
    const parts = accountInfo.split("|").map(p => p.trim());
    const accountUsername = parts[0];
    const password = parts[1] || null;
    const backup_email = parts[2] || null;
    const two_fa = parts[3] || null;

    const display_name = orderData?.id_product || null;
    if (!display_name) {
      logger.warn(`[WarehouseSubscriber] Đơn ${orderCode} không có id_product (display_name), bỏ qua.`);
      return;
    }

    const { db } = require("@/db");
    const { getDefinition, PRODUCT_SCHEMA, SCHEMA_PRODUCT, tableName } = require("@/config/dbSchema");
    
    const warehouseDef = getDefinition("PRODUCT_STOCK", PRODUCT_SCHEMA);
    const stockCols = warehouseDef.columns;
    const warehouseTable = tableName(warehouseDef.tableName, SCHEMA_PRODUCT);

    const servicesDef = getDefinition("STOCK_SERVICES", PRODUCT_SCHEMA);
    const srvCols = servicesDef.columns;
    const servicesTable = tableName(servicesDef.tableName, SCHEMA_PRODUCT);

    const productTable = tableName("product", SCHEMA_PRODUCT);
    const variantTable = tableName("variant", SCHEMA_PRODUCT);

    await db.transaction(async (trx) => {
      // 1. Resolve product_id from variant display_name
      const variant = await trx(variantTable).select("product_id").where("display_name", display_name).first();
      let productId = null;
      if (variant) {
        productId = variant.product_id;
      } else {
        // Fallback or create new product? Usually import order selects an existing variant.
        const prod = await trx(productTable).select("id").whereRaw("TRIM(LOWER(package_name)) = ?", [display_name.toLowerCase()]).first();
        if (prod) {
          productId = prod.id;
        } else {
          const [insertedProd] = await trx(productTable).insert({
            package_name: display_name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).returning("id");
          productId = insertedProd.id !== undefined ? insertedProd.id : insertedProd;
        }
      }

      // 2. Check product_stocks
      let stockId = null;
      const existingStock = await trx(warehouseTable).select(stockCols.id).where(stockCols.accountUsername, accountUsername).first();
      
      const now = new Date().toISOString();

      if (existingStock) {
        stockId = existingStock[stockCols.id];
      } else {
        // Insert new stock
        const [insertedStock] = await trx(warehouseTable).insert({
          [stockCols.accountUsername]: accountUsername,
          [stockCols.status]: "Tồn",
          [stockCols.isVerified]: false,
          [stockCols.note]: `Tạo tự động từ đơn nhập ${orderCode}`,
          [stockCols.createdAt]: now,
          [stockCols.updatedAt]: now,
        }).returning("id");
        stockId = insertedStock.id !== undefined ? insertedStock.id : insertedStock;
      }

      // 3. Check stock_services
      const existingSrv = await trx(servicesTable)
        .where(srvCols.stockId, stockId)
        .andWhere("product_id", productId)
        .first();

      if (!existingSrv) {
        await trx(servicesTable).insert({
          [srvCols.stockId]: stockId,
          product_id: productId,
          [srvCols.passwordEncrypted]: password,
          [srvCols.backupEmail]: backup_email,
          [srvCols.twoFaEncrypted]: two_fa,
          [srvCols.expiresAt]: orderData.expired_at || null,
          [srvCols.status]: "Tồn",
          [srvCols.createdAt]: now,
          [srvCols.updatedAt]: now,
        });
        logger.info(`[WarehouseSubscriber] Đã tạo dịch vụ mới cho stockId: ${stockId}, productId: ${productId}`);
      } else {
        logger.info(`[WarehouseSubscriber] Dịch vụ (productId: ${productId}) đã tồn tại trong stockId: ${stockId}, bỏ qua tạo mới.`);
      }
    });
    
    logger.info(`[WarehouseSubscriber] Đã hoàn thành quá trình xử lý đơn nhập kho cho đơn: ${orderCode}`);
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