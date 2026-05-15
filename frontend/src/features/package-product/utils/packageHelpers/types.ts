export type PackageField =
  | "supplier"
  | "import"
  /** Kho / tài khoản kích hoạt + dung lượng trên form thêm-sua goi */
  | "activation";

export type SlotLinkMode = "information" | "slot";

export type PackageRow = {
  id: number;
  productId?: number | null;
  package: string;
  information: string | null;
  informationUser?: string | null;
  informationPass?: string | null;
  informationMail?: string | null;
  informationTwoFa?: string | null;
  informationNote?: string | null;
  note: string | null;
  storageId?: number | null;
  storageTotal?: number | null;
  accountUser?: string | null;
  accountPass?: string | null;
  accountMail?: string | null;
  accountTwoFa?: string | null;
  accountNote?: string | null;
  supplier: string | null;
  import: number | string | null;
  expired: string | null;
  capacityUsed?: string | number | null;
  slot?: string | number | null;
  slotUsed?: string | number | null;
  slotLinkMode?: SlotLinkMode;
  hasCapacityField?: boolean;
  match?: string | null;
  productCodes?: string[] | null;
  normalizedProductCodes?: string[];
  matchModeValue?: string | null;
  stockId?: number | null;
  /** Tu product.package_requires_activation (JOIN API package-products). */
  productRequiresActivation?: boolean;
};

export type OrderListItem = {
  id?: number | string | null;
  id_order?: string | number | null;
  id_product?: string | null;
  information_order?: string | null;
  slot?: string | null;
  customer?: string | null;
  [key: string]: unknown;
};

export type PackageSlotAssignment = {
  slotLabel: string;
  matchValue?: string | null;
  sourceOrderId?: number | string | null;
  sourceOrderCode?: string | number | null;
  sourceOrderStartYmd?: string | null;
  /** Gia tri cot thong tin doi nghia voi che do match: hien thi tren the vi tri. */
  displayColumn: "slot" | "information";
  matchColumn: "slot" | "information";
  capacityUnits?: number | null;
  /** Ten/dinh danh khach tu don (customer) khi da gan. */
  customerLabel?: string | null;
};

export type AugmentedRow = PackageRow & {
  slotUsed: number;
  slotLimit: number;
  remainingSlots: number;
  capacityLimit: number;
  capacityUsed: number;
  remainingCapacity: number;
  slotAssignments: PackageSlotAssignment[];
  matchedOrders: OrderListItem[];
  packageCode: string;
  hasCapacityField: boolean;
  productCodes: string[];
  normalizedProductCodes: string[];
  matchModeValue?: string | null;
};

export type NormalizedOrderRecord = {
  base: OrderListItem;
  productKey: string;
  productLettersKey: string;
  infoKey: string;
  infoLettersKey: string;
  slotDisplay: string;
  slotKey: string;
  slotMatchKey: string;
  informationDisplay: string;
  informationKey: string;
  informationMatchKey: string;
  customerDisplay: string;
  productCodeNormalized: string;
  registrationDateYmd?: string | null;
  /** product.id tu variant; khop voi packageRow.productId de gan don cung dong san pham. */
  lineProductId: number | null;
};

export type PackageTemplate = {
  name: string;
  productId?: number | null;
  fields: PackageField[];
  isCustom?: boolean;
};

export type ManualWarehouseEntry = {
  product_type: string;
  account: string;
  password: string;
  backup_email: string;
  two_fa: string;
  note: string;
  /** DD/MM/YYYY - luu vao kho `expires_at`, hien thi tren goi */
  expires_at: string;
};

export type PackageFormValues = {
  supplier: string;
  import: string;
  slot: string;
  slotLinkMode: SlotLinkMode;
  stockId: number | null;
  storageId: number | null;
  storageTotal: string;
  manualStock: ManualWarehouseEntry;
  manualStorage: ManualWarehouseEntry;
};

export type AccountInfo = {
  account?: string | null;
  password?: string | null;
  backup_email?: string | null;
  two_fa?: string | null;
  note?: string | null;
  expires_at?: string | null;
};

export type EditContext = {
  rowId: number;
  template: PackageTemplate;
  initialValues: PackageFormValues;
  stockInfo?: AccountInfo | null;
  storageInfo?: AccountInfo | null;
};

export type AvailabilityState = "ok" | "low" | "out";
export type SlotLinkPreferenceMap = Record<string, SlotLinkMode>;
export type StatusFilter = "all" | "full" | "low" | "out";
