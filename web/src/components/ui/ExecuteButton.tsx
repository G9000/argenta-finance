"use client";

import { cn } from "@/lib/utils";

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
        "w-full p-4 font-mono uppercase text-sm transition-colors relative",
        !disabled
          ? "bg-teal-500 text-white hover:bg-teal-600"
          : "bg-gray-700 text-gray-400 cursor-not-allowed"
      )}
    >
      {isProcessing && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <div className="size-4 border border-current border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <span className={cn(isProcessing && "ml-6")}>{text}</span>
    </button>
  );
}
