"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { getTokenLogo } from "@/lib/tokens";
import { formatBalance } from "@/lib/format";
import { USDC_DECIMALS } from "@/constant/contracts";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  token?: string;
  disabled?: boolean;
  hasErrors?: boolean;
  hasWarnings?: boolean;
  className?: string;
  balance?: bigint;
  isBalanceLoading?: boolean;
  balanceError?: Error | null;
  onMaxClick?: () => void;
  showBalance?: boolean;
  showMaxButton?: boolean;
}

export function AmountInput({
  value,
  onChange,
  placeholder = "0.00",
  label = "Amount",
  token = "USDC",
  disabled = false,
  hasErrors = false,
  hasWarnings = false,
  className,
  balance,
  isBalanceLoading = false,
  balanceError,
  onMaxClick,
  showBalance = false,
  showMaxButton = false,
}: AmountInputProps) {
  const stepValue =
    USDC_DECIMALS > 0 ? `0.${"0".repeat(USDC_DECIMALS - 1)}1` : "1";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400 uppercase tracking-wide">
          {label}
        </div>

        {showMaxButton && onMaxClick && showBalance && (
          <button
            onClick={onMaxClick}
            disabled={disabled || isBalanceLoading}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-xs border transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "text-teal-400 border-teal-400/40 hover:bg-teal-400/10 hover:border-teal-400/60"
            )}
          >
            <Image
              src={getTokenLogo(token)}
              alt={token}
              width={16}
              height={16}
              className="rounded-full"
            />
            <span className="font-mono">
              {isBalanceLoading
                ? "Loading..."
                : balanceError
                ? "Error"
                : formatBalance(balance)}
            </span>
            <span className="font-semibold">MAX</span>
          </button>
        )}
      </div>

      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          step={stepValue}
          min="0"
          inputMode="decimal"
          disabled={disabled}
          className={cn(
            "w-full p-4 bg-gray-900/50 border text-white font-mono text-xl",
            "focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
            "placeholder:text-gray-500",
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            hasErrors
              ? "border-red-400/60 focus:border-red-400 focus:ring-red-400/20"
              : hasWarnings
              ? "border-yellow-400/60 focus:border-yellow-400 focus:ring-yellow-400/20"
              : "border-white/10 focus:border-teal-500 focus:ring-teal-500/20",
            !showMaxButton && showBalance && "pr-32"
          )}
        />

        {showBalance && !showMaxButton && (
          <div className="absolute top-2 right-4 text-xs text-gray-400 flex items-center gap-1">
            <Image
              src={getTokenLogo(token)}
              alt={token}
              width={12}
              height={12}
              className="rounded-full"
            />
            <span className="font-mono">
              {isBalanceLoading
                ? "Loading..."
                : balanceError
                ? "Error"
                : `${formatBalance(balance)} ${token}`}
            </span>
          </div>
        )}

        {showMaxButton && onMaxClick && !showBalance && (
          <button
            onClick={onMaxClick}
            disabled={disabled || isBalanceLoading}
            className={cn(
              "absolute bottom-2 right-4 text-xs px-2 py-1 border transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "text-teal-400 border-teal-400/40 hover:bg-teal-400/10 hover:border-teal-400/60"
            )}
          >
            MAX
          </button>
        )}

        {!showMaxButton && !showBalance && (
          <div className="absolute top-1/2 -translate-y-1/2 right-4 flex items-center gap-2">
            <Image
              src={getTokenLogo(token)}
              alt={token}
              width={16}
              height={16}
              className="rounded-full"
            />
            <span className="text-gray-400 font-mono text-sm">{token}</span>
          </div>
        )}
      </div>
    </div>
  );
}
