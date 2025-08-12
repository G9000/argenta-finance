"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { getChainName } from "@/constant/chains";
import { getChainLogo } from "@/lib/tokens";
import type { SupportedChainId } from "@/constant/chains";

interface ChainDropdownProps {
  availableChains: SupportedChainId[];
  onAddChain: (chainId: SupportedChainId) => void;
  disabled?: boolean;
  isProcessing?: boolean;
}

export function ChainDropdown({
  availableChains,
  onAddChain,
  disabled = false,
  isProcessing = false,
}: ChainDropdownProps) {
  if (availableChains.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Add chains">
      {availableChains.map((chainId) => {
        const logo = getChainLogo(chainId);
        return (
          <button
            key={chainId}
            type="button"
            disabled={disabled || isProcessing}
            onClick={() => onAddChain(chainId)}
            className={cn(
              "group relative pl-2 pr-2.5 py-1 border text-xs font-mono tracking-wide flex items-center gap-1.5",
              "transition-colors outline-none",
              "border-white/10 bg-gray-800/60 text-gray-300",
              "hover:border-teal-500/40 hover:bg-teal-500/10 hover:text-white",
              "focus-visible:border-teal-500/60 focus-visible:bg-teal-500/10",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <span className="text-teal-400">+</span>
            {logo && (
              <Image
                src={logo}
                alt={getChainName(chainId)}
                width={16}
                height={16}
                className="size-4"
              />
            )}
            <span>{getChainName(chainId)}</span>
          </button>
        );
      })}
    </div>
  );
}
