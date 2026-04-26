import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import type { ApiEnvelope } from "@/types/hrms";

interface LeaveRequest {
  id: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
}

export default function EmployeeDashboard() {
  const leaveQuery = useQuery({
    queryKey: ["employee-leaves"],
    queryFn: () => api.get<ApiEnvelope<LeaveRequest[]>>("/leave/mine")
  });

  const notificationQuery = useQuery({
    queryKey: ["employee-notifications"],
    queryFn: () => api.get<ApiEnvelope<Notification[]>>("/notifications/mine")
  });

  return (
    <DashboardLayout role="employee">
      <div className="p-4 md:p-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Employee Workspace</h1>
          <p className="text-muted-foreground mt-1">Self-service portal for leave, notifications and requests</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <article className="card-premium p-5">
            <p className="stat-label">Total Leave Requests</p>
            <p className="stat-value">{leaveQuery.isLoading ? "..." : leaveQuery.data?.data.length ?? 0}</p>
          </article>
          <article className="card-premium p-5">
            <p className="stat-label">Unread Notifications</p>
            <p className="stat-value">
              {notificationQuery.isLoading
                ? "..."
                : (notificationQuery.data?.data || []).filter((n) => !n.isRead).length}
            </p>
          </article>
        </section>

        <section className="card-premium p-6">
          <h2 className="text-xl font-semibold">Recent Notifications</h2>
          <div className="mt-4 space-y-3">
            {(notificationQuery.data?.data || []).slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-3">
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
