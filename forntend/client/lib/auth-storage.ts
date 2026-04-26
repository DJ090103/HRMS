import type { AuthTokens, AuthUser } from "@/types/hrms";

const TOKEN_KEY = "hrms.auth.tokens";
const USER_KEY = "hrms.auth.user";

export const authStorage = {
  getTokens: (): AuthTokens | null => {
    const value = localStorage.getItem(TOKEN_KEY);
    return value ? (JSON.parse(value) as AuthTokens) : null;
  },
  setTokens: (tokens: AuthTokens): void => {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  },
  getUser: (): AuthUser | null => {
    const value = localStorage.getItem(USER_KEY);
    return value ? (JSON.parse(value) as AuthUser) : null;
  },
  setUser: (user: AuthUser): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: (): void => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};
