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
