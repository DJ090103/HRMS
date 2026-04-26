import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  CheckSquare,
  Briefcase,
  Clock,
  DollarSign,
  AlertCircle,
  Menu,
  X,
  FileText,
  UserCheck
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface SidebarProps {
  role: "admin" | "hr" | "employee";
}

export default function Sidebar({ role }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const adminMenu = [
    { label: "Dashboard", icon: Home, path: "/dashboard/admin" },
    { label: "Employees", icon: Users, path: "/dashboard/admin/employees" },
    { label: "Departments", icon: Briefcase, path: "/dashboard/admin/departments" },
    { label: "Attendance", icon: Clock, path: "/dashboard/admin/attendance" },
    { label: "Leave Approvals", icon: CheckSquare, path: "/dashboard/admin/leave-approvals" },
    { label: "Payroll", icon: DollarSign, path: "/dashboard/admin/payroll" },
    { label: "Recruitment", icon: Briefcase, path: "/dashboard/admin/recruitment" },
    { label: "Reports", icon: BarChart3, path: "/dashboard/admin/reports" },
    { label: "Reimbursements", icon: AlertCircle, path: "/dashboard/admin/reimbursements" },
    { label: "Settings", icon: Settings, path: "/dashboard/admin/settings" }
  ];

  const hrMenu = [
    { label: "Dashboard", icon: Home, path: "/dashboard/hr" },
    { label: "Onboarding", icon: UserCheck, path: "/dashboard/hr/onboarding" },
    { label: "Attendance", icon: Clock, path: "/dashboard/hr/attendance" },
    { label: "Leave Approvals", icon: CheckSquare, path: "/dashboard/hr/leave-approvals" },
    { label: "Departments", icon: Briefcase, path: "/dashboard/hr/departments" },
    { label: "Performance", icon: BarChart3, path: "/dashboard/hr/performance" },
    { label: "Recruitment", icon: Users, path: "/dashboard/hr/recruitment" },
    { label: "Reports", icon: FileText, path: "/dashboard/hr/reports" }
  ];

  const employeeMenu = [
    { label: "Dashboard", icon: Home, path: "/dashboard/employee" },
    { label: "Attendance", icon: Clock, path: "/dashboard/employee/attendance" },
    { label: "Leave", icon: CheckSquare, path: "/dashboard/employee/leave" },
    { label: "Salary Slips", icon: DollarSign, path: "/dashboard/employee/salary" },
    { label: "Reimbursements", icon: AlertCircle, path: "/dashboard/employee/reimbursements" },
    { label: "Help Desk", icon: Briefcase, path: "/dashboard/employee/helpdesk" },
    { label: "Profile", icon: Users, path: "/dashboard/employee/profile" }
  ];

  const menu = role === "admin" ? adminMenu : role === "hr" ? hrMenu : employeeMenu;

  const isActive = (path: string) => {
    const isDashboardRoot = /^\/dashboard\/(admin|hr|employee)$/.test(path);
    if (isDashboardRoot) {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/auth", { replace: true });
  };

  return (
    <>
      <button onClick={() => setMobileOpen(!mobileOpen)} className="fixed top-4 left-4 z-50 lg:hidden p-2 hover:bg-muted rounded-lg">
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={`fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 z-40 lg:sticky lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 w-72" : "-translate-x-full w-72 lg:translate-x-0"
        } ${collapsed && "lg:w-20"}`}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3 group" onClick={() => setMobileOpen(false)}>
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            {!collapsed && <span className="font-bold text-white font-['Plus_Jakarta_Sans']">HRFlow</span>}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2">
          {menu.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative ${
                  active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="font-medium flex-1">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3 space-y-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform ${collapsed ? "rotate-90" : ""}`} />
            {!collapsed && <span className="text-sm font-medium">Collapse</span>}
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
