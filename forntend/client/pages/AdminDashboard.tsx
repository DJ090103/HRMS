import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import type { ApiEnvelope, DashboardMetrics } from "@/types/hrms";

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => api.get<ApiEnvelope<DashboardMetrics>>("/reports/dashboard")
  });

  const metrics = data?.data;

  return (
    <DashboardLayout role="admin">
      <div className="p-4 md:p-8 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Executive Dashboard</h1>
            <p className="text-muted-foreground mt-1">Enterprise controls, approvals and payroll visibility</p>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-premium p-5">
            <p className="stat-label">Active Employees</p>
            <p className="stat-value">{isLoading ? "..." : metrics?.employees ?? 0}</p>
          </div>
          <div className="card-premium p-5">
            <p className="stat-label">Pending Leave Approvals</p>
            <p className="stat-value">{isLoading ? "..." : metrics?.pendingLeaves ?? 0}</p>
          </div>
          <div className="card-premium p-5">
            <p className="stat-label">Pending Reimbursements</p>
            <p className="stat-value">{isLoading ? "..." : metrics?.pendingReimbursements ?? 0}</p>
          </div>
        </section>

        <section className="card-premium p-6">
          <h2 className="text-xl font-semibold">Recent Payroll Runs</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2">Month</th>
                  <th className="py-2">Year</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Total Net</th>
                </tr>
              </thead>
              <tbody>
                {(metrics?.recentPayroll || []).map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2">{row.month}</td>
                    <td className="py-2">{row.year}</td>
                    <td className="py-2">{row.status}</td>
                    <td className="py-2">INR {Number(row.totalNet || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
