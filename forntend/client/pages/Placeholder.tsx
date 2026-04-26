import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap } from "lucide-react";

export default function Placeholder() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/20 dark:bg-primary-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-200/20 dark:bg-accent-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
      </div>

      <div className="w-full max-w-lg z-10">
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-600 to-accent flex items-center justify-center">
              <Zap className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold font-['Plus_Jakarta_Sans']">
              Page Under Construction
            </h1>
            <p className="text-lg text-muted-foreground">
              This page is coming soon. Our team is working hard to bring you amazing features!
            </p>
          </div>

          {/* Info Box */}
          <div className="card-premium p-6 bg-primary/5 border border-primary/20">
            <p className="text-sm text-foreground mb-4">
              In the meantime, you can:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground text-left">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Explore other dashboard features
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Check your profile and settings
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                Connect with support team
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-border hover:bg-muted transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <button
              onClick={() => navigate("/dashboard/admin")}
              className="btn-primary"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
