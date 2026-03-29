const FORM_DESC_SCHEMA = {
  FORM_NAME: {
    TABLE: "form_name",
    COLS: {
      ID: "id",
      NAME: "name",
      DESCRIPTION: "description",
      CREATED_AT: "created_at",
      UPDATED_AT: "updated_at",
    },
  },
  FORM_INPUT: {
    TABLE: "form_input",
    COLS: {
      ID: "id",
      FORM_ID: "form_id",
      INPUT_ID: "input_id",
      SORT_ORDER: "sort_order",
    },
  },
  INPUTS: {
    TABLE: "inputs",
    COLS: {
      ID: "id",
      INPUT_NAME: "input_name",
      INPUT_TYPE: "input_type",
      CREATED_AT: "created_at",
    },
  },
};

const IDENTITY_SCHEMA = {
  ACCOUNTS: {
    TABLE: "accounts",
    COLS: {
      ID: "id",
      EMAIL: "email",
      PASSWORD_HASH: "password_hash",
      IS_ACTIVE: "is_active",
      CREATED_AT: "created_at",
      USERNAME: "username",
      SUSPENDED_UNTIL: "suspended_until",
      BAN_REASON: "ban_reason",
      UPDATED_AT: "updated_at",
      ROLE_ID: "role_id",
      MAIL_BACKUP_ID: "mail_backup_id",
    },
  },
  MAIL_BACKUP: {
    TABLE: "mail_backup",
    COLS: {
      ID: "id",
      EMAIL: "email",
      APP_PASSWORD: "app_password",
      NOTE: "note",
      PROVIDER: "provider",
      IS_ACTIVE: "is_active",
      CREATED_AT: "created_at",
      UPDATED_AT: "updated_at",
      ALIAS_PREFIX: "alias_prefix",
    },
  },
  ROLES: {
    TABLE: "roles",
    COLS: {
      ID: "id",
      CODE: "code",
      NAME: "name",
    },
  },
  CUSTOMER_PROFILES: {
    TABLE: "customer_profiles",
    COLS: {
      ID: "id",
      ACCOUNT_ID: "account_id",
      FIRST_NAME: "first_name",
      LAST_NAME: "last_name",
      DATE_OF_BIRTH: "date_of_birth",
      CREATED_AT: "created_at",
      UPDATED_AT: "updated_at",
      TIER_ID: "tier_id",
    },
  },
};

const COMMON_SCHEMA = {
  STATUS: {
    TABLE: "status",
    COLS: {
      CODE: "code",
      LABEL_VI: "label_vi",
      LABEL_EN: "label_en",
      DESCRIPTION: "description",
      SORT_ORDER: "sort_order",
      IS_ACTIVE: "is_active",
    },
  },
};

module.exports = {
  FORM_DESC_SCHEMA,
  IDENTITY_SCHEMA,
  COMMON_SCHEMA,
};
