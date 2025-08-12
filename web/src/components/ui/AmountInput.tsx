"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { getTokenLogo } from "@/lib/tokens";
import { formatBalance } from "@/lib/format";
import { handleNumericKeyDown, handleNumericPaste } from "@/lib/input-utils";
interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  token?: string;
  disabled?: boolean;
  hasErrors?: boolean;
  className?: string;
  balance?: bigint;
  isBalanceLoading?: boolean;
  balanceError?: Error | null;
  onMaxClick?: () => void;
  showMaxButton?: boolean;
  tokenDecimals?: number;
}

export function AmountInput({
  value,
  onChange,
  placeholder = "0.00",
  label = "Amount",
  token = "USDC",
  disabled = false,
  hasErrors = false,
  className,
  balance,
  isBalanceLoading = false,
  balanceError,
  onMaxClick,
  showMaxButton = false,
  tokenDecimals = 6,
}: AmountInputProps) {
  const stepValue =
    tokenDecimals > 0 ? `0.${"0".repeat(tokenDecimals - 1)}1` : "1";

  return (
    <div className={cn("space-y-2 w-full", className)}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400 uppercase tracking-wide">
          {label}
        </div>

        {showMaxButton && onMaxClick && (
          <button
            type="button"
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
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => handleNumericKeyDown(e, value)}
          onPaste={(e) => handleNumericPaste(e, value)}
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
              : "border-white/10 focus:border-teal-500 focus:ring-teal-500/20",
            !showMaxButton && "pr-32"
          )}
        />
      </div>
    </div>
  );
}
