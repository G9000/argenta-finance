"use client";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  "aria-label"?: string;
}

export function LoadingSpinner({
  size = "md",
  className,
  "aria-label": ariaLabel = "Loading",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "size-3",
    md: "size-4",
    lg: "size-6",
  };

  return (
    <div
      className={cn(
        "border border-current border-t-transparent rounded-full animate-spin",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={ariaLabel}
    />
  );
}
