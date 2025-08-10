"use client";

import Image from "next/image";
import { formatBalance } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BalanceItem {
  label: string;
  value: bigint | undefined;
  currency?: string;
  logo?: string;
  error?: string;
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

          {balance.error ? (
            <div className="space-y-2">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                <div className="text-xs text-red-400 mb-1">
                  Error loading balance
                </div>
                <div className="text-xs text-red-300 font-mono">
                  {balance.error}
                </div>
              </div>
              <div className="font-mono text-2xl text-gray-500 font-semibold">
                <div className="flex items-center gap-2">
                  {balance.logo && (
                    <Image
                      src={balance.logo}
                      alt={`${balance.currency || "USDC"} logo`}
                      width={20}
                      height={20}
                      className="rounded-full opacity-50"
                    />
                  )}
                  <span>--.- {balance.currency || "USDC"}</span>
                </div>
              </div>
            </div>
          ) : (
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
          )}
        </div>
      ))}
    </div>
  );
}
