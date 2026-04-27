import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import type { ApiEnvelope, AppRole } from "@/types/hrms";

interface Props {
  role: AppRole;
}

interface ReimbursementRow {
  id: string;
  title: string;
  category: string;
  amount: number;
  status: string;
  proofUrl?: string | null;
  notes?: string | null;
  submittedBy?: { firstName: string; lastName: string; email: string };
  employeeId: string;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      resolve(value.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function ReimbursementsPage({ role }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    employeeProfileId: "",
    title: "",
    category: "",
    amount: "",
    notes: "",
    proofUrl: ""
  });
  const [proofFile, setProofFile] = useState<File | null>(null);

  const myQuery = useQuery({
    queryKey: ["reimbursements-mine"],
    queryFn: () => api.get<ApiEnvelope<ReimbursementRow[]>>("/reimbursements/mine"),
    enabled: role === "employee"
  });

  const pendingQuery = useQuery({
    queryKey: ["reimbursements-pending"],
    queryFn: () => api.get<ApiEnvelope<ReimbursementRow[]>>("/reimbursements/pending"),
    enabled: role !== "employee"
  });

  const profileQuery = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => api.get<ApiEnvelope<{ employeeProfile?: { id: string } }>>("/users/me"),
    enabled: role === "employee"
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let proofUrl = form.proofUrl || undefined;
      if (proofFile) {
        const base64 = await fileToBase64(proofFile);
        const upload = await api.post<ApiEnvelope<{ url: string }>>("/files/upload-base64", {
          folder: "reimbursements",
          filename: `${Date.now()}_${proofFile.name}`,
          contentBase64: base64
        });
        proofUrl = upload.data.url;
      }

      const employeeProfileId = profileQuery.data?.data?.employeeProfile?.id;
      return api.post<ApiEnvelope<unknown>>("/reimbursements", {
        employeeProfileId: form.employeeProfileId || employeeProfileId,
        title: form.title,
        category: form.category,
        amount: Number(form.amount),
        notes: form.notes || undefined,
        proofUrl
      });
    },
    onSuccess: () => {
      setForm({ employeeProfileId: "", title: "", category: "", amount: "", notes: "", proofUrl: "" });
      setProofFile(null);
      queryClient.invalidateQueries({ queryKey: ["reimbursements-mine"] });
    }
  });

  const reviewMutation = useMutation({
    mutationFn: (payload: { reimbursementId: string; status: "APPROVED" | "REJECTED" | "PAID" }) =>
      api.post<ApiEnvelope<unknown>>("/reimbursements/approve", payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reimbursements-pending"] })
  });

  return (
    <DashboardLayout role={role}>
      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-3xl font-bold">Reimbursement {role === "employee" ? "Form" : "Approvals"}</h1>

        {role === "employee" ? (
          <>
            <section className="card-premium p-6 space-y-4">
              <h2 className="text-lg font-semibold">Submit Monthly Reimbursement</h2>
              <div className="grid md:grid-cols-2 gap-3">
                <input className="h-10 rounded-md border bg-background px-3" placeholder="Title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
                <input className="h-10 rounded-md border bg-background px-3" placeholder="Category" value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} />
                <input className="h-10 rounded-md border bg-background px-3" type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} />
                <input
                  className="h-10 rounded-md border bg-background px-3"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                />
                <input className="h-10 rounded-md border bg-background px-3 md:col-span-2" placeholder="Notes" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
              </div>
              <button className="h-10 rounded-md bg-primary px-4 text-primary-foreground" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Submitting..." : "Submit Reimbursement"}
              </button>
            </section>

            <section className="card-premium p-6">
              <h2 className="text-lg font-semibold">My Reimbursement Requests</h2>
              <div className="mt-4 space-y-2">
                {(myQuery.data?.data ?? []).map((item) => (
                  <div key={item.id} className="rounded-md border p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {item.title} - INR {Number(item.amount).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">Status: {item.status}</p>
                    </div>
                    {item.proofUrl && (
                      <a href={item.proofUrl} className="text-primary underline" target="_blank" rel="noreferrer">
                        View Proof
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="card-premium p-6">
            <h2 className="text-lg font-semibold">Pending Reimbursements</h2>
            <div className="mt-4 space-y-3">
              {(pendingQuery.data?.data ?? []).map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <p className="font-medium">
                    {item.submittedBy?.firstName} {item.submittedBy?.lastName} - {item.title}
                  </p>
                  <p className="text-sm text-muted-foreground">INR {Number(item.amount).toLocaleString()} | {item.category}</p>
                  <div className="mt-2 flex gap-2">
                    <button className="h-9 rounded-md bg-primary px-3 text-primary-foreground" onClick={() => reviewMutation.mutate({ reimbursementId: item.id, status: "APPROVED" })}>
                      Approve
                    </button>
                    <button className="h-9 rounded-md border px-3" onClick={() => reviewMutation.mutate({ reimbursementId: item.id, status: "REJECTED" })}>
                      Reject
                    </button>
                    <button className="h-9 rounded-md border px-3" onClick={() => reviewMutation.mutate({ reimbursementId: item.id, status: "PAID" })}>
                      Mark Paid
                    </button>
                    {item.proofUrl && (
                      <a href={item.proofUrl} target="_blank" rel="noreferrer" className="h-9 rounded-md border px-3 inline-flex items-center">
                        Proof
                      </a>
                    )}
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
