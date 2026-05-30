import {
  apiFetch,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  type ApiResponse,
} from "@/lib/apiClient";

export type { ApiResponse };

export { getUserErrorMessage } from "@/lib/api-errors";

export async function fetcher<T>(path: string): Promise<T> {
  return apiGet<T>(path);
}

export const apiClient = {
  post: <T>(path: string, body?: unknown) => apiPost<T>(path, body),
  put: <T>(path: string, body?: unknown) => apiPut<T>(path, body),
  del: <T>(path: string) => apiDelete<T>(path),
  get: <T>(path: string) => apiGet<T>(path),
  fetch: apiFetch,
};
