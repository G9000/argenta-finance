"use client";

import { cn } from "@/lib/utils";
import { TransactionProgress, ProgressStep } from "./TransactionProgress";
import { Alert } from "./Alert";

interface TransactionStatusProps {
  isActive: boolean;
  error?: string | null;
  progress?: ProgressStep;
  className?: string;
  onDismissError?: () => void;
}

export function TransactionStatus({
  isActive,
  error,
  progress,
  className,
  onDismissError,
}: TransactionStatusProps) {
  if (!isActive && !error) return null;

  return (
    <div
      className={cn(
        "p-3 border rounded font-mono text-sm",
        error
          ? "bg-red-500/10 border-red-500/20"
          : "bg-teal-500/10 border-teal-500/20",
        className
      )}
      role={error ? undefined : "status"}
    >
      {error ? (
        <Alert
          type="error"
          title="Transaction Error"
          message={error}
          onDismiss={onDismissError}
        />
      ) : (
        progress && (
          <TransactionProgress
            progress={progress}
            status={isActive ? "pending" : "success"}
          />
        )
      )}
    </div>
  );
}
