"use client";

import Image from "next/image";
import { formatBalance } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BalanceItem {
  label: string;
  value: bigint | undefined;
  currency?: string;
  logo?: string;
}

interface BalanceDisplayProps {
  balances: BalanceItem[];
  isLoading?: boolean;
  className?: string;
}

export function BalanceDisplay({
  balances,
  isLoading = false,
  className,
}: BalanceDisplayProps) {
  return (
    <div
      className={cn(
        "grid gap-4 relative",
        isLoading && "opacity-50",
        className
      )}
      aria-busy={isLoading}
    >
      {balances.map((balance) => (
        <div key={balance.label} className="relative z-10">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">
            {balance.label}
          </div>
          <div className="font-mono text-2xl text-white font-semibold">
            <div className="flex items-center gap-2">
              {balance.logo && (
                <Image
                  src={balance.logo}
                  alt={`${balance.currency || "USDC"} logo`}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              )}
              <span>
                {balance.value !== undefined
                  ? formatBalance(balance.value)
                  : "0.00"}{" "}
                {balance.currency || "USDC"}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
