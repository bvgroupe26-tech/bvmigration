export {
  apiFetch,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiUpload,
  apiDownload,
  getUserErrorMessage,
  type ApiResponse,
} from "@/lib/apiClient";

export {
  setAccessToken,
  getAccessToken,
  refreshAccessToken,
  logout,
  loginRequest,
  AUTH_REFRESH_URL,
} from "@/lib/authClient";

/** @deprecated Utiliser setAccessToken() — le token est stocké en mémoire uniquement. */
export async function setAuthToken(token: string): Promise<void> {
  const { setAccessToken } = await import("@/lib/authClient");
  setAccessToken(token);
}

/** @deprecated Utiliser logout() — le refresh token est géré par cookie HttpOnly. */
export async function clearAuthToken(): Promise<void> {
  const { setAccessToken } = await import("@/lib/authClient");
  setAccessToken(null);
}
