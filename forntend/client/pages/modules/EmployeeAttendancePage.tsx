import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/error-message";

interface AttendanceItem {
  id: string;
  date: string;
  punchInAt: string | null;
  punchOutAt: string | null;
  isLate: boolean;
  overtimeMinutes: number;
}

interface LoginHistory {
  id: string;
  createdAt: string;
  success: boolean;
  reason: string | null;
  ipAddress: string | null;
}

interface WfhRequest {
  id: string;
  weekStart: string;
  requestedDates: string[];
  reason?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionNote?: string | null;
}

const getCurrentWeekMonday = (): Date => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = now.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  now.setDate(now.getDate() + offset);
  return now;
};

export default function EmployeeAttendancePage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [wfhReason, setWfhReason] = useState("");
  const weekStart = useMemo(() => getCurrentWeekMonday(), []);
  const weekStartIso = weekStart.toISOString();
  const weekdays = useMemo(() => {
    return Array.from({ length: 5 }).map((_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return {
        label: date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }),
        iso: date.toISOString()
      };
    });
  }, [weekStart]);
  const [selectedWfhDates, setSelectedWfhDates] = useState<string[]>([]);

  const attendanceQuery = useQuery({
    queryKey: ["employee-attendance", month, year],
    queryFn: () =>
      api.get<{ success: boolean; data: AttendanceItem[]; summary: { presentDays: number; lateDays: number; overtimeHours: number } }>(
        `/attendance/me?month=${month}&year=${year}`
      )
  });

  const loginHistoryQuery = useQuery({
    queryKey: ["employee-login-history"],
    queryFn: () => api.get<{ success: boolean; data: LoginHistory[] }>("/auth/login-history")
  });

  const wfhQuery = useQuery({
    queryKey: ["employee-weekly-wfh", weekStartIso],
    queryFn: () =>
      api.get<{ success: boolean; data: WfhRequest | null }>(
        `/attendance/wfh/weekly/me?weekStart=${encodeURIComponent(weekStartIso)}`
      )
  });

  useEffect(() => {
    if (wfhQuery.data?.data) {
      setSelectedWfhDates(wfhQuery.data.data.requestedDates || []);
      setWfhReason(wfhQuery.data.data.reason || "");
    }
  }, [wfhQuery.data?.data]);

  const punchInMutation = useMutation({
    mutationFn: () => api.post("/attendance/punch-in"),
    onSuccess: async () => {
      setError("");
      setMessage("Punch in recorded successfully.");
      await queryClient.invalidateQueries({ queryKey: ["employee-attendance"] });
      await queryClient.invalidateQueries({ queryKey: ["employee-login-history"] });
    },
    onError: (err) => {
      setMessage("");
      setError(toUserErrorMessage(err, "Unable to punch in."));
    }
  });

  const punchOutMutation = useMutation({
    mutationFn: () => api.post("/attendance/punch-out"),
    onSuccess: async () => {
      setError("");
      setMessage("Punch out recorded successfully.");
      await queryClient.invalidateQueries({ queryKey: ["employee-attendance"] });
      await queryClient.invalidateQueries({ queryKey: ["employee-login-history"] });
    },
    onError: (err) => {
      setMessage("");
      setError(toUserErrorMessage(err, "Unable to punch out."));
    }
  });

  const weeklyWfhMutation = useMutation({
    mutationFn: () =>
      api.post("/attendance/wfh/weekly", {
        weekStart: weekStartIso,
        requestedDates: selectedWfhDates,
        reason: wfhReason || undefined
      }),
    onSuccess: async () => {
      setError("");
      setMessage("Weekly WFH request submitted.");
      await queryClient.invalidateQueries({ queryKey: ["employee-weekly-wfh"] });
    },
    onError: (err) => {
      setMessage("");
      setError(toUserErrorMessage(err, "Unable to submit weekly WFH request."));
    }
  });

  const chartData = (attendanceQuery.data?.data || []).map((row) => ({
    day: new Date(row.date).getDate(),
    overtimeHours: Number((row.overtimeMinutes / 60).toFixed(2))
  }));

  return (
    <DashboardLayout role="employee">
      <div className="p-4 md:p-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">My Attendance & Login Tracker</h1>
          <p className="text-muted-foreground mt-1">Track your daily punch in/out and login history</p>
        </header>

        <section className="card-premium p-6">
          <h2 className="text-xl font-semibold">Today Actions</h2>
          <div className="mt-4 flex items-center gap-3">
            <button className="btn-primary" onClick={() => punchInMutation.mutate()} disabled={punchInMutation.isPending}>
              {punchInMutation.isPending ? "Saving..." : "Punch In"}
            </button>
            <button className="btn-secondary" onClick={() => punchOutMutation.mutate()} disabled={punchOutMutation.isPending}>
              {punchOutMutation.isPending ? "Saving..." : "Punch Out"}
            </button>
          </div>
          {message && <p className="text-sm text-success mt-3">{message}</p>}
          {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        </section>

        <section className="card-premium p-6 space-y-4">
          <h2 className="text-xl font-semibold">Weekly WFH Request (Current Week: Monday to Friday)</h2>
          <p className="text-sm text-muted-foreground">
            Choose WFH days only for this week. Days outside Monday-Friday are not allowed.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {weekdays.map((day) => {
              const checked = selectedWfhDates.includes(day.iso);
              return (
                <label key={day.iso} className="card-premium p-3 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedWfhDates((prev) => Array.from(new Set([...prev, day.iso])));
                      } else {
                        setSelectedWfhDates((prev) => prev.filter((item) => item !== day.iso));
                      }
                    }}
                  />
                  <span className="text-sm">{day.label}</span>
                </label>
              );
            })}
          </div>
          <textarea
            className="input-premium min-h-24"
            placeholder="Reason for WFH (optional)"
            value={wfhReason}
            onChange={(e) => setWfhReason(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <button className="btn-primary" onClick={() => weeklyWfhMutation.mutate()} disabled={weeklyWfhMutation.isPending}>
              {weeklyWfhMutation.isPending ? "Submitting..." : "Submit Weekly WFH"}
            </button>
            {wfhQuery.data?.data?.status && (
              <p className="text-sm text-muted-foreground">
                Current status: <span className="font-semibold">{wfhQuery.data.data.status}</span>
              </p>
            )}
            {wfhQuery.data?.data?.status === "REJECTED" && wfhQuery.data.data.rejectionNote && (
              <p className="text-sm text-destructive">Reason: {wfhQuery.data.data.rejectionNote}</p>
            )}
          </div>
        </section>

        <section className="card-premium p-6 space-y-4">
          <h2 className="text-xl font-semibold">Monthly Attendance Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="number" min={1} max={12} className="input-premium" value={month} onChange={(e) => setMonth(Number(e.target.value))} />
            <input type="number" className="input-premium" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card-premium p-4">
              <p className="stat-label">Present Days</p>
              <p className="stat-value">{attendanceQuery.data?.summary.presentDays ?? 0}</p>
            </div>
            <div className="card-premium p-4">
              <p className="stat-label">Late Days</p>
              <p className="stat-value">{attendanceQuery.data?.summary.lateDays ?? 0}</p>
            </div>
            <div className="card-premium p-4">
              <p className="stat-label">Overtime Hours</p>
              <p className="stat-value">{attendanceQuery.data?.summary.overtimeHours ?? 0}</p>
            </div>
          </div>
          <div className="card-premium p-4">
            <h3 className="font-semibold mb-3">Overtime Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="overtimeHours" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card-premium p-6">
          <h2 className="text-xl font-semibold">Login / Logout History</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2">Date & Time</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Event</th>
                  <th className="py-2">IP</th>
                </tr>
              </thead>
              <tbody>
                {(loginHistoryQuery.data?.data || []).map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="py-2">{row.success ? "Success" : "Failed"}</td>
                    <td className="py-2">{row.reason || "LOGIN"}</td>
                    <td className="py-2">{row.ipAddress || "-"}</td>
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
