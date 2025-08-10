"use client";

import { cn } from "@/lib/utils";

export type AlertType = "error" | "warning" | "info" | "success";

interface AlertProps {
  type: AlertType;
  title?: string;
  message: string;
  className?: string;
  onDismiss?: () => void;
}

const alertStyles = {
  error: "bg-red-500/10 border-red-500/20 text-red-400",
  warning: "bg-yellow-500/10 border-yellow-500/20 text-yellow-600",
  info: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  success: "bg-green-500/10 border-green-500/20 text-green-400",
};

const alertIcons = {
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
  success: "✅",
};

export function Alert({
  type,
  title,
  message,
  className,
  onDismiss,
}: AlertProps) {
  return (
    <div
      className={cn(
        "p-3 border rounded font-mono text-sm relative",
        alertStyles[type],
        className
      )}
      role="alert"
    >
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-current opacity-50 hover:opacity-100 transition-opacity"
          aria-label="Dismiss alert"
        >
          ×
        </button>
      )}

      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 mt-0.5" aria-hidden="true">
          {alertIcons[type]}
        </span>
        <div className="flex-1">
          {title && <div className="font-semibold mb-1">{title}</div>}
          <div>{message}</div>
        </div>
      </div>
    </div>
  );
}

interface ErrorDisplayProps {
  error?: string | null;
  errors?: string[];
  warnings?: string[];
  className?: string;
  onDismiss?: () => void;
}

export function ErrorDisplay({
  error,
  errors = [],
  warnings = [],
  className,
  onDismiss,
}: ErrorDisplayProps) {
  const allErrors = error ? [error, ...errors] : errors;

  if (allErrors.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {allErrors.map((errorMsg, index) => (
        <Alert
          key={`error-${index}`}
          type="error"
          message={errorMsg}
          onDismiss={index === 0 ? onDismiss : undefined}
        />
      ))}

      {warnings.map((warning, index) => (
        <Alert key={`warning-${index}`} type="warning" message={warning} />
      ))}
    </div>
  );
}
