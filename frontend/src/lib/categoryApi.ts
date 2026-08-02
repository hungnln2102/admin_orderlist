import { apiGet, apiPost, apiPut, apiDelete } from "./api";

export interface CategoryItem {
  id: number;
  name: string;
  color?: string | null;
}

export interface CreateCategoryData {
  name: string;
  color?: string;
}

export interface UpdateCategoryData {
  name?: string;
  color?: string;
}

export const fetchCategories = (): Promise<CategoryItem[]> =>
  apiGet<CategoryItem[]>("/api/products/categories");

export const createCategory = (data: CreateCategoryData): Promise<CategoryItem> =>
  apiPost<CategoryItem>("/api/products/categories", data);

export const updateCategory = (id: number, data: UpdateCategoryData): Promise<CategoryItem> =>
  apiPut<CategoryItem>(`/api/products/categories/${id}`, data);

export const deleteCategory = (id: number): Promise<void> =>
  apiDelete(`/api/products/categories/${id}`);
