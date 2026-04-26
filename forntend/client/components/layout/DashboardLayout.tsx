import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: "admin" | "hr" | "employee";
}

export default function DashboardLayout({
  children,
  role,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-background dark:bg-slate-900">
      {/* Sidebar */}
      <Sidebar role={role} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden ml-0 lg:ml-0">
        {/* Navbar */}
        <Navbar role={role} />

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
