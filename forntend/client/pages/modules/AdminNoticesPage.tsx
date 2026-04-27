import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import type { ApiEnvelope, AppRole } from "@/types/hrms";

interface Props {
  role: AppRole;
}

interface SentNotice {
  id: string;
  title: string;
  body: string;
  channel: "IN_APP" | "EMAIL";
  createdAt: string;
}

export default function AdminNoticesPage({ role }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: "",
    body: "",
    channel: "IN_APP" as "IN_APP" | "EMAIL"
  });

  const sentNoticesQuery = useQuery({
    queryKey: ["sent-notices", role],
    queryFn: () => api.get<ApiEnvelope<SentNotice[]>>("/notifications/notices/sent")
  });

  const publishMutation = useMutation({
    mutationFn: () => api.post<ApiEnvelope<{ recipientCount: number }>>("/notifications/notices", form),
    onSuccess: () => {
      setForm({ title: "", body: "", channel: "IN_APP" });
      queryClient.invalidateQueries({ queryKey: ["sent-notices"] });
    }
  });

  return (
    <DashboardLayout role={role}>
      <div className="p-4 md:p-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Admin Notices</h1>
          <p className="text-muted-foreground mt-1">Publish company-wide announcements visible in recent notifications.</p>
        </header>

        <section className="card-premium p-6 space-y-4">
          <h2 className="text-lg font-semibold">Create Notice</h2>
          <div className="grid gap-3">
            <input
              className="h-10 rounded-md border bg-background px-3"
              placeholder="Notice title"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <textarea
              className="min-h-28 rounded-md border bg-background px-3 py-2"
              placeholder="Notice message"
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
            />
            <select
              className="h-10 rounded-md border bg-background px-3"
              value={form.channel}
              onChange={(e) => setForm((prev) => ({ ...prev, channel: e.target.value as "IN_APP" | "EMAIL" }))}
            >
              <option value="IN_APP">In-app</option>
              <option value="EMAIL">Email + In-app</option>
            </select>
          </div>
          <button
            className="h-10 rounded-md bg-primary px-4 text-primary-foreground"
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}
          >
            {publishMutation.isPending ? "Publishing..." : "Publish Notice"}
          </button>
        </section>

        <section className="card-premium p-6">
          <h2 className="text-lg font-semibold">Sent Notices</h2>
          <div className="mt-4 space-y-2">
            {(sentNoticesQuery.data?.data ?? []).map((notice) => (
              <div key={notice.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{notice.title}</p>
                  <span className="text-xs text-muted-foreground">{new Date(notice.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{notice.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
