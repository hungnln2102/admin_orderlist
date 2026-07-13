import { apiGet, apiPost, apiPut } from "./api";
import { apiFetch } from "./api";

export interface FormNameDto {
  id: number;
  name: string | null;
  description: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface FormInputDto {
  id: number;
  name: string | null;
  type: string | null;
  sortOrder?: number | null;
}

export interface FormDetailDto {
  id: number;
  name: string | null;
  description: string | null;
  inputs: FormInputDto[];
}

interface FormsResponse {
  items?: FormNameDto[];
}

const FORM_INFO_BASE = "/api/form-info";

export async function fetchFormNames(): Promise<FormNameDto[]> {
  const data = await apiGet<FormsResponse>(`${FORM_INFO_BASE}/forms`);
  if (!data || !Array.isArray(data.items)) return [];
  return data.items;
}

export interface CreateFormData {
  name: string;
  description?: string;
  inputIds: number[];
}

export interface CreateFormResponse {
  id: number;
  name: string | null;
  description: string | null;
  inputIds: number[];
  createdAt?: string | null;
}

export const updateForm = (formId: number, data: CreateFormData): Promise<CreateFormResponse> =>
  apiPut<CreateFormResponse>(`${FORM_INFO_BASE}/forms/${formId}`, {
    name: data.name?.trim() ?? "",
    description: (data.description ?? "").trim() || null,
    inputIds: Array.isArray(data.inputIds) ? data.inputIds : [],
  });

export const createForm = (data: CreateFormData): Promise<CreateFormResponse> =>
  apiPost<CreateFormResponse>(`${FORM_INFO_BASE}/forms`, {
    name: data.name?.trim() ?? "",
    description: (data.description ?? "").trim() || null,
    inputIds: Array.isArray(data.inputIds) ? data.inputIds : [],
  });

interface InputsResponse {
  items?: InputDto[];
}

export interface InputDto {
  id: number;
  name: string | null;
  type: string | null;
  createdAt?: string | null;
}

export interface CreateInputData {
  name: string;
  type: string;
}

export async function fetchInputs(): Promise<InputDto[]> {
  const data = await apiGet<InputsResponse>(`${FORM_INFO_BASE}/inputs`);
  if (!data || !Array.isArray(data.items)) return [];
  // Knex/Postgres đôi khi trả id dạng string; cần số thống nhất (Set, checkbox, v.v.)
  return data.items.map((it) => ({
    ...it,
    id: Number(it.id),
  }));
}

export async function createInput(data: CreateInputData): Promise<InputDto> {
  const created = await apiPost<InputDto>(`${FORM_INFO_BASE}/inputs`, {
    name: data.name?.trim() ?? "",
    type: (data.type ?? "text").trim().toLowerCase(),
  });
  return { ...created, id: Number(created.id) };
}

export async function fetchFormDetail(formId: number): Promise<FormDetailDto> {
  // Giữ apiFetch cho case 404 đặc biệt
  const res = await apiFetch(`${FORM_INFO_BASE}/forms/${formId}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Form không tồn tại");
    }
    throw new Error("Không thể tải chi tiết form");
  }
  const data = (await res.json().catch(() => null)) as
    | (Partial<FormDetailDto> & { inputs?: unknown[] })
    | null;

  const safeInputs: FormInputDto[] = Array.isArray(data?.inputs)
    ? data.inputs.map((raw) => {
        const item =
          raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
        const rawName = item.name ?? item.inputName ?? "";
        const rawType = item.type ?? item.inputType ?? "";
        const rawSortOrder = item.sortOrder;
        return {
          id: Number(item.id ?? item.inputId ?? 0),
          name: typeof rawName === "string" ? rawName : String(rawName || ""),
          type: typeof rawType === "string" ? rawType : String(rawType || ""),
          sortOrder: typeof rawSortOrder === "number" ? rawSortOrder : null,
        };
      })
    : [];

  return {
    id: Number(data?.id ?? formId),
    name: (data?.name ?? null) as string | null,
    description: (data?.description ?? null) as string | null,
    inputs: safeInputs,
  };
}
