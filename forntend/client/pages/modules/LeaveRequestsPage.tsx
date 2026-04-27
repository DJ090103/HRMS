import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import type { ApiEnvelope, AppRole } from "@/types/hrms";

interface Props {
  role: AppRole;
}

interface LeaveRow {
  id: string;
  type: string;
  reason?: string | null;
  startDate: string;
  endDate: string;
  status: string;
  requester?: { firstName: string; lastName: string; email: string };
}

export default function LeaveRequestsPage({ role }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    type: "Casual Leave",
    reason: "",
    startDate: "",
    endDate: ""
  });

  const mineQuery = useQuery({
    queryKey: ["leave-mine"],
    queryFn: () => api.get<ApiEnvelope<LeaveRow[]>>("/leave/mine"),
    enabled: role === "employee"
  });

  const pendingQuery = useQuery({
    queryKey: ["leave-pending"],
    queryFn: () => api.get<ApiEnvelope<LeaveRow[]>>("/leave/pending"),
    enabled: role !== "employee"
  });

  const applyMutation = useMutation({
    mutationFn: () => api.post<ApiEnvelope<unknown>>("/leave/apply", form),
    onSuccess: () => {
      setForm({ type: "Casual Leave", reason: "", startDate: "", endDate: "" });
      queryClient.invalidateQueries({ queryKey: ["leave-mine"] });
    }
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: { leaveId: string; status: "APPROVED" | "REJECTED" }) =>
      api.post<ApiEnvelope<unknown>>("/leave/approve", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leave-pending"] })
  });

  return (
    <DashboardLayout role={role}>
      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-3xl font-bold">{role === "employee" ? "Leave Form" : "Leave Approvals"}</h1>

        {role === "employee" ? (
          <>
            <section className="card-premium p-6 space-y-4">
              <h2 className="text-lg font-semibold">Apply Leave</h2>
              <div className="grid md:grid-cols-2 gap-3">
                <input className="h-10 rounded-md border bg-background px-3" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))} />
                <input className="h-10 rounded-md border bg-background px-3" type="date" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} />
                <input className="h-10 rounded-md border bg-background px-3" type="date" value={form.endDate} onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))} />
                <input className="h-10 rounded-md border bg-background px-3" placeholder="Reason" value={form.reason} onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))} />
              </div>
              <button className="h-10 rounded-md bg-primary px-4 text-primary-foreground" onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}>
                {applyMutation.isPending ? "Submitting..." : "Submit Leave Request"}
              </button>
            </section>

            <section className="card-premium p-6">
              <h2 className="text-lg font-semibold">My Leave Requests</h2>
              <div className="mt-4 space-y-2">
                {(mineQuery.data?.data ?? []).map((leave) => (
                  <div key={leave.id} className="rounded-md border p-3">
                    <p className="font-medium">
                      {leave.type} ({new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()})
                    </p>
                    <p className="text-sm text-muted-foreground">Status: {leave.status}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="card-premium p-6">
            <h2 className="text-lg font-semibold">Pending Leave Requests</h2>
            <div className="mt-4 space-y-3">
              {(pendingQuery.data?.data ?? []).map((leave) => (
                <div key={leave.id} className="rounded-md border p-3">
                  <p className="font-medium">
                    {leave.requester?.firstName} {leave.requester?.lastName} - {leave.type}
                  </p>
                  <p className="text-sm text-muted-foreground">{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</p>
                  <div className="mt-2 flex gap-2">
                    <button className="h-9 rounded-md bg-primary px-3 text-primary-foreground" onClick={() => reviewMutation.mutate({ leaveId: leave.id, status: "APPROVED" })}>
                      Approve
                    </button>
                    <button className="h-9 rounded-md border px-3" onClick={() => reviewMutation.mutate({ leaveId: leave.id, status: "REJECTED" })}>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
