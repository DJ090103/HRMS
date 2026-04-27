import "./global.css";

import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Auth from "@/pages/Auth";
import AdminDashboard from "@/pages/AdminDashboard";
import HRDashboard from "@/pages/HRDashboard";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import ModulePage from "@/pages/modules/ModulePage";
import AdminEmployeesPage from "@/pages/modules/AdminEmployeesPage";
import AdminDepartmentsPage from "@/pages/modules/AdminDepartmentsPage";
import AttendanceAnalyticsPage from "@/pages/modules/AttendanceAnalyticsPage";
import EmployeeAttendancePage from "@/pages/modules/EmployeeAttendancePage";
import ProfilePage from "@/pages/modules/ProfilePage";
import LeaveRequestsPage from "@/pages/modules/LeaveRequestsPage";
import ReimbursementsPage from "@/pages/modules/ReimbursementsPage";
import PayslipCenterPage from "@/pages/modules/PayslipCenterPage";
import AdminNoticesPage from "@/pages/modules/AdminNoticesPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function RootRedirect() {
  const { role, isAuthenticated } = useAuth();

  if (!isAuthenticated || !role) {
    return <Navigate to="/auth" replace />;
  }

  return <Navigate to={`/dashboard/${role}`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />

            <Route
              path="/dashboard/admin"
              element={
                <ProtectedRoute allow={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/employees"
              element={
                <ProtectedRoute allow={["admin"]}>
                  <AdminEmployeesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/departments"
              element={
                <ProtectedRoute allow={["admin"]}>
                  <AdminDepartmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/attendance"
              element={
                <ProtectedRoute allow={["admin"]}>
                  <AttendanceAnalyticsPage role="admin" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/leave-approvals"
              element={
                <ProtectedRoute allow={["admin"]}>
                  <LeaveRequestsPage role="admin" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/reimbursements"
              element={
                <ProtectedRoute allow={["admin"]}>
                  <ReimbursementsPage role="admin" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/payroll"
              element={
                <ProtectedRoute allow={["admin"]}>
                  <PayslipCenterPage role="admin" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/notices"
              element={
                <ProtectedRoute allow={["admin"]}>
                  <AdminNoticesPage role="admin" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/profile"
              element={
                <ProtectedRoute allow={["admin"]}>
                  <ProfilePage role="admin" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin/*"
              element={
                <ProtectedRoute allow={["admin"]}>
                  <ModulePage role="admin" />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/hr"
              element={
                <ProtectedRoute allow={["hr"]}>
                  <HRDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/hr/attendance"
              element={
                <ProtectedRoute allow={["hr"]}>
                  <AttendanceAnalyticsPage role="hr" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/hr/reports"
              element={
                <ProtectedRoute allow={["hr"]}>
                  <AttendanceAnalyticsPage role="hr" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/hr/leave-approvals"
              element={
                <ProtectedRoute allow={["hr"]}>
                  <LeaveRequestsPage role="hr" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/hr/payroll"
              element={
                <ProtectedRoute allow={["hr"]}>
                  <PayslipCenterPage role="hr" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/hr/notices"
              element={
                <ProtectedRoute allow={["hr"]}>
                  <AdminNoticesPage role="hr" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/hr/profile"
              element={
                <ProtectedRoute allow={["hr"]}>
                  <ProfilePage role="hr" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/hr/*"
              element={
                <ProtectedRoute allow={["hr"]}>
                  <ModulePage role="hr" />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard/employee"
              element={
                <ProtectedRoute allow={["employee"]}>
                  <EmployeeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/employee/attendance"
              element={
                <ProtectedRoute allow={["employee"]}>
                  <EmployeeAttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/employee/leave"
              element={
                <ProtectedRoute allow={["employee"]}>
                  <LeaveRequestsPage role="employee" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/employee/reimbursements"
              element={
                <ProtectedRoute allow={["employee"]}>
                  <ReimbursementsPage role="employee" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/employee/salary"
              element={
                <ProtectedRoute allow={["employee"]}>
                  <PayslipCenterPage role="employee" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/employee/profile"
              element={
                <ProtectedRoute allow={["employee"]}>
                  <ProfilePage role="employee" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/employee/*"
              element={
                <ProtectedRoute allow={["employee"]}>
                  <ModulePage role="employee" />
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
