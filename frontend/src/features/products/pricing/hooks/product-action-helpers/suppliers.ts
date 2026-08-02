import type {
  BankOption,
  CreateSupplierEntry,
  SupplierOption,
} from "../../types";

export function normalizeBankOptions(payload: unknown): BankOption[] {
  return Array.isArray(payload)
    ? payload
        .map((row) => {
          const item =
            row && typeof row === "object" ? (row as Record<string, unknown>) : {};
          return {
            bin: String(item.bin ?? "").trim(),
            name: String(item.bank_name ?? item.name ?? "").trim(),
          };
        })
        .filter((item) => item.bin && item.name)
    : [];
}

export function normalizeSupplierOptions(payload: unknown): SupplierOption[] {
  const payloadObject =
    payload && typeof payload === "object"
      ? (payload as { items?: unknown[] })
      : undefined;
  const items = Array.isArray(payloadObject?.items)
    ? payloadObject.items
    : Array.isArray(payload)
      ? payload
      : [];

  const normalized = items
    .map((item) => {
      const row =
        item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const idRaw = row.id ?? row.sourceId ?? row.source_id;
      const idValue =
        typeof idRaw === "number" && Number.isFinite(idRaw)
          ? idRaw
          : Number.isFinite(Number(idRaw))
            ? Number(idRaw)
            : null;
      const name =
        row.supplier_name ??
        row.source_name ??
        row.name ??
        row.sourceName ??
        row.source ??
        "";

      return {
        id: idValue ?? null,
        name: String(name || "").trim(),
        numberBank: String(row.number_bank ?? row.numberBank ?? row.bankNumber ?? ""),
        binBank: String(row.bin_bank ?? row.binBank ?? row.bankBin ?? ""),
      } as SupplierOption;
    })
    .filter((option: SupplierOption) => option.name.length > 0);

  const deduped: SupplierOption[] = [];
  const seen = new Set<string>();

  for (const option of normalized) {
    const key =
      option.id !== null
        ? `id:${option.id}`
        : `name:${option.name.toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(option);
  }

  return deduped;
}

export function updateCreateSupplierEntry(
  entry: CreateSupplierEntry,
  field: keyof Omit<CreateSupplierEntry, "id">,
  value: string
): CreateSupplierEntry {
  return {
    ...entry,
    [field]:
      field === "sourceId"
        ? value
          ? Number(value) || null
          : null
        : field === "useCustomName"
          ? value === "true"
          : value,
  };
}

export function applySelectedSupplierToEntry(
  entry: CreateSupplierEntry,
  selected: SupplierOption | null
): CreateSupplierEntry {
  return {
    ...entry,
    sourceId: selected?.id ?? null,
    sourceName: selected?.name ?? "",
    numberBank: selected?.numberBank ?? "",
    bankBin: selected?.binBank ?? "",
    useCustomName: false,
  };
}

export function enableCustomSupplierEntry(
  entry: CreateSupplierEntry
): CreateSupplierEntry {
  return {
    ...entry,
    sourceId: null,
    sourceName: "",
    numberBank: "",
    bankBin: "",
    useCustomName: true,
  };
}
