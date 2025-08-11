"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DepositTypeModeToggleProps {
  isMultiChainMode: boolean;
  onToggle: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
}

export function DepositTypeModeToggle({
  isMultiChainMode,
  onToggle,
  disabled = false,
  isProcessing = false,
}: DepositTypeModeToggleProps) {
  return (
    <div
      className={cn(
        "relative flex overflow-hidden border border-white/10 ml-auto",
        "text-xs font-mono"
      )}
      role="tablist"
      aria-label="Mode selection"
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-y-0 w-1/2 bg-teal-500/10 transition-transform duration-200 ease-out",
          isMultiChainMode ? "translate-x-full" : "translate-x-0"
        )}
        style={{ willChange: "transform" }}
      />

      <button
        type="button"
        role="tab"
        aria-selected={!isMultiChainMode}
        tabIndex={!isMultiChainMode ? 0 : -1}
        onClick={() => isMultiChainMode && onToggle()}
        disabled={disabled || isProcessing}
        className={cn(
          "relative z-10 flex-1 px-4 py-2 transition-colors outline-none",
          "focus-visible:bg-teal-500/5",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          !isMultiChainMode ? "text-teal-400" : "text-gray-400 hover:text-white"
        )}
      >
        SINGLE
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={isMultiChainMode}
        tabIndex={isMultiChainMode ? 0 : -1}
        onClick={() => !isMultiChainMode && onToggle()}
        disabled={disabled || isProcessing}
        className={cn(
          "relative z-10 flex-1 px-4 py-2 transition-colors outline-none",
          "focus-visible:bg-teal-500/5",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isMultiChainMode ? "text-teal-400" : "text-gray-400 hover:text-white"
        )}
      >
        MULTI
      </button>
    </div>
  );
}
