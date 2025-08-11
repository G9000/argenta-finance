"use client";

import { cn } from "@/lib/utils";
import {
  OperationType,
  OPERATION_TYPES,
  SupportedTokenSymbol,
} from "@/types/operations";
import { ValidationResult } from "@/lib/validation";

interface OperationInputProps {
  type: OperationType;
  amount: string;
  onAmountChange: (value: string) => void;
  onMaxClick: () => void;
  onSubmit: () => void;
  disabled?: boolean;
  token?: SupportedTokenSymbol;
  decimals?: number;
  isProcessing?: boolean;
  processingText?: string;
  buttonText?: string;
  validation?: ValidationResult;
}

export function OperationInput({
  type,
  amount,
  onAmountChange,
  onMaxClick,
  onSubmit,
  disabled = false,
  token = "USDC",
  decimals = 6,
  isProcessing = false,
  processingText,
  buttonText,
  validation = { isValid: true, errors: [], warnings: [] },
}: OperationInputProps) {
  const numericAmount = Number(amount);
  const hasAmount =
    amount && Number.isFinite(numericAmount) && numericAmount > 0;
  const isDeposit = type === OPERATION_TYPES.DEPOSIT;

  const stepValue = decimals > 0 ? `0.${"0".repeat(decimals - 1)}1` : "1";

  const isButtonDisabled =
    !hasAmount || !validation.isValid || disabled || isProcessing;

  const getButtonText = () => {
    if (isProcessing && processingText) {
      return processingText;
    }
    if (buttonText) {
      return buttonText;
    }
    return `${isDeposit ? "Deposit" : "Withdraw"} ${token}`;
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-1">
        <div className="flex justify-between items-center">
          <label
            htmlFor={`${type}-amount-input`}
            className="text-xs text-gray-400 uppercase tracking-wide"
          >
            {isDeposit ? "Deposit" : "Withdraw"} Amount
          </label>
          <button
            onClick={onMaxClick}
            disabled={disabled || isProcessing}
            className="text-xs text-teal-400 hover:text-teal-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            MAX
          </button>
        </div>
        <div className="relative">
          <input
            id={`${type}-amount-input`}
            type="number"
            value={amount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.00"
            step={stepValue}
            min="0"
            inputMode="decimal"
            disabled={disabled || isProcessing}
            aria-describedby={`${type}-input-validation`}
            aria-invalid={validation.errors.length > 0}
            aria-label={`${isDeposit ? "Deposit" : "Withdraw"} ${token} amount`}
            className={cn(
              "w-full p-3 bg-transparent border text-white font-mono text-lg focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              validation.errors.length > 0
                ? "border-red-400/60 focus:border-red-400"
                : validation.warnings.length > 0
                ? "border-yellow-400/60 focus:border-yellow-400"
                : "border-white/10 focus:border-teal-500/50"
            )}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono">
            {token}
          </div>
        </div>

        <div id={`${type}-input-validation`}>
          {validation.errors.length > 0 && (
            <div className="space-y-1">
              {validation.errors.map((error: string, index: number) => (
                <div
                  key={index}
                  className="text-xs text-red-400 px-2 py-1 border border-red-400/40 rounded bg-red-400/5"
                >
                  ⚠️ {error}
                </div>
              ))}
            </div>
          )}

          {validation.warnings.length > 0 && validation.errors.length === 0 && (
            <div className="space-y-1">
              {validation.warnings.map((warning: string, index: number) => (
                <div
                  key={index}
                  className="text-xs text-yellow-400 px-2 py-1 border border-yellow-400/40 rounded bg-yellow-400/5"
                >
                  💡 {warning}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={isButtonDisabled}
        aria-busy={isProcessing}
        aria-disabled={isButtonDisabled}
        aria-describedby={isProcessing ? `${type}-button-loading` : undefined}
        className={cn(
          "w-full p-3 font-mono uppercase text-sm transition-colors relative",
          !isButtonDisabled
            ? "bg-teal-500 text-white hover:bg-teal-600"
            : "bg-gray-700 text-gray-400 cursor-not-allowed"
        )}
      >
        {isProcessing && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <div
              className="size-4 border border-current border-t-transparent rounded-full animate-spin"
              role="status"
              aria-label="Processing transaction"
            />
            <span id={`${type}-button-loading`} className="sr-only">
              Processing {isDeposit ? "deposit" : "withdraw"} transaction,
              please wait
            </span>
          </div>
        )}
        <span className={cn(isProcessing && "ml-6")}>{getButtonText()}</span>
      </button>
    </div>
  );
}
