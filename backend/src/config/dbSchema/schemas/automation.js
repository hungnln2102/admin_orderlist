const RENEW_ADOBE_SCHEMA = {
  ACCOUNT: {
    TABLE: "accounts_admin",
    COLS: {
      ID: "id",
      EMAIL: "email",
      PASSWORD_ENC: "password_encrypted",
      ORG_NAME: "org_name",
      LICENSE_STATUS: "license_status",
      USER_COUNT: "user_count",
      USERS_SNAPSHOT: "users_snapshot",
      ALERT_CONFIG: "cookie_config",
      OTP_SOURCE: "otp_source",
      LAST_CHECKED: "last_checked_at",
      IS_ACTIVE: "is_active",
      CREATED_AT: "created_at",
      MAIL_BACKUP_ID: "mail_backup_id",
      URL_ACCESS: "access_url",
    },
  },
  PRODUCT_SYSTEM: {
    TABLE: "product_system",
    COLS: {
      ID: "id",
      VARIANT_ID: "variant_id",
      SYSTEM_CODE: "system_code",
      CREATED_AT: "created_at",
    },
  },
  USER_ACCOUNT_MAPPING: {
    TABLE: "user_account_mapping",
    COLS: {
      ID: "id",
      USER_EMAIL: "user_email",
      ORDER_ID: "id_order",
      ADOBE_ACCOUNT_ID: "adobe_account_id",
      ASSIGNED_AT: "assigned_at",
      UPDATED_AT: "updated_at",
      PRODUCT: "product",
      URL_ACTIVE: "url_active",
    },
  },
};

const KEY_ACTIVE_SCHEMA = {
  ORDER_AUTO_KEYS: {
    TABLE: "order_auto_keys",
    COLS: {
      ORDER_CODE: "order_code",
      AUTO_KEY: "auto_key",
      CREATED_AT: "created_at",
      SYSTEM_CODE: "system_code",
    },
  },
  /** Key kích hoạt ánh xạ orders.order_list (FK order_list_id); expires_at đồng bộ expired_at. */
  ORDER_LIST_KEYS: {
    TABLE: "order_list_keys",
    COLS: {
      ID: "id",
      ORDER_LIST_ID: "order_list_id",
      ID_ORDER: "id_order",
      KEY_HASH: "key_hash",
      KEY_HINT: "key_hint",
      EXPIRES_AT: "expires_at",
      SYSTEM_CODE: "system_code",
      STATUS: "status",
      CREATED_AT: "created_at",
      UPDATED_AT: "updated_at",
    },
  },
  SYSTEMS: {
    TABLE: "systems",
    COLS: {
      SYSTEM_CODE: "system_code",
      SYSTEM_NAME: "system_name",
      CREATED_AT: "created_at",
    },
  },
};

module.exports = {
  RENEW_ADOBE_SCHEMA,
  KEY_ACTIVE_SCHEMA,
};
