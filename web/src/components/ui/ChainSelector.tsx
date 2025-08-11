"use client";

import { cn } from "@/lib/utils";
import { getChainName, SupportedChainId } from "@/constant/contracts";

interface ChainSelectorProps {
  chains: readonly SupportedChainId[];
  selectedChainId: SupportedChainId;
  onChainChange: (chainId: SupportedChainId) => void;
  isSwitching?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ChainSelector({
  chains,
  selectedChainId,
  onChainChange,
  isSwitching = false,
  disabled = false,
  className,
}: ChainSelectorProps) {
  return (
    <div
      className={cn("border border-teal-100/10 border-b-0 grid", className)}
      role="group"
      aria-labelledby="chain-selector-label"
    >
      <div className="grid grid-cols-2">
        {chains.map((chainId) => (
          <button
            key={chainId}
            onClick={() => {
              if (chainId !== selectedChainId) {
                onChainChange(chainId);
              }
            }}
            disabled={isSwitching || disabled}
            className={cn(
              "border p-2 text-sm font-mono uppercase transition-colors",
              selectedChainId === chainId
                ? "border-teal-500 bg-teal-500/40 text-teal-400"
                : "border-white/10 text-gray-400 hover:border-white/20",
              (isSwitching || disabled) && "opacity-50 cursor-not-allowed"
            )}
            aria-current={selectedChainId === chainId ? "true" : undefined}
            aria-disabled={isSwitching || disabled}
          >
            {isSwitching && selectedChainId === chainId ? (
              <div className="flex items-center gap-2">
                <div className="size-3 border border-current border-t-transparent rounded-full animate-spin" />
                Switching...
              </div>
            ) : (
              getChainName(chainId)
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
