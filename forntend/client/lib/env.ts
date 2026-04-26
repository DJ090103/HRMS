const fallbackApiBase = "http://localhost:8080/api/v1";

export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || fallbackApiBase).replace(/\/$/, ""),
  requestTimeoutMs: Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS || 15000)
};
