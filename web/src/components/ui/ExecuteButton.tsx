"use client";

import { cn } from "@/lib/utils";
import { LoadingSpinner } from "./LoadingSpinner";

interface ExecuteButtonProps {
  onClick: () => void;
  disabled: boolean;
  isProcessing: boolean;
  text: string;
}

export function ExecuteButton({
  onClick,
  disabled,
  isProcessing,
  text,
}: ExecuteButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative w-full border border-white/10 bg-gradient-to-br font-mono text-sm uppercase tracking-wide",
        "px-4 py-3 transition-colors duration-200",
        "focus-visible:outline-none focus-visible:bg-teal-500/5",
        !disabled
          ? "from-teal-500/90 to-teal-600/90 text-white hover:from-teal-500 hover:to-teal-600 active:from-teal-600 active:to-teal-700"
          : "from-gray-800/50 to-gray-900/50 text-gray-400 cursor-not-allowed"
      )}
    >
      <div className="flex items-center justify-center gap-3">
        {isProcessing && (
          <LoadingSpinner
            size="sm"
            className="text-white/80"
            aria-label="Processing"
          />
        )}
        <span>{text}</span>
      </div>
    </button>
  );
}
