import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/error-message";

interface ProfileResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    role: string;
    companyId: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string | null;
    employeeProfile?: {
      designation?: string;
      employeeCode?: string;
      joiningDate?: string;
      baseCtc?: number;
      bankAccountNumber?: string | null;
      bankIfsc?: string | null;
      bankName?: string | null;
      bankAccountHolderName?: string | null;
      department?: { id: string; name: string } | null;
    };
  };
}

interface ProfilePageProps {
  role: "admin" | "hr" | "employee";
}

export default function ProfilePage({ role }: ProfilePageProps) {
  const queryClient = useQueryClient();
  const [editable, setEditable] = useState({
    firstName: "",
    lastName: "",
    designation: "",
    profileImageUrl: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const profileQuery = useQuery({
    queryKey: ["self-profile", role],
    queryFn: () => api.get<ProfileResponse>("/users/me")
  });

  useEffect(() => {
    const data = profileQuery.data?.data;
    if (data) {
      setEditable({
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        designation: data.employeeProfile?.designation || "",
        profileImageUrl: data.profileImageUrl || ""
      });
    }
  }, [profileQuery.data?.data]);

  const updateProfile = useMutation({
    mutationFn: () =>
      api.patch("/users/me", {
        firstName: editable.firstName,
        lastName: editable.lastName,
        designation: editable.designation,
        profileImageUrl: editable.profileImageUrl || undefined
      }),
    onSuccess: async () => {
      setMessage("Profile updated successfully.");
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["self-profile"] });
    },
    onError: (err) => {
      setMessage("");
      setError(toUserErrorMessage(err, "Unable to update profile."));
    }
  });

  const data = profileQuery.data?.data;

  return (
    <DashboardLayout role={role}>
      <div className="p-4 md:p-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground mt-1">Only first name, last name, designation and profile picture URL are editable</p>
        </header>

        <section className="card-premium p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">First Name</label>
            <input className="input-premium mt-1" value={editable.firstName} onChange={(e) => setEditable((p) => ({ ...p, firstName: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium">Last Name</label>
            <input className="input-premium mt-1" value={editable.lastName} onChange={(e) => setEditable((p) => ({ ...p, lastName: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium">Designation</label>
            <input className="input-premium mt-1" value={editable.designation} onChange={(e) => setEditable((p) => ({ ...p, designation: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium">Profile Image URL</label>
            <input className="input-premium mt-1" value={editable.profileImageUrl} onChange={(e) => setEditable((p) => ({ ...p, profileImageUrl: e.target.value }))} />
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <button className="btn-primary" onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>Save</button>
            {message && <p className="text-sm text-success">{message}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </section>

        <section className="card-premium p-6">
          <h2 className="text-xl font-semibold">Read-Only Details</h2>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div><span className="font-medium">Email:</span> {data?.email || "-"}</div>
            <div><span className="font-medium">Role:</span> {data?.role || "-"}</div>
            <div><span className="font-medium">Company ID:</span> {data?.companyId || "-"}</div>
            <div><span className="font-medium">Employee Code:</span> {data?.employeeProfile?.employeeCode || "-"}</div>
            <div><span className="font-medium">Department:</span> {data?.employeeProfile?.department?.name || "-"}</div>
            <div><span className="font-medium">Joining Date:</span> {data?.employeeProfile?.joiningDate ? new Date(data.employeeProfile.joiningDate).toLocaleDateString() : "-"}</div>
            <div><span className="font-medium">Base CTC:</span> {data?.employeeProfile?.baseCtc || "-"}</div>
            <div><span className="font-medium">Bank Account Number:</span> {data?.employeeProfile?.bankAccountNumber || "-"}</div>
            <div><span className="font-medium">Bank IFSC:</span> {data?.employeeProfile?.bankIfsc || "-"}</div>
            <div><span className="font-medium">Bank Name:</span> {data?.employeeProfile?.bankName || "-"}</div>
            <div><span className="font-medium">Account Holder:</span> {data?.employeeProfile?.bankAccountHolderName || "-"}</div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
