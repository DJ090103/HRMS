import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/error-message";
import type { ApiEnvelope, AppRole } from "@/types/hrms";

interface ModulePageProps {
  role: AppRole;
}

const endpointByModule = (moduleName: string): string | null => {
  switch (moduleName) {
    case "employees":
    case "onboarding":
      return "/users";
    case "departments":
      return "/departments";
    case "attendance":
      return "/attendance/monthly?month=" + (new Date().getMonth() + 1) + "&year=" + new Date().getFullYear();
    case "leave":
      return "/leave/mine";
    case "leave-approvals":
      return "/reports/dashboard";
    case "payroll":
    case "salary":
      return "/reports/dashboard";
    case "reimbursements":
      return "/reimbursements/mine";
    case "reports":
      return "/reports/dashboard";
    case "settings":
      return "/settings/company";
    case "recruitment":
      return "/recruitment/openings";
    case "performance":
      return "/performance/reviews";
    case "profile":
      return "/users/me";
    default:
      return null;
  }
};

export default function ModulePage({ role }: ModulePageProps) {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);
  const moduleName = segments[segments.length - 1] || "overview";
  const endpoint = endpointByModule(moduleName);

  const { data, isLoading, error } = useQuery({
    queryKey: ["module", moduleName, role],
    queryFn: () => (endpoint ? api.get<ApiEnvelope<unknown>>(endpoint) : Promise.resolve({ success: true, data: null }))
  });

  const prettyName = useMemo(
    () =>
      moduleName
        .replace(/-/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    [moduleName]
  );

  const guidanceByRole: Record<AppRole, string> = {
    admin: "Use this workspace to manage approvals, payroll cycles, and enterprise policies.",
    hr: "Use this workspace to operate HR workflows, onboarding, attendance, and reviews.",
    employee: "Use this workspace to complete self-service actions and monitor requests."
  };

  return (
    <DashboardLayout role={role}>
      <div className="p-4 md:p-8 space-y-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">{prettyName}</h1>
          <p className="text-muted-foreground">{guidanceByRole[role]}</p>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <article className="card-premium p-5 lg:col-span-2">
            <h2 className="text-xl font-semibold">Operational Data</h2>
            <p className="text-sm text-muted-foreground mt-1">Connected to backend endpoint: {endpoint || "N/A"}</p>

            {isLoading && <p className="text-sm mt-6 text-muted-foreground">Fetching data securely...</p>}
            {error && <p className="text-sm mt-6 text-destructive">{toUserErrorMessage(error, "Unable to load module data.")}</p>}
            {!isLoading && !error && (
              <pre className="mt-4 p-4 bg-muted rounded-lg text-xs overflow-auto">{JSON.stringify(data?.data ?? null, null, 2)}</pre>
            )}
          </article>

          <article className="card-premium p-5">
            <h3 className="font-semibold">Action Checklist</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Validate role permissions before submitting any update.</li>
              <li>Review audit impact for approvals and payroll mutations.</li>
              <li>Use queue-backed processing for heavy workflows.</li>
              <li>Track status transitions and rejection reasons.</li>
            </ul>
          </article>
        </section>
      </div>
    </DashboardLayout>
  );
}
