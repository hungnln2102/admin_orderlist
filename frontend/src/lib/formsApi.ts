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
  const res = await apiFetch(`${FORM_INFO_BASE}/forms`);
  if (!res.ok) {
    throw new Error("Không thể tải danh sách form");
  }
  const data: FormsResponse = await res.json().catch(
    () => ({} as FormsResponse)
  );
  if (!data || !Array.isArray(data.items)) {
    return [];
  }
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

export async function createForm(data: CreateFormData): Promise<CreateFormResponse> {
  const res = await apiFetch(`${FORM_INFO_BASE}/forms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name?.trim() ?? "",
      description: (data.description ?? "").trim() || null,
      inputIds: Array.isArray(data.inputIds) ? data.inputIds : [],
    }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    const msg = errData?.error ?? "Không thể tạo form";
    throw new Error(msg);
  }
  return res.json();
}

interface InputsResponse {
  items?: InputDto[];
}

export interface InputDto {
  id: number;
  name: string | null;
  type: string | null;
  createdAt?: string | null;
}

export async function fetchInputs(): Promise<InputDto[]> {
  const res = await apiFetch(`${FORM_INFO_BASE}/inputs`);
  if (!res.ok) {
    throw new Error("Không thể tải danh sách input");
  }
  const data: InputsResponse = await res.json().catch(() => ({} as InputsResponse));
  if (!data || !Array.isArray(data.items)) {
    return [];
  }
  return data.items;
}

export interface CreateInputData {
  name: string;
  type: string;
}

export async function createInput(data: CreateInputData): Promise<InputDto> {
  const res = await apiFetch(`${FORM_INFO_BASE}/inputs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: data.name?.trim() ?? "",
      type: (data.type ?? "text").trim().toLowerCase(),
    }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    const msg = errData?.error ?? "Không thể tạo input";
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchFormDetail(
  formId: number
): Promise<FormDetailDto> {
  const res = await apiFetch(`${FORM_INFO_BASE}/forms/${formId}`);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Form không tồn tại");
    }
    throw new Error("Không thể tải chi tiết form");
  }
  const data = (await res.json().catch(() => null)) as
    | Partial<FormDetailDto & { inputs?: any[] }>
    | null;

  const safeInputs: FormInputDto[] = Array.isArray(data?.inputs)
    ? data!.inputs.map((raw) => ({
        id: Number((raw as any).id ?? (raw as any).inputId ?? 0),
        name: ((raw as any).name ??
          (raw as any).inputName ??
          "") as string | null,
        type: ((raw as any).type ??
          (raw as any).inputType ??
          "") as string | null,
        sortOrder:
          typeof (raw as any).sortOrder === "number"
            ? (raw as any).sortOrder
            : null,
      }))
    : [];

  return {
    id: Number(data?.id ?? formId),
    name: (data?.name ?? null) as string | null,
    description: (data?.description ?? null) as string | null,
    inputs: safeInputs,
  };
}

