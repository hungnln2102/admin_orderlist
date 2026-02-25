import { apiFetch } from "./api";

export interface FormNameDto {
  id: number;
  name: string | null;
  description: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface FormsResponse {
  items?: FormNameDto[];
}

export async function fetchFormNames(): Promise<FormNameDto[]> {
  const res = await apiFetch("/api/forms");
  if (!res.ok) {
    throw new Error("Không thể tải danh sách form");
  }
  const data: FormsResponse = await res.json().catch(() => ({} as FormsResponse));
  if (!data || !Array.isArray(data.items)) {
    return [];
  }
  return data.items;
}

