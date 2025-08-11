"use client";

import { BalanceAmount } from "./BalanceAmount";
import { cn } from "@/lib/utils";

interface BalanceItemProps {
  label: string;
  balance?: bigint;
  isLoading?: boolean;
  error?: Error | null;
  token?: string;
  className?: string;
}

export function BalanceItem({
  label,
  balance,
  isLoading,
  error,
  token = "USDC",
  className,
}: BalanceItemProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-400 uppercase tracking-wide font-medium">
          {label}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <BalanceAmount
          balance={balance}
          isLoading={isLoading}
          error={error}
          token={token}
          size="base"
          showIcon={false}
          className="text-white"
        />
        <span className="text-xs text-gray-400 ml-1">{token}</span>
      </div>
    </div>
  );
}
