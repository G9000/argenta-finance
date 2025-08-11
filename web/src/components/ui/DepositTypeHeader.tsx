"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DepositTypeHeaderProps {
  isMultiChainMode: boolean;
  selectedChainName: string;
  activeChainCount: number;
  tokenLabel?: string;
  showActiveCount?: boolean;
}

export function DepositTypeHeader({
  isMultiChainMode,
  selectedChainName,
  activeChainCount,
  tokenLabel = "Deposit USDC",
  showActiveCount = true,
}: DepositTypeHeaderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3">
        <div className="text-xs text-gray-400 uppercase tracking-wide">
          {tokenLabel}
        </div>
        <div
          className={cn(
            "px-2 py-0.5 border text-[10px] font-mono tracking-wide",
            isMultiChainMode
              ? "bg-teal-500/10 text-teal-400 border-teal-500/30"
              : "bg-gray-700/50 text-gray-300 border-white/10"
          )}
        >
          {isMultiChainMode ? "MULTI" : "SINGLE"}
        </div>
        {isMultiChainMode && showActiveCount && (
          <div className="text-[10px] font-mono text-gray-500">
            {activeChainCount} active
          </div>
        )}
      </div>
      <div className="text-xs text-gray-300 leading-relaxed">
        {isMultiChainMode ? (
          <span>
            Set amounts per chain below. Deposits execute sequentially in one
            flow.
          </span>
        ) : (
          <span>
            Target Chain:{" "}
            <span className="text-teal-400">{selectedChainName}</span>
          </span>
        )}
      </div>
    </div>
  );
}
