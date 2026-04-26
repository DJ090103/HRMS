import { X, Edit, Trash2, Download } from "lucide-react";

interface DetailField {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
}

interface DetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  fields: DetailField[];
  actions?: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: "primary" | "secondary" | "danger";
  }>;
  children?: React.ReactNode;
}

export default function DetailsPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  fields,
  actions,
  children,
}: DetailsPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card-premium w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border sticky top-0 bg-card">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {fields.map((field, index) => (
              <div
                key={index}
                className={field.fullWidth ? "col-span-full" : ""}
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {field.label}
                </p>
                <div className="text-sm font-medium">{field.value}</div>
              </div>
            ))}
          </div>

          {/* Custom Content */}
          {children && <div>{children}</div>}
        </div>

        {/* Actions Footer */}
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-3 p-6 border-t border-border sticky bottom-0 bg-card">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                  action.variant === "danger"
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : action.variant === "primary"
                      ? "btn-primary"
                      : "btn-secondary"
                }`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
