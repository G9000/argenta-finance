"use client";

import { cn } from "@/lib/utils";

interface ValidationMessagesProps {
  errors?: string[];
  warnings?: string[];
  className?: string;
}

export function ValidationMessages({
  errors = [],
  warnings = [],
  className,
}: ValidationMessagesProps) {
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  if (!hasErrors && !hasWarnings) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Error Messages */}
      {hasErrors && (
        <>
          {errors.map((error, index) => (
            <div
              key={`error-${index}`}
              className={cn(
                "text-xs px-3 py-2 border flex items-center gap-2",
                "text-red-400 border-red-400/40 bg-red-400/5"
              )}
            >
              <span className="text-red-500">⚠️</span>
              <span>{error}</span>
            </div>
          ))}
        </>
      )}

      {/* Warning Messages */}
      {hasWarnings && !hasErrors && (
        <>
          {warnings.map((warning, index) => (
            <div
              key={`warning-${index}`}
              className={cn(
                "text-xs px-3 py-2 border flex items-center gap-2",
                "text-yellow-400 border-yellow-400/40 bg-yellow-400/5"
              )}
            >
              <span className="text-yellow-500">💡</span>
              <span>{warning}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
