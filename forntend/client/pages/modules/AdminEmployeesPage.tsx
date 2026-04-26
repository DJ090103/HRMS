import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/error-message";

interface Department {
  id: string;
  name: string;
}

interface EmployeeProfile {
  id: string;
  designation: string;
  departmentId?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  bankAccountHolderName?: string | null;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "HR_MANAGER" | "EMPLOYEE" | "SUPER_ADMIN";
  isActive: boolean;
  employeeProfile?: EmployeeProfile;
}

export default function AdminEmployeesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "EMPLOYEE",
    departmentId: "",
    designation: "",
    joiningDate: new Date().toISOString(),
    employeeCode: "",
    baseCtc: "",
    basicPercent: "40",
    hraPercent: "20",
    allowancesMonthly: "0",
    professionalTax: ""
  });
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editingPayload, setEditingPayload] = useState({
    firstName: "",
    lastName: "",
    designation: "",
    departmentId: "",
    isActive: true,
    bankAccountNumber: "",
    bankIfsc: "",
    bankName: "",
    bankAccountHolderName: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const employees = useQuery({
    queryKey: ["admin-employees"],
    queryFn: () => api.get<{ success: boolean; data: Employee[] }>("/users")
  });

  const departments = useQuery({
    queryKey: ["admin-departments"],
    queryFn: () => api.get<{ success: boolean; data: Department[] }>("/departments")
  });

  const createEmployee = useMutation({
    mutationFn: async () => {
      return api.post("/users", {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        role: form.role,
        departmentId: form.departmentId || undefined,
        designation: form.designation,
        joiningDate: form.joiningDate,
        employeeCode: form.employeeCode,
        baseCtc: Number(form.baseCtc),
        basicPercent: Number(form.basicPercent),
        hraPercent: Number(form.hraPercent),
        allowancesMonthly: Number(form.allowancesMonthly),
        professionalTax: form.professionalTax ? Number(form.professionalTax) : undefined
      });
    },
    onSuccess: async () => {
      setMessage("Employee onboarded successfully.");
      setError("");
      setForm((prev) => ({
        ...prev,
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        designation: "",
        employeeCode: "",
        baseCtc: "",
        professionalTax: ""
      }));
      await queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
    },
    onError: (err) => {
      setMessage("");
      setError(toUserErrorMessage(err, "Unable to onboard employee."));
    }
  });

  const updateEmployee = useMutation({
    mutationFn: (payload: { id: string; body: unknown }) => api.patch(`/users/${payload.id}`, payload.body),
    onSuccess: async () => {
      setMessage("Employee updated successfully.");
      setError("");
      setEditingEmployeeId(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
    },
    onError: (err) => {
      setMessage("");
      setError(toUserErrorMessage(err, "Unable to update employee."));
    }
  });

  const deleteEmployee = useMutation({
    mutationFn: (id: string) => api.del(`/users/${id}`),
    onSuccess: async () => {
      setMessage("Employee deleted successfully.");
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
    },
    onError: (err) => {
      setMessage("");
      setError(toUserErrorMessage(err, "Unable to delete employee."));
    }
  });

  const minJoinDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  return (
    <DashboardLayout role="admin">
      <div className="p-4 md:p-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Employee Management</h1>
          <p className="text-muted-foreground mt-1">Onboard, activate/inactivate, edit profile, department and bank details</p>
        </header>

        <section className="card-premium p-6">
          <h2 className="text-xl font-semibold">Add New Employee</h2>
          <form
            className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setMessage("");
              setError("");
              createEmployee.mutate();
            }}
          >
            <input className="input-premium" placeholder="First name" value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} required />
            <input className="input-premium" placeholder="Last name" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} required />
            <input type="email" className="input-premium" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            <input type="password" className="input-premium" placeholder="Temporary password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />

            <select className="input-premium" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
              <option value="EMPLOYEE">Employee</option>
              <option value="HR_MANAGER">HR Manager</option>
            </select>

            <select className="input-premium" value={form.departmentId} onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}>
              <option value="">No department</option>
              {(departments.data?.data || []).map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>

            <input className="input-premium" placeholder="Designation" value={form.designation} onChange={(e) => setForm((p) => ({ ...p, designation: e.target.value }))} required />
            <input type="datetime-local" min={`${minJoinDate}T00:00`} className="input-premium" value={form.joiningDate.slice(0, 16)} onChange={(e) => setForm((p) => ({ ...p, joiningDate: new Date(e.target.value).toISOString() }))} required />

            <input className="input-premium" placeholder="Employee code" value={form.employeeCode} onChange={(e) => setForm((p) => ({ ...p, employeeCode: e.target.value }))} required />
            <input type="number" className="input-premium" placeholder="Annual CTC" value={form.baseCtc} onChange={(e) => setForm((p) => ({ ...p, baseCtc: e.target.value }))} required />

            <input type="number" className="input-premium" placeholder="Basic %" value={form.basicPercent} onChange={(e) => setForm((p) => ({ ...p, basicPercent: e.target.value }))} required />
            <input type="number" className="input-premium" placeholder="HRA %" value={form.hraPercent} onChange={(e) => setForm((p) => ({ ...p, hraPercent: e.target.value }))} required />

            <input type="number" className="input-premium" placeholder="Allowances monthly" value={form.allowancesMonthly} onChange={(e) => setForm((p) => ({ ...p, allowancesMonthly: e.target.value }))} />
            <input type="number" className="input-premium" placeholder="Professional tax (optional)" value={form.professionalTax} onChange={(e) => setForm((p) => ({ ...p, professionalTax: e.target.value }))} />

            <div className="md:col-span-2 flex items-center gap-3">
              <button className="btn-primary" disabled={createEmployee.isPending}>{createEmployee.isPending ? "Creating..." : "Onboard Employee"}</button>
              {message && <p className="text-sm text-success">{message}</p>}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </form>
        </section>

        <section className="card-premium p-6">
          <h2 className="text-xl font-semibold">Employees</h2>
          {employees.isLoading ? (
            <p className="text-sm text-muted-foreground mt-3">Loading employees...</p>
          ) : (
            <div className="mt-4 space-y-3">
              {(employees.data?.data || []).map((user) => (
                <div key={user.id} className="rounded-lg border border-border p-4">
                  {editingEmployeeId === user.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input className="input-premium" value={editingPayload.firstName} onChange={(e) => setEditingPayload((p) => ({ ...p, firstName: e.target.value }))} />
                      <input className="input-premium" value={editingPayload.lastName} onChange={(e) => setEditingPayload((p) => ({ ...p, lastName: e.target.value }))} />
                      <input className="input-premium" value={editingPayload.designation} onChange={(e) => setEditingPayload((p) => ({ ...p, designation: e.target.value }))} />
                      <select className="input-premium" value={editingPayload.departmentId} onChange={(e) => setEditingPayload((p) => ({ ...p, departmentId: e.target.value }))}>
                        <option value="">No department</option>
                        {(departments.data?.data || []).map((dept) => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                      <input className="input-premium" placeholder="Bank account no" value={editingPayload.bankAccountNumber} onChange={(e) => setEditingPayload((p) => ({ ...p, bankAccountNumber: e.target.value }))} />
                      <input className="input-premium" placeholder="IFSC" value={editingPayload.bankIfsc} onChange={(e) => setEditingPayload((p) => ({ ...p, bankIfsc: e.target.value }))} />
                      <input className="input-premium" placeholder="Bank name" value={editingPayload.bankName} onChange={(e) => setEditingPayload((p) => ({ ...p, bankName: e.target.value }))} />
                      <input className="input-premium" placeholder="Account holder name" value={editingPayload.bankAccountHolderName} onChange={(e) => setEditingPayload((p) => ({ ...p, bankAccountHolderName: e.target.value }))} />
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={editingPayload.isActive} onChange={(e) => setEditingPayload((p) => ({ ...p, isActive: e.target.checked }))} />
                        Active
                      </label>
                      <div className="flex gap-2 md:col-span-2">
                        <button
                          className="btn-primary"
                          onClick={() =>
                            updateEmployee.mutate({
                              id: user.id,
                              body: {
                                firstName: editingPayload.firstName,
                                lastName: editingPayload.lastName,
                                designation: editingPayload.designation,
                                departmentId: editingPayload.departmentId || null,
                                isActive: editingPayload.isActive,
                                bankAccountNumber: editingPayload.bankAccountNumber || undefined,
                                bankIfsc: editingPayload.bankIfsc || undefined,
                                bankName: editingPayload.bankName || undefined,
                                bankAccountHolderName: editingPayload.bankAccountHolderName || undefined
                              }
                            })
                          }
                        >
                          Save
                        </button>
                        <button className="btn-secondary" onClick={() => setEditingEmployeeId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="font-medium">{user.firstName} {user.lastName} <span className="text-xs text-muted-foreground">({user.role})</span></p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">Status: {user.isActive ? "Active" : "Inactive"}</p>
                        <p className="text-xs text-muted-foreground">Department: {departments.data?.data?.find((d) => d.id === user.employeeProfile?.departmentId)?.name || "None"}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            setEditingEmployeeId(user.id);
                            setEditingPayload({
                              firstName: user.firstName,
                              lastName: user.lastName,
                              designation: user.employeeProfile?.designation || "",
                              departmentId: user.employeeProfile?.departmentId || "",
                              isActive: user.isActive,
                              bankAccountNumber: user.employeeProfile?.bankAccountNumber || "",
                              bankIfsc: user.employeeProfile?.bankIfsc || "",
                              bankName: user.employeeProfile?.bankName || "",
                              bankAccountHolderName: user.employeeProfile?.bankAccountHolderName || ""
                            });
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() =>
                            updateEmployee.mutate({
                              id: user.id,
                              body: { isActive: !user.isActive }
                            })
                          }
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button className="btn-secondary" onClick={() => deleteEmployee.mutate(user.id)}>Delete</button>
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
