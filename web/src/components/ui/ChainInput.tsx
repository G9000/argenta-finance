"use client";

import { cn } from "@/lib/utils";
import { getChainLogo } from "@/lib/tokens";
import { getChainName } from "@/constant/chains";
import {
  CardContainer,
  ChainHeader,
  AmountInput,
  ValidationMessages,
} from "@/components/ui";
import type { SupportedChainId } from "@/constant/chains";

interface ChainInputProps {
  chainId: SupportedChainId;
  amount: string;
  errors: string[];
  warnings: string[];
  balance: {
    data?: bigint;
    isLoading: boolean;
    error?: Error | null;
  };
  onAmountChange: (amount: string) => void;
  onMaxClick: () => void;
  onRemove?: () => void;
  canRemove?: boolean;
  disabled?: boolean;
  isProcessing?: boolean;
  isSelected?: boolean;
}

export function ChainInput({
  chainId,
  amount,
  errors,
  warnings,
  balance,
  onAmountChange,
  onMaxClick,
  onRemove,
  canRemove = false,
  disabled = false,
  isProcessing = false,
  isSelected = false,
}: ChainInputProps) {
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const chainLogo = getChainLogo(chainId);
  const chainName = getChainName(chainId);

  return (
    <CardContainer
      backgroundLogo={chainLogo}
      backgroundLogoAlt={chainName}
      className={cn(
        "transition-all duration-200",
        amount && Number(amount) > 0 && "border-teal-500/30 bg-teal-500/5",
        // isSelected && "ring-1 ring-teal-500/30",
        hasErrors && "border-red-400/30 bg-red-400/5",
        hasWarnings && !hasErrors && "border-yellow-400/30 bg-yellow-400/5"
      )}
    >
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChainHeader
              chainId={chainId}
              chainName={chainName}
              iconSize={20}
            />
            {canRemove && onRemove && (
              <button
                onClick={onRemove}
                disabled={disabled || isProcessing}
                className={cn(
                  "ml-2 text-xs px-2 py-1 border transition-colors disabled:opacity-50",
                  "text-red-400 border-red-400/40 hover:bg-red-400/10 hover:border-red-400/60"
                )}
              >
                REMOVE
              </button>
            )}
          </div>
        </div>

        <AmountInput
          value={amount}
          onChange={onAmountChange}
          label="Deposit Amount"
          token="USDC"
          disabled={disabled || isProcessing}
          hasErrors={hasErrors}
          hasWarnings={hasWarnings}
          balance={balance.data}
          isBalanceLoading={balance.isLoading}
          balanceError={balance.error}
          onMaxClick={onMaxClick}
          showBalance={true}
          showMaxButton={true}
        />

        <ValidationMessages errors={errors} warnings={warnings} />
      </div>
    </CardContainer>
  );
}
