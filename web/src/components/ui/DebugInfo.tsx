"use client";

import { cn } from "@/lib/utils";

interface DebugInfoProps {
  items: Record<string, string | number | bigint | undefined | null>;
  title?: string;
  show?: boolean;
  className?: string;
}

export function DebugInfo({
  items,
  title = "DEV Debug Info:",
  show = process.env.NODE_ENV === "development",
  className,
}: DebugInfoProps) {
  if (!show) return null;

  return (
    <div className={cn("text-xs text-gray-400 font-mono space-y-1", className)}>
      <div className="font-semibold">{title}</div>
      {Object.entries(items).map(([key, value]) => (
        <div key={key} className="break-all">
          <span className="text-gray-500">{key}:</span>{" "}
          <span className="text-gray-300">
            {value != null ? value.toString() : "Loading..."}
          </span>
        </div>
      ))}
    </div>
  );
}
