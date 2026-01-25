/**
 * Error Handling Utilities
 * Provides consistent error parsing and user-friendly error messages
 */

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Parse error response from API
 * Handles both JSON and text responses
 */
export async function parseApiError(response: Response): Promise<string> {
  try {
    const contentType = response.headers.get("content-type");
    
    if (contentType && contentType.includes("application/json")) {
      const data: ApiError | { message?: string } = await response.json();
      
      // Backend returns { error: string, code?: string }
      if (data && typeof data === "object") {
        if ("error" in data && typeof data.error === "string") {
          return data.error;
        }
        if ("message" in data && typeof data.message === "string") {
          return data.message;
        }
      }
    }
    
    // Try to parse as text
    const text = await response.text();
    if (text) {
      try {
        const parsed = JSON.parse(text);
        if (parsed?.error) return parsed.error;
        if (parsed?.message) return parsed.message;
      } catch {
        // Not JSON, return text
        return text;
      }
    }
  } catch (err) {
    // Fallback if parsing fails
    console.error("Error parsing API error response:", err);
  }
  
  // Default error messages based on status code
  switch (response.status) {
    case 400:
      return "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.";
    case 401:
      return "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.";
    case 403:
      return "Bạn không có quyền thực hiện thao tác này.";
    case 404:
      return "Không tìm thấy tài nguyên yêu cầu.";
    case 409:
      return "Dữ liệu đã tồn tại hoặc xung đột.";
    case 429:
      return "Quá nhiều requests. Vui lòng thử lại sau.";
    case 500:
      return "Lỗi máy chủ. Vui lòng thử lại sau hoặc liên hệ quản trị viên.";
    case 503:
      return "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.";
    default:
      return `Lỗi không xác định (${response.status}). Vui lòng thử lại sau.`;
  }
}

/**
 * Handle network errors (connection failures, timeouts, etc.)
 */
export function handleNetworkError(error: unknown): string {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.";
  }
  
  if (error instanceof Error) {
    // Check for common error messages
    if (error.message.includes("NetworkError") || error.message.includes("Failed to fetch")) {
      return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.";
    }
    return error.message;
  }
  
  return "Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.";
}

/**
 * Enhanced apiFetch with better error handling
 * Wraps the original apiFetch and provides error parsing
 */
export async function apiFetchWithErrorHandling(
  input: string,
  init?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(input, {
      ...init,
      credentials: init?.credentials ?? "include",
    });
    
    // Handle non-OK responses
    if (!response.ok) {
      const errorMessage = await parseApiError(response);
      throw new Error(errorMessage);
    }
    
    return response;
  } catch (error) {
    // Re-throw with better error message if it's a network error
    if (error instanceof TypeError || (error instanceof Error && error.message.includes("fetch"))) {
      throw new Error(handleNetworkError(error));
    }
    throw error;
  }
}
