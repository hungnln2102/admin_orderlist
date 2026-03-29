const RENEW_ADOBE_SCHEMA = {
  ACCOUNT: {
    TABLE: "accounts_admin",
    COLS: {
      ID: "id",
      EMAIL: "email",
      PASSWORD_ENC: "password_enc",
      ORG_NAME: "org_name",
      LICENSE_STATUS: "license_status",
      USER_COUNT: "user_count",
      USERS_SNAPSHOT: "users_snapshot",
      ALERT_CONFIG: "alert_config",
      LAST_CHECKED: "last_checked",
      IS_ACTIVE: "is_active",
      CREATED_AT: "created_at",
      MAIL_BACKUP_ID: "mail_backup_id",
      URL_ACCESS: "url_access",
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
