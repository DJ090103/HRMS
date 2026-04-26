import { createContext, useContext, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { authStorage } from "@/lib/auth-storage";
import type { ApiEnvelope, AppRole, AuthTokens, AuthUser } from "@/types/hrms";

interface LoginInput {
  companyId: string;
  email: string;
  password: string;
  otp?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  role: AppRole | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const mapRole = (role: AuthUser["role"]): AppRole => {
  if (role === "SUPER_ADMIN") return "admin";
  if (role === "HR_MANAGER") return "hr";
  return "employee";
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => authStorage.getUser());
  const [tokens, setTokens] = useState<AuthTokens | null>(() => authStorage.getTokens());
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const refreshMe = async (): Promise<void> => {
    const me = await api.get<ApiEnvelope<{ id: string; role: AuthUser["role"]; companyId: string; permissions: string[] }>>("/users/me");
    if (user) {
      const nextUser: AuthUser = { ...user, role: me.data.role, companyId: me.data.companyId };
      setUser(nextUser);
      authStorage.setUser(nextUser);
    }
  };

  const login = async (input: LoginInput): Promise<void> => {
    setIsBootstrapping(true);
    try {
      const payload = await api.post<ApiEnvelope<{ accessToken: string; refreshToken: string; user: AuthUser }>>(
        "/auth/login",
        input
      );
      const nextTokens = {
        accessToken: payload.data.accessToken,
        refreshToken: payload.data.refreshToken
      };
      setTokens(nextTokens);
      setUser(payload.data.user);
      authStorage.setTokens(nextTokens);
      authStorage.setUser(payload.data.user);
    } finally {
      setIsBootstrapping(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post<ApiEnvelope<{}>>("/auth/logout");
    } catch {
      // Clear local session even if backend session revoke fails.
    } finally {
      setTokens(null);
      setUser(null);
      authStorage.clear();
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      tokens,
      role: user ? mapRole(user.role) : null,
      isAuthenticated: Boolean(user && tokens?.accessToken),
      isBootstrapping,
      login,
      logout,
      refreshMe
    }),
    [isBootstrapping, tokens, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};
