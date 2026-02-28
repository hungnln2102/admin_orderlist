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

