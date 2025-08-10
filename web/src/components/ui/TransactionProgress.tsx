"use client";

import { cn } from "@/lib/utils";
import { LoadingSpinner } from "./LoadingSpinner";

export interface ProgressStep {
  stepNumber: number;
  totalSteps: number;
  percentage: string;
  currentStepLabel?: string;
  description?: string;
}

interface TransactionProgressProps {
  progress: ProgressStep;
  status?: "pending" | "success" | "error";
  className?: string;
}

export function TransactionProgress({
  progress,
  status = "pending",
  className,
}: TransactionProgressProps) {
  const numericPercentage = Math.max(
    0,
    Math.min(100, parseFloat(progress.percentage) || 0)
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span>Progress</span>
          <span>
            {progress.stepNumber}/{progress.totalSteps}
          </span>
        </div>
        <div
          className="w-full bg-gray-600 rounded-full h-1.5"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={numericPercentage}
          aria-label={`Transaction progress: ${numericPercentage}% complete`}
        >
          <div
            className={cn(
              "h-1.5 rounded-full transition-all duration-500",
              status === "success"
                ? "bg-green-400"
                : status === "error"
                ? "bg-red-400"
                : "bg-teal-400"
            )}
            style={{
              width: `${numericPercentage}%`,
            }}
          />
        </div>
      </div>

      {progress.currentStepLabel && (
        <div>
          <div className="font-semibold flex items-center gap-2">
            {status === "pending" && <LoadingSpinner size="sm" />}
            {status === "success" && "✅"}
            {status === "error" && "❌"}
            {progress.currentStepLabel}
          </div>
          {progress.description && (
            <div className="text-xs opacity-75 mt-1">
              {progress.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
