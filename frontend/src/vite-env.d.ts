/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_BANK_ID?: string;
  readonly VITE_BANK_NAME?: string;
  readonly VITE_BANK_ACCOUNT_NO?: string;
  readonly VITE_BANK_ACCOUNT_NAME?: string;
  readonly VITE_ORDER_QR_ACCOUNT_NUMBER?: string;
  readonly VITE_ORDER_QR_BANK_CODE?: string;
  readonly VITE_ORDER_QR_BANK_NAME?: string;
  readonly VITE_ORDER_QR_BANK_BIN?: string;
  readonly VITE_ORDER_QR_ACCOUNT_NAME?: string;
  readonly VITE_ORDER_QR_NOTE_PREFIX?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
