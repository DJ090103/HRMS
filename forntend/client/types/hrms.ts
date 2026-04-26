export type AppRole = "admin" | "hr" | "employee";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "SUPER_ADMIN" | "HR_MANAGER" | "EMPLOYEE";
  companyId: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface DashboardMetrics {
  employees: number;
  pendingLeaves: number;
  pendingReimbursements: number;
  recentPayroll: Array<{
    id: string;
    month: number;
    year: number;
    status: string;
    totalNet: number;
  }>;
}
