import { apiFetch } from "./api";

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

/**
 * Fetch all categories
 */
export const fetchCategories = async (): Promise<CategoryItem[]> => {
  const response = await apiFetch("/api/categories");
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Failed to load categories (${response.status}).`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

/**
 * Create a new category
 */
export const createCategory = async (data: CreateCategoryData): Promise<CategoryItem> => {
  const response = await apiFetch("/api/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Failed to create category (${response.status}).`);
  }
  
  return await response.json();
};

/**
 * Update an existing category
 */
export const updateCategory = async (
  id: number,
  data: UpdateCategoryData
): Promise<CategoryItem> => {
  const response = await apiFetch(`/api/categories/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Failed to update category (${response.status}).`);
  }
  
  return await response.json();
};

/**
 * Delete a category
 */
export const deleteCategory = async (id: number): Promise<void> => {
  const response = await apiFetch(`/api/categories/${id}`, {
    method: "DELETE",
  });
  
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Failed to delete category (${response.status}).`);
  }
};
