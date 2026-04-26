import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import type { ApiEnvelope } from "@/types/hrms";

interface Department {
  id: string;
  name: string;
  description?: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function HRDashboard() {
  const departments = useQuery({
    queryKey: ["hr-departments"],
    queryFn: () => api.get<ApiEnvelope<Department[]>>("/departments")
  });

  const employees = useQuery({
    queryKey: ["hr-employees"],
    queryFn: () => api.get<ApiEnvelope<Employee[]>>("/users")
  });

  return (
    <DashboardLayout role="hr">
      <div className="p-4 md:p-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">HR Operations Dashboard</h1>
          <p className="text-muted-foreground mt-1">Run onboarding, department and workforce operations securely</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <article className="card-premium p-5">
            <p className="stat-label">Departments</p>
            <p className="stat-value">{departments.isLoading ? "..." : departments.data?.data.length ?? 0}</p>
          </article>
          <article className="card-premium p-5">
            <p className="stat-label">Employees</p>
            <p className="stat-value">{employees.isLoading ? "..." : employees.data?.data.length ?? 0}</p>
          </article>
        </section>

        <section className="card-premium p-6">
          <h2 className="text-xl font-semibold">Department Directory</h2>
          <div className="mt-4 space-y-3">
            {(departments.data?.data || []).map((department) => (
              <div key={department.id} className="rounded-lg border border-border p-3">
                <p className="font-medium">{department.name}</p>
                <p className="text-sm text-muted-foreground">{department.description || "No description"}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
