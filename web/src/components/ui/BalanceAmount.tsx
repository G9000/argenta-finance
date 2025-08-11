"use client";

import { formatBalance } from "@/lib/format";
import { getTokenLogo } from "@/lib/tokens";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface BalanceAmountProps {
  balance?: bigint;
  isLoading?: boolean;
  error?: Error | null;
  token?: string;
  size?: "sm" | "base" | "lg" | "xl";
  showIcon?: boolean;
  className?: string;
  iconSize?: number;
}

const sizeStyles = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

const iconSizes = {
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
};

export function BalanceAmount({
  balance,
  isLoading,
  error,
  token = "USDC",
  size = "base",
  showIcon = true,
  className,
  iconSize,
}: BalanceAmountProps) {
  const tokenLogo = getTokenLogo(token);
  const finalIconSize = iconSize || iconSizes[size];

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {showIcon && tokenLogo && (
          <div className="opacity-50">
            <Image
              src={tokenLogo}
              alt={token}
              width={finalIconSize}
              height={finalIconSize}
              className="object-contain"
            />
          </div>
        )}
        <span className={cn("text-gray-500 font-mono", sizeStyles[size])}>
          Loading...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {showIcon && tokenLogo && (
          <div className="opacity-30">
            <Image
              src={tokenLogo}
              alt={token}
              width={finalIconSize}
              height={finalIconSize}
              className="object-contain"
            />
          </div>
        )}
        <span className={cn("text-gray-500 font-mono", sizeStyles[size])}>
          Error
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showIcon && tokenLogo && (
        <Image
          src={tokenLogo}
          alt={token}
          width={finalIconSize}
          height={finalIconSize}
          className="object-contain opacity-80"
        />
      )}
      <div className={cn("font-mono font-semibold", sizeStyles[size])}>
        {formatBalance(balance)}
      </div>
    </div>
  );
}
