"use client";

import { cn } from "@/lib/utils";

interface OperationInputProps {
  type: "deposit" | "withdraw";
  amount: string;
  onAmountChange: (value: string) => void;
  onMaxClick: () => void;
  onSubmit: () => void;
  disabled?: boolean;
  token?: string;
}

export function OperationInput({
  type,
  amount,
  onAmountChange,
  onMaxClick,
  onSubmit,
  disabled = false,
  token = "USDC",
}: OperationInputProps) {
  const isValid = amount && parseFloat(amount) > 0;
  const isDeposit = type === "deposit";

  return (
    <div className="space-y-4">
      <div className="grid gap-1">
        <div className="flex justify-between items-center">
          <label className="text-xs text-gray-400 uppercase tracking-wide">
            {isDeposit ? "Deposit" : "Withdraw"} Amount
          </label>
          <button
            onClick={onMaxClick}
            className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
          >
            MAX
          </button>
        </div>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.00"
            disabled={disabled}
            className="w-full p-3 bg-transparent border border-white/10 text-white font-mono text-lg focus:border-teal-500/50 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono">
            {token}
          </div>
        </div>
      </div>
      <button
        onClick={onSubmit}
        disabled={!isValid || disabled}
        className={cn(
          "w-full p-3 font-mono uppercase text-sm transition-colors",
          isValid && !disabled
            ? "bg-teal-500 text-white hover:bg-teal-600"
            : "bg-gray-700 text-gray-400 cursor-not-allowed"
        )}
      >
        {isDeposit ? "Deposit" : "Withdraw"} {token}
      </button>
    </div>
  );
}
