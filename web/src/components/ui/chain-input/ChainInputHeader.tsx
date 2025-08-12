"use client";

import { getChainLogo } from "@/lib/tokens";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ChainInputHeaderProps {
  chainId: number;
  chainName: string;
  iconSize?: number;
  className?: string;
}

export function ChainInputHeader({
  chainId,
  chainName,
  iconSize = 24,
  className,
}: ChainInputHeaderProps) {
  const chainLogo = getChainLogo(chainId);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {chainLogo && (
        <div className="flex-shrink-0">
          <Image
            src={chainLogo}
            alt={chainName}
            width={iconSize}
            height={iconSize}
            className="object-contain"
          />
        </div>
      )}

      <h3 className="font-semibold text-white font-mono text-sm uppercase tracking-wide">
        {chainName}
      </h3>
    </div>
  );
}
