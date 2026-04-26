import { env } from "@/lib/env";
import { authStorage } from "@/lib/auth-storage";
import type { ApiEnvelope, AuthTokens } from "@/types/hrms";

interface ApiErrorPayload {
  success?: boolean;
  statusCode?: number;
  code?: string;
  message?: string;
  details?: unknown;
  requestId?: string;
}

class HttpError extends Error {
  status: number;
  payload: ApiErrorPayload | Record<string, unknown>;

  constructor(status: number, message: string, payload: ApiErrorPayload | Record<string, unknown>) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

let refreshInFlight: Promise<string | null> | null = null;

const buildHeaders = (custom?: HeadersInit): HeadersInit => {
  const tokens = authStorage.getTokens();
  return {
    "Content-Type": "application/json",
    ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
    ...custom
  };
};

const refreshAccessToken = async (): Promise<string | null> => {
  const current = authStorage.getTokens();
  if (!current?.refreshToken) {
    return null;
  }

  const response = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: current.refreshToken })
  });

  if (!response.ok) {
    authStorage.clear();
    return null;
  }

  const payload = (await response.json()) as ApiEnvelope<{ accessToken: string }>;
  const nextTokens: AuthTokens = {
    accessToken: payload.data.accessToken,
    refreshToken: current.refreshToken
  };
  authStorage.setTokens(nextTokens);
  return payload.data.accessToken;
};

const ensureFreshAccessToken = async (): Promise<string | null> => {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

const statusMessage: Record<number, string> = {
  0: "Network connection failed. Check internet/backend availability and try again.",
  400: "Invalid request. Please verify your input and retry.",
  401: "Session expired or unauthorized access. Please login again.",
  403: "Access denied for your current role or permissions.",
  404: "Requested resource was not found.",
  409: "Operation conflicts with existing data.",
  422: "Validation failed. Please correct the request and retry.",
  429: "Too many requests. Please wait and try again.",
  500: "Server error occurred. Please try again shortly.",
  503: "Service is temporarily unavailable."
};

const extractApiMessage = (status: number, payload: ApiErrorPayload | Record<string, unknown>): string => {
  const payloadMessage = typeof payload?.message === "string" ? payload.message : "";
  if (payloadMessage) {
    return payloadMessage;
  }
  return statusMessage[status] || "Request failed.";
};

async function rawRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.requestTimeoutMs);
  const authPaths = ["/auth/login", "/auth/refresh", "/auth/forgot-password", "/auth/reset-password", "/auth/verify-email"];
  const isAuthRoute = authPaths.some((prefix) => path.startsWith(prefix));
  const hasRefreshToken = Boolean(authStorage.getTokens()?.refreshToken);
  const canTryRefresh = !isAuthRoute && hasRefreshToken;

  try {
    const response = await fetch(`${env.apiBaseUrl}${path}`, {
      ...init,
      headers: buildHeaders(init.headers),
      signal: controller.signal
    });

    if (response.status === 401 && canTryRefresh) {
      const refreshed = await ensureFreshAccessToken();
      if (refreshed) {
        const retry = await fetch(`${env.apiBaseUrl}${path}`, {
          ...init,
          headers: buildHeaders(init.headers),
          signal: controller.signal
        });
        const retryPayload = (await retry.json().catch(() => ({}))) as ApiErrorPayload;
        if (!retry.ok) {
          throw new HttpError(retry.status, extractApiMessage(retry.status, retryPayload), retryPayload);
        }
        return retryPayload as T;
      }
      authStorage.clear();
      throw new HttpError(401, extractApiMessage(401, {}), {});
    }

    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    if (!response.ok) {
      throw new HttpError(response.status, extractApiMessage(response.status, payload), payload);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new HttpError(0, "Request timed out. Please retry.", {});
    }
    if (error instanceof TypeError) {
      throw new HttpError(0, extractApiMessage(0, {}), {});
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  get: <T>(path: string): Promise<T> => rawRequest<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown): Promise<T> =>
    rawRequest<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined
    }),
  patch: <T>(path: string, body?: unknown): Promise<T> =>
    rawRequest<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined
    }),
  del: <T>(path: string): Promise<T> => rawRequest<T>(path, { method: "DELETE" }),
  HttpError
};
