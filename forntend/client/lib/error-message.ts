import { api } from "@/lib/api";

const defaultByStatus: Record<number, string> = {
  0: "Network connection failed. Check internet or backend server status.",
  400: "Invalid request. Please review the entered values.",
  401: "Session expired or invalid login. Please sign in again.",
  403: "You are not authorized to perform this action.",
  404: "Requested resource was not found.",
  409: "Data conflict detected. Refresh and try again.",
  422: "Validation failed. Please correct highlighted fields.",
  429: "Too many requests. Please wait a moment and retry.",
  500: "Server encountered an error. Please try again shortly.",
  503: "Service temporarily unavailable. Please retry later."
};

export const toUserErrorMessage = (error: unknown, fallback = "Unable to complete this request."): string => {
  if (error instanceof api.HttpError) {
    if (error.message && error.message.trim().length > 0) {
      return error.message;
    }
    return defaultByStatus[error.status] || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
};
