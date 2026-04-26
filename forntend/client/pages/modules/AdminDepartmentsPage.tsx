import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/error-message";

interface Department {
  id: string;
  name: string;
  description?: string;
}

export default function AdminDepartmentsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const departments = useQuery({
    queryKey: ["admin-departments"],
    queryFn: () => api.get<{ success: boolean; data: Department[] }>("/departments")
  });

  const createDepartment = useMutation({
    mutationFn: () => api.post<{ success: boolean; data: Department }>("/departments", { name, description }),
    onSuccess: async () => {
      setName("");
      setDescription("");
      setError("");
      setMessage("Department created successfully.");
      await queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
    },
    onError: (err) => {
      setMessage("");
      setError(toUserErrorMessage(err, "Unable to create department."));
    }
  });

  const updateDepartment = useMutation({
    mutationFn: (payload: { id: string; name: string; description?: string }) =>
      api.patch(`/departments/${payload.id}`, { name: payload.name, description: payload.description }),
    onSuccess: async () => {
      setEditingId(null);
      setMessage("Department updated successfully.");
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
    },
    onError: (err) => {
      setMessage("");
      setError(toUserErrorMessage(err, "Unable to update department."));
    }
  });

  const deleteDepartment = useMutation({
    mutationFn: (id: string) => api.del(`/departments/${id}`),
    onSuccess: async () => {
      setMessage("Department deleted. Employee department mapping removed.");
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
    },
    onError: (err) => {
      setMessage("");
      setError(toUserErrorMessage(err, "Unable to delete department."));
    }
  });

  return (
    <DashboardLayout role="admin">
      <div className="p-4 md:p-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Department Management</h1>
          <p className="text-muted-foreground mt-1">Add, edit and delete departments with safe employee detachment</p>
        </header>

        <section className="card-premium p-6">
          <h2 className="text-xl font-semibold">Add Department</h2>
          <form
            className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setMessage("");
              setError("");
              createDepartment.mutate();
            }}
          >
            <input className="input-premium" placeholder="Department name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input className="input-premium" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="md:col-span-2 flex items-center gap-3">
              <button className="btn-primary" disabled={createDepartment.isPending}>{createDepartment.isPending ? "Creating..." : "Create"}</button>
              {message && <p className="text-sm text-success">{message}</p>}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </form>
        </section>

        <section className="card-premium p-6">
          <h2 className="text-xl font-semibold">Departments</h2>
          {departments.isLoading ? (
            <p className="text-sm text-muted-foreground mt-3">Loading departments...</p>
          ) : (
            <div className="mt-4 space-y-3">
              {(departments.data?.data || []).map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  {editingId === item.id ? (
                    <div className="space-y-3">
                      <input className="input-premium" value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                      <input className="input-premium" value={editingDescription} onChange={(e) => setEditingDescription(e.target.value)} />
                      <div className="flex gap-2">
                        <button
                          className="btn-primary"
                          onClick={() => updateDepartment.mutate({ id: item.id, name: editingName, description: editingDescription || undefined })}
                        >
                          Save
                        </button>
                        <button className="btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.description || "No description"}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditingName(item.name);
                            setEditingDescription(item.description || "");
                          }}
                        >
                          Edit
                        </button>
                        <button className="btn-secondary" onClick={() => deleteDepartment.mutate(item.id)}>Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
