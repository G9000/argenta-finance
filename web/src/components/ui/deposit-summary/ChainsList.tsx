"use client";

import Image from "next/image";
import { getChainLogo } from "@/lib/tokens";
import { cn } from "@/lib/utils";
import type { SupportedChainId } from "@/constant/chains";

interface ChainsListProps {
  activeChainIds: SupportedChainId[];
}

export function ChainsList({ activeChainIds }: ChainsListProps) {
  const activeChainCount = activeChainIds.length;

  return (
    <div className="flex items-center justify-between py-2">
      <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest font-medium">
        Active Chains
      </h3>
      <div className="flex items-center gap-4">
        <div className="flex items-center -space-x-2">
          {activeChainIds.map((chainId, index) => {
            const logo = getChainLogo(chainId);
            return (
              <div
                key={chainId}
                className={cn(
                  "relative rounded-full border-2 border-gray-700/50 bg-gray-800/50 backdrop-blur-sm shadow-md transition-transform hover:scale-110",
                  index > 0 && "z-10"
                )}
                style={{ zIndex: activeChainIds.length - index }}
              >
                {logo && (
                  <Image
                    src={logo}
                    alt={`Chain ${chainId}`}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                )}
              </div>
            );
          })}
        </div>
        <span className="text-white font-mono text-lg font-semibold tracking-wide">
          {activeChainCount} CHAIN{activeChainCount !== 1 ? "S" : ""}
        </span>
      </div>
    </div>
  );
}
