const RENEW_ADOBE_SCHEMA = {
  ACCOUNT: {
    TABLE: "accounts_admin",
    COLS: {
      ID: "id",
      EMAIL: "email",
      PASSWORD_ENC: "password_encrypted",
      ORG_NAME: "org_name",
      LICENSE_STATUS: "license_status",
      /** Số slot license (contract cap) */
      USER_COUNT: "user_count",
      ALERT_CONFIG: "cookie_config",
      OTP_SOURCE: "otp_source",
      LAST_CHECKED: "last_checked_at",
      IS_ACTIVE: "is_active",
      CREATED_AT: "created_at",
      MAIL_BACKUP_ID: "mail_backup_id",
      URL_ACCESS: "access_url",
      /** Adobe product id (CCP) lấy sau check; có thể nhiều id cách nhau bởi dấu phẩy */
      ID_PRODUCT: "id_product",
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
  SYSTEM_EVENT_LOGS: {
    TABLE: "system_event_logs",
    COLS: {
      ID: "id",
      LOG_TYPE: "log_type",
      LEVEL: "level",
      ACTION: "action",
      ENTITY: "entity",
      ENTITY_ID: "entity_id",
      MESSAGE: "message",
      ACTOR_ID: "actor_id",
      ACTOR_NAME: "actor_name",
      SOURCE: "source",
      REQUEST_METHOD: "request_method",
      REQUEST_PATH: "request_path",
      IP_ADDRESS: "ip_address",
      USER_AGENT: "user_agent",
      METADATA: "metadata",
      CREATED_AT: "created_at",
    },
  },
  ORDER_USER_TRACKING: {
    TABLE: "order_user_tracking",
    COLS: {
      ID: "id",
      ORDER_ID: "order_id",
      CUSTOMER: "customer",
      ACCOUNT: "account",
      ORG_NAME: "org_name",
      EXPIRED: "expired",
      STATUS: "status",
      UPDATED_AT: "update_at",
      ID_PRODUCT: "id_product",
      /** Hệ thống fix tương ứng (renew_adobe, fix_adobe_edu, ...). Default 'renew_adobe'. */
      SYSTEM_NOTE: "system_note",
      /** Nguồn OTP cho email user của đơn (imap, tinyhost, hdsd, ades). */
      OTP_SOURCE: "otp_source",
    },
  },
};

/** Domain key kích hoạt (Key active): dữ liệu nằm trong schema PostgreSQL `system_automation`
 * — `order_list_keys`, `systems`. Đây là bảng “key active” sau merge (078); không còn bảng trong schema DB `key_active`. */
const KEY_ACTIVE_SCHEMA = {
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
