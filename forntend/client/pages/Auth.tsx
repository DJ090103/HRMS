import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck, Building2, Mail, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/error-message";

export default function Auth() {
  const navigate = useNavigate();
  const { login, role, isAuthenticated } = useAuth();

  const [companyId, setCompanyId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");

  const defaultRedirect = useMemo(() => {
    if (role === "admin") return "/dashboard/admin";
    if (role === "hr") return "/dashboard/hr";
    return "/dashboard/employee";
  }, [role]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(defaultRedirect, { replace: true });
    }
  }, [defaultRedirect, isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);
    try {
      await login({ companyId, email, password, otp: otp || undefined });
      navigate("/", { replace: true });
    } catch (err) {
      setError(toUserErrorMessage(err, "Unable to login at the moment."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsLoading(true);
    try {
      await api.post("/auth/forgot-password", { companyId, email });
      setSuccessMessage("Password reset OTP sent successfully. Please check your email inbox.");
      setMode("login");
    } catch (err) {
      setError(toUserErrorMessage(err, "Unable to send password reset OTP."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md z-10 space-y-6">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 to-accent flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="mt-4 text-3xl font-bold font-['Plus_Jakarta_Sans'] gradient-text">HRFlow Secure Access</h1>
          <p className="text-sm text-muted-foreground mt-1">Enterprise authentication with session controls</p>
        </div>

        <div className="card-premium p-8">
          <div className="flex gap-2 mb-6 rounded-lg bg-muted p-1">
            <button onClick={() => setMode("login")} className={`flex-1 py-2 text-sm rounded-md ${mode === "login" ? "bg-card shadow" : ""}`}>Login</button>
            <button onClick={() => setMode("forgot")} className={`flex-1 py-2 text-sm rounded-md ${mode === "forgot" ? "bg-card shadow" : ""}`}>Forgot Password</button>
          </div>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium flex items-center gap-2"><Building2 className="w-4 h-4" /> Company ID</span>
                <input value={companyId} onChange={(e) => setCompanyId(e.target.value)} required className="input-premium" placeholder="company_cuid" />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium flex items-center gap-2"><Mail className="w-4 h-4" /> Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-premium" placeholder="you@company.com" />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium flex items-center gap-2"><Lock className="w-4 h-4" /> Password</span>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="input-premium pr-10" placeholder="Enter password" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">OTP (Optional / 2FA)</span>
                <input value={otp} onChange={(e) => setOtp(e.target.value)} className="input-premium" maxLength={6} placeholder="6-digit OTP" />
              </label>

              {error && <p className="text-xs text-destructive">{error}</p>}
              {successMessage && <p className="text-xs text-success">{successMessage}</p>}

              <button disabled={isLoading} type="submit" className="btn-primary w-full disabled:opacity-60">
                {isLoading ? "Signing in..." : "Secure Login"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Company ID</span>
                <input value={companyId} onChange={(e) => setCompanyId(e.target.value)} required className="input-premium" placeholder="company_cuid" />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Email</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="input-premium" placeholder="you@company.com" />
              </label>
              {error && <p className="text-xs text-destructive">{error}</p>}
              {successMessage && <p className="text-xs text-success">{successMessage}</p>}
              <button disabled={isLoading} type="submit" className="btn-primary w-full disabled:opacity-60">
                {isLoading ? "Sending..." : "Send Reset OTP"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
