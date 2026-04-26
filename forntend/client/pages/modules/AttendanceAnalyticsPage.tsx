import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/error-message";

type RoleView = "admin" | "hr";

interface AttendanceAnalyticsPageProps {
  role: RoleView;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface LoginRow {
  userId: string;
  name: string;
  email: string;
  role: string;
  firstLoginAt: string | null;
  lastLogoutAt: string | null;
  failedAttempts: number;
}

interface AttendanceItem {
  id: string;
  date: string;
  punchInAt: string | null;
  punchOutAt: string | null;
  isLate: boolean;
  overtimeMinutes: number;
}

interface WfhTeamRow {
  id: string;
  weekStart: string;
  requestedDates: string[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason?: string | null;
  rejectionNote?: string | null;
  requester: { firstName: string; lastName: string; email: string };
}

const getCurrentWeekMondayIso = (): string => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = now.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  now.setDate(now.getDate() + offset);
  return now.toISOString();
};

export default function AttendanceAnalyticsPage({ role }: AttendanceAnalyticsPageProps) {
  const queryClient = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [date, setDate] = useState(now.toISOString().slice(0, 10));
  const [selectedUserId, setSelectedUserId] = useState("");
  const [weekStart] = useState(getCurrentWeekMondayIso());

  const usersQuery = useQuery({
    queryKey: ["analytics-users", role],
    queryFn: () => api.get<{ success: boolean; data: Employee[] }>("/users")
  });

  const users = usersQuery.data?.data || [];

  const effectiveUserId = selectedUserId || users[0]?.id || "";

  const loginActivityQuery = useQuery({
    queryKey: ["login-activity", date, role],
    queryFn: () =>
      api.get<{ success: boolean; data: { date: string; rows: LoginRow[] } }>(`/reports/login-activity?date=${date}`)
  });

  const monthlyReportQuery = useQuery({
    queryKey: ["employee-monthly-report", effectiveUserId, month, year, role],
    enabled: Boolean(effectiveUserId),
    queryFn: () =>
      api.get<{
        success: boolean;
        data: {
          metrics: {
            presentDays: number;
            lateDays: number;
            overtimeHours: number;
            leaveDaysApproved: number;
            reimbursementsApprovedAmount: number;
            reimbursementsPendingAmount: number;
            approvedWfhDays: number;
            payroll:
              | {
                  grossAmount: number;
                  deductionAmount: number;
                  reimbursementAmount: number;
                  netAmount: number;
                }
              | null;
          };
          attendance: AttendanceItem[];
        };
      }>(`/reports/employee/${effectiveUserId}/monthly?month=${month}&year=${year}`)
  });

  const teamWfhQuery = useQuery({
    queryKey: ["team-weekly-wfh", weekStart, role],
    queryFn: () =>
      api.get<{ success: boolean; data: WfhTeamRow[] }>(
        `/attendance/wfh/weekly/team?weekStart=${encodeURIComponent(weekStart)}`
      )
  });

  const reviewWfhMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      api.post(`/attendance/wfh/weekly/${id}/review`, {
        status,
        rejectionNote: status === "REJECTED" ? "Rejected by reviewer" : undefined
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["team-weekly-wfh"] });
    }
  });

  const attendanceTrend = useMemo(() => {
    const list = monthlyReportQuery.data?.data.attendance || [];
    return list.map((item) => ({
      day: new Date(item.date).getDate(),
      overtimeHours: Number((item.overtimeMinutes / 60).toFixed(2)),
      late: item.isLate ? 1 : 0
    }));
  }, [monthlyReportQuery.data?.data.attendance]);

  const metrics = monthlyReportQuery.data?.data.metrics;

  return (
    <DashboardLayout role={role}>
      <div className="p-4 md:p-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">{role === "admin" ? "Admin Attendance Analytics" : "HR Attendance Analytics"}</h1>
          <p className="text-muted-foreground mt-1">
            Daily login/logout tracking and monthly individual employee reports
          </p>
        </header>

        <section className="card-premium p-6">
          <h2 className="text-xl font-semibold">Daily Login / Logout Tracker</h2>
          <div className="mt-3 max-w-xs">
            <input type="date" className="input-premium" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {loginActivityQuery.isError && (
            <p className="text-sm text-destructive mt-3">{toUserErrorMessage(loginActivityQuery.error, "Unable to load login activity.")}</p>
          )}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2">Employee</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">First Login</th>
                  <th className="py-2">Last Logout</th>
                  <th className="py-2">Failed Attempts</th>
                </tr>
              </thead>
              <tbody>
                {(loginActivityQuery.data?.data.rows || []).map((row) => (
                  <tr key={row.userId} className="border-b border-border/60">
                    <td className="py-2">{row.name}</td>
                    <td className="py-2">{row.email}</td>
                    <td className="py-2">{row.firstLoginAt ? new Date(row.firstLoginAt).toLocaleTimeString() : "-"}</td>
                    <td className="py-2">{row.lastLogoutAt ? new Date(row.lastLogoutAt).toLocaleTimeString() : "-"}</td>
                    <td className="py-2">{row.failedAttempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card-premium p-6 space-y-4">
          <h2 className="text-xl font-semibold">Monthly Individual Employee Report</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select className="input-premium" value={effectiveUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="input-premium"
              value={month}
              min={1}
              max={12}
              onChange={(e) => setMonth(Number(e.target.value))}
            />
            <input type="number" className="input-premium" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>

          {monthlyReportQuery.isError && (
            <p className="text-sm text-destructive">{toUserErrorMessage(monthlyReportQuery.error, "Unable to load monthly report.")}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card-premium p-4">
              <p className="stat-label">Present Days</p>
              <p className="stat-value">{metrics?.presentDays ?? 0}</p>
            </div>
            <div className="card-premium p-4">
              <p className="stat-label">Late Days</p>
              <p className="stat-value">{metrics?.lateDays ?? 0}</p>
            </div>
            <div className="card-premium p-4">
              <p className="stat-label">Overtime Hours</p>
              <p className="stat-value">{metrics?.overtimeHours ?? 0}</p>
            </div>
            <div className="card-premium p-4">
              <p className="stat-label">Net Payroll</p>
              <p className="stat-value">INR {metrics?.payroll?.netAmount?.toLocaleString?.() ?? 0}</p>
            </div>
            <div className="card-premium p-4">
              <p className="stat-label">Approved WFH Days</p>
              <p className="stat-value">{metrics?.approvedWfhDays ?? 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-premium p-4">
              <h3 className="font-semibold mb-4">Daily Overtime Trend</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="overtimeHours" stroke="#0ea5e9" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="card-premium p-4">
              <h3 className="font-semibold mb-4">Late Marks (Daily)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="late" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="card-premium p-6">
          <h2 className="text-xl font-semibold">Current Week WFH Requests (Mon-Fri)</h2>
          {teamWfhQuery.isError && (
            <p className="text-sm text-destructive mt-3">{toUserErrorMessage(teamWfhQuery.error, "Unable to load WFH requests.")}</p>
          )}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2">Employee</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">WFH Days</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(teamWfhQuery.data?.data || []).map((item) => (
                  <tr key={item.id} className="border-b border-border/60">
                    <td className="py-2">{item.requester.firstName} {item.requester.lastName}</td>
                    <td className="py-2">{item.requester.email}</td>
                    <td className="py-2">
                      {item.requestedDates
                        .map((d) => new Date(d).toLocaleDateString(undefined, { weekday: "short", day: "numeric" }))
                        .join(", ")}
                    </td>
                    <td className="py-2">{item.status}</td>
                    <td className="py-2">
                      {item.status === "PENDING" ? (
                        <div className="flex gap-2">
                          <button className="btn-primary !px-3 !py-1.5" onClick={() => reviewWfhMutation.mutate({ id: item.id, status: "APPROVED" })}>
                            Approve
                          </button>
                          <button className="btn-secondary !px-3 !py-1.5" onClick={() => reviewWfhMutation.mutate({ id: item.id, status: "REJECTED" })}>
                            Reject
                          </button>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
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
