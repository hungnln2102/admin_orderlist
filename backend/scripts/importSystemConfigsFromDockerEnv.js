/**
 * importSystemConfigsFromDockerEnv.js
 * 
 * Đọc toàn bộ cấu hình vận hành từ .env.docker và nạp (upsert) vào:
 * 1. system_automation.system_configs (Telegram, Google Drive Backup, Sepay, Automation, General)
 * 2. finance.financial_accounts (Tài khoản ngân hàng thụ hưởng VPBank chính của shop)
 */

require('dotenv').config();
require('module-alias/register');

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { db, TABLES } = require('@/db');

function parseEnvDocker() {
  const envDockerPath = path.resolve(__dirname, '../.env.docker');
  if (!fs.existsSync(envDockerPath)) {
    throw new Error(`File ${envDockerPath} không tồn tại!`);
  }
  const content = fs.readFileSync(envDockerPath, 'utf8');
  return dotenv.parse(content);
}

async function syncSystemConfigs(trx, envDocker) {
  console.log('⚙️ [System Configs] Đang chuẩn bị danh mục cấu hình từ .env.docker...');

  const configDefinitions = [
    // --- 1. TELEGRAM NOTIFICATIONS (NOTIFY) ---
    {
      key: 'TELEGRAM_ENABLED',
      val: 'true',
      type: 'BOOLEAN',
      desc: 'Bật/tắt toàn bộ dịch vụ thông báo Telegram',
      group: 'NOTIFY',
    },
    {
      key: 'TELEGRAM_BOT_TOKEN',
      val: envDocker.TELEGRAM_BOT_TOKEN || '',
      type: 'STRING',
      desc: 'Telegram Bot API Token (HTTP API)',
      group: 'NOTIFY',
    },
    {
      key: 'TELEGRAM_CHAT_ID',
      val: envDocker.TELEGRAM_CHAT_ID || '',
      type: 'STRING',
      desc: 'Telegram Group / Chat ID nhận thông báo',
      group: 'NOTIFY',
    },
    {
      key: 'TELEGRAM_ORDER_TOPIC_ID',
      val: envDocker.TELEGRAM_ORDER_TOPIC_ID || envDocker.ORDER_NOTIFICATION_TOPIC_ID || envDocker.ORDER_TOPIC_ID || '1',
      type: 'STRING',
      desc: 'Topic ID nhận thông báo Đơn Hàng Mới',
      group: 'NOTIFY',
    },
    {
      key: 'TELEGRAM_RENEWAL_TOPIC_ID',
      val: envDocker.RENEWAL_TOPIC_ID || '2',
      type: 'STRING',
      desc: 'Topic ID nhận thông báo Cần Gia Hạn / Hết Hạn',
      group: 'NOTIFY',
    },
    {
      key: 'TELEGRAM_FINANCE_TOPIC_ID',
      val: envDocker.TELEGRAM_FINANCE_TOPIC_ID || '7009',
      type: 'STRING',
      desc: 'Topic ID nhận thông báo Biến Động Tài Chính (Sepay, Chuyển tiền)',
      group: 'NOTIFY',
    },
    {
      key: 'TELEGRAM_SYSTEM_ALERT_TOPIC_ID',
      val: envDocker.ERROR_TOPIC_ID || '6',
      type: 'STRING',
      desc: 'Topic ID nhận cảnh báo Lỗi Hệ Thống khẩn cấp',
      group: 'NOTIFY',
    },
    {
      key: 'ZERO_DAYS_TOPIC_ID',
      val: envDocker.ZERO_DAYS_TOPIC_ID || '2563',
      type: 'STRING',
      desc: 'Topic ID thông báo đơn hàng hết hạn hôm nay (0 ngày)',
      group: 'NOTIFY',
    },
    {
      key: 'FOUR_DAYS_TOPIC_ID',
      val: envDocker.FOUR_DAYS_TOPIC_ID || '12',
      type: 'STRING',
      desc: 'Topic ID nhắc nhở chăm sóc khách hàng đơn cận hạn 4 ngày',
      group: 'NOTIFY',
    },
    {
      key: 'SEND_ORDER_NOTIFICATION',
      val: envDocker.SEND_ORDER_NOTIFICATION ?? 'true',
      type: 'BOOLEAN',
      desc: 'Bật/tắt thông báo đơn hàng mới',
      group: 'NOTIFY',
    },
    {
      key: 'SEND_ERROR_NOTIFICATION',
      val: envDocker.SEND_ERROR_NOTIFICATION ?? 'true',
      type: 'BOOLEAN',
      desc: 'Bật/tắt thông báo lỗi hệ thống',
      group: 'NOTIFY',
    },
    {
      key: 'SEND_ORDER_TO_TOPIC',
      val: envDocker.SEND_ORDER_TO_TOPIC ?? 'true',
      type: 'BOOLEAN',
      desc: 'Bật/tắt gửi đơn hàng vào Topic riêng biệt',
      group: 'NOTIFY',
    },
    {
      key: 'SEND_RENEWAL_TO_TOPIC',
      val: envDocker.SEND_RENEWAL_TO_TOPIC ?? 'true',
      type: 'BOOLEAN',
      desc: 'Bật/tắt gửi cảnh báo gia hạn vào Topic riêng',
      group: 'NOTIFY',
    },
    {
      key: 'SEND_ORDER_COPY_BUTTONS',
      val: envDocker.SEND_ORDER_COPY_BUTTONS ?? 'true',
      type: 'BOOLEAN',
      desc: 'Bật/tắt nút bấm copy thông tin đơn hàng trên Telegram',
      group: 'NOTIFY',
    },

    // --- 2. BACKUP & GOOGLE DRIVE (BACKUP) ---
    {
      key: 'ENABLE_DB_BACKUP',
      val: envDocker.ENABLE_DB_BACKUP ?? 'true',
      type: 'BOOLEAN',
      desc: 'Bật/tắt tự động sao lưu Database định kỳ lên Google Drive',
      group: 'BACKUP',
    },
    {
      key: 'GOOGLE_DRIVE_FOLDER_ID',
      val: envDocker.GOOGLE_DRIVE_FOLDER_ID || '',
      type: 'STRING',
      desc: 'ID thư mục Google Drive lưu trữ các bản sao lưu Database',
      group: 'BACKUP',
    },
    {
      key: 'BACKUP_RETENTION_DAYS',
      val: envDocker.BACKUP_RETENTION_DAYS || '7',
      type: 'NUMBER',
      desc: 'Số ngày lưu giữ file backup trên Google Drive trước khi tự động xóa bản cũ',
      group: 'BACKUP',
    },
    {
      key: 'GOOGLE_DRIVE_OAUTH_CLIENT_ID',
      val: envDocker.GOOGLE_DRIVE_OAUTH_CLIENT_ID || '',
      type: 'STRING',
      desc: 'Google OAuth Client ID cho Google Drive API',
      group: 'BACKUP',
    },
    {
      key: 'GOOGLE_DRIVE_OAUTH_CLIENT_SECRET',
      val: envDocker.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET || '',
      type: 'STRING',
      desc: 'Google OAuth Client Secret cho Google Drive API',
      group: 'BACKUP',
    },
    {
      key: 'GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN',
      val: envDocker.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN || '',
      type: 'STRING',
      desc: 'Google OAuth Refresh Token vĩnh viễn dùng để upload backup tự động',
      group: 'BACKUP',
    },

    // --- 3. PAYMENT & SEPAY (PAYMENT & FINANCE) ---
    {
      key: 'SEPAY_API_KEY',
      val: envDocker.SEPAY_API_KEY || '',
      type: 'STRING',
      desc: 'API Key kết nối cổng Sepay',
      group: 'PAYMENT',
    },
    {
      key: 'SEPAY_WEBHOOK_SECRET',
      val: envDocker.SEPAY_WEBHOOK_SECRET || '',
      type: 'STRING',
      desc: 'Mã bí mật xác thực webhook Sepay',
      group: 'PAYMENT',
    },
    {
      key: 'WEBHOOK_URL',
      val: envDocker.WEBHOOK_URL || '',
      type: 'STRING',
      desc: 'URL nhận thông báo biến động số dư từ Sepay',
      group: 'PAYMENT',
    },
    {
      key: 'WEBHOOK_SECRET',
      val: envDocker.WEBHOOK_SECRET || '',
      type: 'STRING',
      desc: 'Chuỗi khóa bảo mật webhook nội bộ',
      group: 'PAYMENT',
    },
    {
      key: 'SEPAY_AUTO_MATCH',
      val: 'true',
      type: 'BOOLEAN',
      desc: 'Bật/tắt tính năng tự động khớp biên lai chuyển khoản ngân hàng',
      group: 'PAYMENT',
    },
    {
      key: 'USDT_EXCHANGE_RATE',
      val: '25400',
      type: 'NUMBER',
      desc: 'Tỷ giá quy đổi mặc định từ 1 USDT sang VND',
      group: 'FINANCE',
    },

    // --- 4. ORDER BUSINESS & RENEWAL (ORDER_BUSINESS) ---
    {
      key: 'RENEWAL_WARN_DAYS',
      val: '4',
      type: 'NUMBER',
      desc: 'Số ngày trước khi hết hạn để hệ thống gắn tag Cần Gia Hạn',
      group: 'ORDER_BUSINESS',
    },
    {
      key: 'RENEWAL_NOTIFICATION_TIME',
      val: '07:00',
      type: 'STRING',
      desc: 'Thời điểm trong ngày tự động gửi thông báo nhắc gia hạn đơn hàng',
      group: 'ORDER_BUSINESS',
    },

    // --- 5. AUTOMATION & WAREHOUSE (AUTOMATION & WAREHOUSE) ---
    {
      key: 'PLAYWRIGHT_HEADLESS',
      val: envDocker.PLAYWRIGHT_HEADLESS ?? 'true',
      type: 'BOOLEAN',
      desc: 'Chế độ chạy ẩn (headless) của trình duyệt Playwright mở kho',
      group: 'WAREHOUSE',
    },
    {
      key: 'ADOBE_OTP_MAIL_MAX_AGE_MINUTES',
      val: envDocker.ADOBE_OTP_MAIL_MAX_AGE_MINUTES || '0',
      type: 'NUMBER',
      desc: 'Thời gian sống tối đa (phút) của email OTP Adobe',
      group: 'AUTOMATION',
    },
    {
      key: 'RENEW_ADOBE_ENABLE_POST_CHECK_FIX',
      val: envDocker.RENEW_ADOBE_ENABLE_POST_CHECK_FIX ?? 'true',
      type: 'BOOLEAN',
      desc: 'Tự động kiểm tra và khắc phục sau khi gia hạn Adobe',
      group: 'AUTOMATION',
    },
    {
      key: 'RENEW_ADOBE_ENABLE_2330_CLEANUP',
      val: envDocker.RENEW_ADOBE_ENABLE_2330_CLEANUP ?? 'true',
      type: 'BOOLEAN',
      desc: 'Tự động dọn dẹp tài khoản sau 23:30',
      group: 'AUTOMATION',
    },
    {
      key: 'RENEW_ADOBE_ENABLE_2330_CHECK_BEFORE_CLEANUP',
      val: envDocker.RENEW_ADOBE_ENABLE_2330_CHECK_BEFORE_CLEANUP ?? 'true',
      type: 'BOOLEAN',
      desc: 'Kiểm tra trạng thái tài khoản trước khi thực hiện dọn dẹp 23:30',
      group: 'AUTOMATION',
    },
    {
      key: 'RENEW_ADOBE_INTERNAL_KEY',
      val: envDocker.RENEW_ADOBE_INTERNAL_KEY || '',
      type: 'STRING',
      desc: 'Khóa xác thực bảo mật API nội bộ dịch vụ Renew Adobe',
      group: 'AUTOMATION',
    },
    {
      key: 'WEBSITE_SEO_AUDIT_URL',
      val: envDocker.WEBSITE_SEO_AUDIT_URL || 'http://127.0.0.1:4000/api/seo/product-audit',
      type: 'STRING',
      desc: 'URL kiểm toán SEO sản phẩm tự động',
      group: 'GENERAL',
    },
    {
      key: 'APP_TIMEZONE',
      val: envDocker.APP_TIMEZONE || 'Asia/Ho_Chi_Minh',
      type: 'STRING',
      desc: 'Múi giờ vận hành hệ thống',
      group: 'GENERAL',
    },
  ];

  console.log(`📦 [System Configs] Đang nạp ${configDefinitions.length} cấu hình vào ${TABLES.SYSTEM_CONFIGS}...`);

  for (const cfg of configDefinitions) {
    await trx(TABLES.SYSTEM_CONFIGS)
      .insert({
        config_key: cfg.key,
        config_value: String(cfg.val),
        data_type: cfg.type,
        description: cfg.desc,
        group_name: cfg.group,
        updated_at: trx.fn.now(),
        updated_by: 'DOCKER_ENV_IMPORT',
      })
      .onConflict('config_key')
      .merge({
        config_value: String(cfg.val),
        data_type: cfg.type,
        description: cfg.desc,
        group_name: cfg.group,
        updated_at: trx.fn.now(),
        updated_by: 'DOCKER_ENV_IMPORT',
      });
  }

  console.log('✅ [System Configs] Đã nạp thành công 100% cấu hình hệ thống từ .env.docker.');
}

async function syncShopBankAccount(trx, envDocker) {
  console.log('🏦 [Bank Account] Đang cập nhật tài khoản ngân hàng thụ hưởng chính của shop...');

  const accountNumber = String(envDocker.ORDER_QR_ACCOUNT_NUMBER || '9183400998').trim();
  const bankCode = String(envDocker.ORDER_QR_BANK_CODE || 'VPB').trim();
  const accountHolder = String(envDocker.ORDER_QR_ACCOUNT_NAME || 'NGO LE NGOC HUNG').trim();
  const notePrefix = String(envDocker.ORDER_QR_NOTE_PREFIX || 'Thanh toan').trim();

  // Đặt các tài khoản khác thành is_default = false
  await trx(TABLES.SHOP_BANK_ACCOUNTS)
    .where('account_type', 'bank')
    .update({ is_default: false });

  // Kiểm tra xem số tài khoản này đã có trong DB chưa
  const existing = await trx(TABLES.SHOP_BANK_ACCOUNTS)
    .where({ account_number: accountNumber })
    .first();

  if (existing) {
    await trx(TABLES.SHOP_BANK_ACCOUNTS)
      .where({ id: existing.id })
      .update({
        label: `VPBank - ${accountHolder}`,
        account_holder: accountHolder,
        bank_short_code: bankCode,
        bank_display_name: 'VPBank (Ngân hàng TMCP Việt Nam Thịnh Vượng)',
        qr_note_prefix: notePrefix,
        account_scope: 'SHOP',
        is_default: true,
        is_active: true,
        is_deleted: false,
        updated_at: trx.fn.now(),
      });
    console.log(`✅ [Bank Account] Đã cập nhật tài khoản VPBank #${existing.id} (${accountNumber}) thành tài khoản mặc định.`);
  } else {
    const [inserted] = await trx(TABLES.SHOP_BANK_ACCOUNTS)
      .insert({
        account_type: 'bank',
        label: `VPBank - ${accountHolder}`,
        account_number: accountNumber,
        account_holder: accountHolder,
        bank_short_code: bankCode,
        bank_display_name: 'VPBank (Ngân hàng TMCP Việt Nam Thịnh Vượng)',
        qr_note_prefix: notePrefix,
        account_scope: 'SHOP',
        is_default: true,
        balance: 10000000,
        is_active: true,
        is_deleted: false,
        created_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      })
      .returning('*');
    console.log(`✨ [Bank Account] Đã tạo mới tài khoản VPBank #${inserted.id} (${accountNumber}) làm tài khoản mặc định.`);
  }
}

async function main() {
  console.log('========================================================================');
  console.log('🚀 IMPORT SYSTEM CONFIGURATIONS FROM .env.docker INTO mydtbmav');
  console.log('========================================================================\n');

  const envDocker = parseEnvDocker();
  console.log('📄 Đã đọc thành công file .env.docker.');

  await db.transaction(async (trx) => {
    await syncSystemConfigs(trx, envDocker);
    await syncShopBankAccount(trx, envDocker);
  });

  console.log('\n========================================================================');
  console.log('🎉 TOÀN BỘ CẤU HÌNH HỆ THỐNG ĐÃ ĐƯỢC NẠP THÀNH CÔNG VÀO DATABASE!');
  console.log('========================================================================\n');
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Lỗi khi import cấu hình hệ thống:', err);
      process.exit(1);
    });
}

module.exports = {
  parseEnvDocker,
  syncSystemConfigs,
  syncShopBankAccount,
};
