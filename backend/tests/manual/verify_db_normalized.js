// e:\Project\admin_store\admin_orderlist\backend\tests\manual\verify_db_normalized.js
require('module-alias/register');
const { db } = require("@/db");
const logger = require("@/utils/logger");

async function main() {
  logger.info("Bắt đầu xác minh Database Normalization cho OTP Configs...");

  try {
    // 1. Kiểm tra cấu trúc bảng otp_configs
    const otpConfigsCols = await db('otp_configs').withSchema('system_automation').columnInfo();
    logger.info("Cấu trúc bảng system_automation.otp_configs:");
    console.log(Object.keys(otpConfigsCols));

    // 2. Kiểm tra schema columns của accounts_admin
    const accountsCols = await db('accounts_admin').withSchema('system_automation').columnInfo();
    logger.info("Cột otp_config_id trong system_automation.accounts_admin:");
    console.log({
      otp_config_id: accountsCols.otp_config_id,
      otp_source: accountsCols.otp_source, // Should be undefined if dropped
      mail_backup_id: accountsCols.mail_backup_id, // Should be undefined if dropped
      metadata: accountsCols.metadata // Should be undefined if dropped
    });

    // 3. Kiểm tra schema columns của order_user_tracking
    const trackingCols = await db('order_user_tracking').withSchema('system_automation').columnInfo();
    logger.info("Cột otp_config_id trong system_automation.order_user_tracking:");
    console.log({
      otp_config_id: trackingCols.otp_config_id,
      otp_source: trackingCols.otp_source, // Should be undefined if dropped
      metadata: trackingCols.metadata // Should be undefined if dropped
    });

    // 4. Test query join accounts_admin với otp_configs
    const accountsJoined = await db('system_automation.accounts_admin')
      .leftJoin('system_automation.otp_configs', 'otp_configs.id', 'accounts_admin.otp_config_id')
      .select('accounts_admin.id', 'accounts_admin.email', 'otp_configs.otp_source', 'otp_configs.yuna_order_code')
      .limit(5);
    logger.info("Accounts joined with otp_configs (Top 5):");
    console.log(accountsJoined);

    // 5. Test query join order_user_tracking với otp_configs
    const trackingJoined = await db('system_automation.order_user_tracking')
      .leftJoin('system_automation.otp_configs', 'otp_configs.id', 'order_user_tracking.otp_config_id')
      .select('order_user_tracking.order_id', 'order_user_tracking.account', 'otp_configs.otp_source', 'otp_configs.yuna_order_code')
      .limit(5);
    logger.info("Tracking rows joined with otp_configs (Top 5):");
    console.log(trackingJoined);

    logger.info("Xác minh hoàn tất thành công!");
  } catch (error) {
    logger.error("Lỗi trong quá trình xác minh:", error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

main();
