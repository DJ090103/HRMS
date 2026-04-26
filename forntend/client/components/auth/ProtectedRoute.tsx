import { Navigate } from "react-router-dom";
import type { AppRole } from "@/types/hrms";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allow?: AppRole[];
}

export default function ProtectedRoute({ children, allow }: ProtectedRouteProps) {
  const { isAuthenticated, role, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card-premium p-6 text-sm text-muted-foreground">Verifying secure session...</div>
      </div>
    );
  }

  if (!isAuthenticated || !role) {
    return <Navigate to="/auth" replace />;
  }

  if (allow && !allow.includes(role)) {
    return <Navigate to={`/dashboard/${role}`} replace />;
  }

  return <>{children}</>;
}
