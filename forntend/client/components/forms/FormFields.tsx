import { ReactNode } from "react";

interface FormGroupProps {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

export function FormGroup({
  label,
  required = false,
  error,
  children,
}: FormGroupProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface FormInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
}

export function FormInput({
  label,
  required,
  error,
  ...props
}: FormInputProps) {
  if (label) {
    return (
      <FormGroup label={label} required={required} error={error}>
        <input className="input-premium" {...props} />
      </FormGroup>
    );
  }

  return <input className="input-premium" {...props} />;
}

interface FormSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  required?: boolean;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export function FormSelect({
  label,
  required,
  error,
  options,
  ...props
}: FormSelectProps) {
  const selectElement = (
    <select
      className="input-premium"
      {...props}
    >
      <option value="">Select an option</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  if (label) {
    return (
      <FormGroup label={label} required={required} error={error}>
        {selectElement}
      </FormGroup>
    );
  }

  return selectElement;
}

interface FormTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  required?: boolean;
  error?: string;
}

export function FormTextarea({
  label,
  required,
  error,
  ...props
}: FormTextareaProps) {
  const textareaElement = (
    <textarea
      className="input-premium resize-none"
      {...props}
    />
  );

  if (label) {
    return (
      <FormGroup label={label} required={required} error={error}>
        {textareaElement}
      </FormGroup>
    );
  }

  return textareaElement;
}

interface FormCheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function FormCheckbox({ label, ...props }: FormCheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        className="w-4 h-4 rounded border-border accent-primary"
        {...props}
      />
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}

interface FormRadioGroupProps {
  label?: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function FormRadioGroup({
  label,
  required,
  options,
  value,
  onChange,
  error,
}: FormRadioGroupProps) {
  const content = (
    <div className="space-y-2">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="radio-group"
            value={opt.value}
            checked={value === opt.value}
            onChange={(e) => onChange(e.target.value)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-sm">{opt.label}</span>
        </label>
      ))}
    </div>
  );

  if (label) {
    return (
      <FormGroup label={label} required={required} error={error}>
        {content}
      </FormGroup>
    );
  }

  return content;
}
