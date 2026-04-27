import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, Moon, Search, Settings, Sun, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import type { ApiEnvelope } from "@/types/hrms";

interface NavbarProps {
  role: "admin" | "hr" | "employee";
}

interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  metadata?: { type?: string };
}

export default function Navbar({ role }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const notifications = useQuery({
    queryKey: ["navbar-notifications"],
    queryFn: () => api.get<ApiEnvelope<Notification[]>>("/notifications/mine")
  });

  const unreadCount = useMemo(
    () => (notifications.data?.data || []).filter((item) => !item.isRead).length,
    [notifications.data?.data]
  );

  const roleName = role === "admin" ? "Super Admin" : role === "hr" ? "HR Manager" : "Employee";
  const initials = `${user?.firstName?.[0] || "U"}${user?.lastName?.[0] || ""}`.toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate("/auth", { replace: true });
  };

  return (
    <nav className="sticky top-0 z-30 h-20 bg-card border-b border-border backdrop-blur-sm bg-white/95 dark:bg-slate-800/95">
      <div className="h-full px-4 md:px-8 flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <label className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border bg-muted">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search employees, docs or modules" className="flex-1 bg-transparent outline-none text-sm" />
          </label>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={() => {
              setIsDark((prev) => !prev);
              document.documentElement.classList.toggle("dark");
            }}
            className="p-2 hover:bg-muted rounded-lg transition-colors hidden md:inline-flex"
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5 text-warning" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
          </button>

          <div ref={notificationRef} className="relative">
            <button onClick={() => setNotificationOpen((v) => !v)} className="relative p-2 hover:bg-muted rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-destructive rounded-full" />}
            </button>

            {notificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {(notifications.data?.data || []).slice(0, 8).map((item) => (
                    <button key={item.id} className="w-full px-4 py-3 border-b border-border/50 hover:bg-muted transition-colors text-left">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                        {item.metadata?.type === "NOTICE" && (
                          <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">Notice</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.body}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div ref={profileRef} className="relative">
            <button onClick={() => setProfileOpen((v) => !v)} className="flex items-center gap-2 ml-2 md:ml-4 group">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{user ? `${user.firstName} ${user.lastName}` : "User"}</p>
                <p className="text-xs text-muted-foreground">{roleName}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-600 to-accent flex items-center justify-center text-white font-bold text-sm">
                {initials}
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-muted/50">
                  <p className="text-sm font-semibold">{user ? `${user.firstName} ${user.lastName}` : "User"}</p>
                  <p className="text-xs text-muted-foreground">{roleName}</p>
                </div>
                <div className="p-2 space-y-1">
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm">
                    <User className="w-4 h-4" /> Profile
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm">
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                </div>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium border-t border-border">
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
