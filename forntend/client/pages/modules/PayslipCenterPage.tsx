import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import type { ApiEnvelope, AppRole } from "@/types/hrms";

interface Props {
  role: AppRole;
}

interface PayslipItem {
  id: string;
  month: number;
  year: number;
  grossAmount: number;
  deductionAmount: number;
  reimbursementAmount: number;
  netAmount: number;
  slipUrl?: string | null;
  payrollStatus: string;
}

interface PayslipRequest {
  id: string;
  title: string;
  body: string;
  metadata: {
    status?: string;
    month?: number;
    year?: number;
    payrollLineItemId?: string;
    requesterId?: string;
  };
  createdAt: string;
}

const monthOptions = Array.from({ length: 12 }, (_, idx) => idx + 1);

export default function PayslipCenterPage({ role }: Props) {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [note, setNote] = useState("");

  const [editState, setEditState] = useState({
    requestId: "",
    status: "APPROVED",
    workingDays: "",
    presentDays: "",
    paidLeaveDays: "",
    grossAmount: "",
    deductionAmount: "",
    reimbursementAmount: "",
    netAmount: "",
    adminNote: ""
  });

  const myPayslips = useQuery({
    queryKey: ["my-payslips"],
    queryFn: () => api.get<ApiEnvelope<PayslipItem[]>>("/payroll/my-payslips"),
    enabled: role === "employee"
  });

  const payslipRequests = useQuery({
    queryKey: ["payslip-requests"],
    queryFn: () => api.get<ApiEnvelope<PayslipRequest[]>>("/payroll/payslip-requests"),
    enabled: role !== "employee"
  });

  const requestMutation = useMutation({
    mutationFn: () => api.post<ApiEnvelope<unknown>>("/payroll/request-payslip", { month, year, note: note || undefined }),
    onSuccess: () => {
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["my-payslips"] });
    }
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      api.post<ApiEnvelope<unknown>>("/payroll/approve-payslip-request", {
        requestId: editState.requestId,
        status: editState.status,
        workingDays: editState.workingDays ? Number(editState.workingDays) : undefined,
        presentDays: editState.presentDays ? Number(editState.presentDays) : undefined,
        paidLeaveDays: editState.paidLeaveDays ? Number(editState.paidLeaveDays) : undefined,
        grossAmount: editState.grossAmount ? Number(editState.grossAmount) : undefined,
        deductionAmount: editState.deductionAmount ? Number(editState.deductionAmount) : undefined,
        reimbursementAmount: editState.reimbursementAmount ? Number(editState.reimbursementAmount) : undefined,
        netAmount: editState.netAmount ? Number(editState.netAmount) : undefined,
        note: editState.adminNote || undefined
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payslip-requests"] });
    }
  });

  const pendingRequests = useMemo(
    () => (payslipRequests.data?.data ?? []).filter((req) => req.metadata?.status !== "APPROVED" && req.metadata?.status !== "REJECTED"),
    [payslipRequests.data?.data]
  );

  return (
    <DashboardLayout role={role}>
      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-3xl font-bold">{role === "employee" ? "Salary Slips" : "Payslip Approvals"}</h1>

        {role === "employee" ? (
          <>
            <section className="card-premium p-6 space-y-4">
              <h2 className="text-lg font-semibold">Request Monthly Payslip</h2>
              <div className="grid md:grid-cols-4 gap-3">
                <select className="h-10 rounded-md border bg-background px-3" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  className="h-10 rounded-md border bg-background px-3"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                />
                <input
                  className="h-10 rounded-md border bg-background px-3 md:col-span-2"
                  placeholder="Optional note for admin"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <button
                className="h-10 rounded-md bg-primary px-4 text-primary-foreground"
                onClick={() => requestMutation.mutate()}
                disabled={requestMutation.isPending}
              >
                {requestMutation.isPending ? "Submitting..." : "Create Request"}
              </button>
            </section>

            <section className="card-premium p-6">
              <h2 className="text-lg font-semibold">Available Payslips</h2>
              <div className="mt-4 space-y-3">
                {(myPayslips.data?.data ?? []).map((slip) => (
                  <div key={slip.id} className="rounded-md border p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {slip.month}/{slip.year} - Net INR {Number(slip.netAmount).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">Status: {slip.payrollStatus}</p>
                    </div>
                    {slip.slipUrl ? (
                      <a className="text-primary underline" href={slip.slipUrl} target="_blank" rel="noreferrer">
                        Download
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">Pending approval</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="card-premium p-6 space-y-4">
            <h2 className="text-lg font-semibold">Pending Payslip Requests</h2>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="rounded-md border p-4 space-y-3">
                  <div>
                    <p className="font-medium">{request.body}</p>
                    <p className="text-sm text-muted-foreground">Request month: {request.metadata?.month}/{request.metadata?.year}</p>
                  </div>
                  <div className="grid md:grid-cols-4 gap-2">
                    <input className="h-9 rounded-md border bg-background px-3" placeholder="Working days" onChange={(e) => setEditState((prev) => ({ ...prev, requestId: request.id, workingDays: e.target.value }))} />
                    <input className="h-9 rounded-md border bg-background px-3" placeholder="Present days" onChange={(e) => setEditState((prev) => ({ ...prev, requestId: request.id, presentDays: e.target.value }))} />
                    <input className="h-9 rounded-md border bg-background px-3" placeholder="Paid leave days" onChange={(e) => setEditState((prev) => ({ ...prev, requestId: request.id, paidLeaveDays: e.target.value }))} />
                    <input className="h-9 rounded-md border bg-background px-3" placeholder="Gross amount" onChange={(e) => setEditState((prev) => ({ ...prev, requestId: request.id, grossAmount: e.target.value }))} />
                    <input className="h-9 rounded-md border bg-background px-3" placeholder="Deduction amount" onChange={(e) => setEditState((prev) => ({ ...prev, requestId: request.id, deductionAmount: e.target.value }))} />
                    <input className="h-9 rounded-md border bg-background px-3" placeholder="Reimbursement amount" onChange={(e) => setEditState((prev) => ({ ...prev, requestId: request.id, reimbursementAmount: e.target.value }))} />
                    <input className="h-9 rounded-md border bg-background px-3" placeholder="Net amount" onChange={(e) => setEditState((prev) => ({ ...prev, requestId: request.id, netAmount: e.target.value }))} />
                    <input className="h-9 rounded-md border bg-background px-3" placeholder="Admin note" onChange={(e) => setEditState((prev) => ({ ...prev, requestId: request.id, adminNote: e.target.value }))} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="h-9 rounded-md bg-primary px-4 text-primary-foreground"
                      onClick={() => {
                        setEditState((prev) => ({ ...prev, requestId: request.id, status: "APPROVED" }));
                        approveMutation.mutate();
                      }}
                      disabled={approveMutation.isPending}
                    >
                      Approve + Generate PDF
                    </button>
                    <button
                      className="h-9 rounded-md border px-4"
                      onClick={() => {
                        setEditState((prev) => ({ ...prev, requestId: request.id, status: "REJECTED" }));
                        approveMutation.mutate();
                      }}
                      disabled={approveMutation.isPending}
                    >
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
