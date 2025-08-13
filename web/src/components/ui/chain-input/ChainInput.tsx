"use client";

import { cn } from "@/lib/utils";
import { getChainLogo } from "@/lib/tokens";
import { getChainName } from "@/constant/chains";
import {
  CardContainer,
  AmountInput,
  ValidationMessages,
} from "@/components/ui";
import { ChainInputHeader } from "./ChainInputHeader";
import type { SupportedChainId } from "@/constant/chains";

interface ChainInputProps {
  chainId: SupportedChainId;
  amount: string;
  errors: string[];
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
}

export function ChainInput({
  chainId,
  amount,
  errors,
  balance,
  onAmountChange,
  onMaxClick,
  onRemove,
  canRemove = false,
  disabled = false,
  isProcessing = false,
}: ChainInputProps) {
  const hasErrors = errors.length > 0;
  const hasAmount = amount && Number(amount) > 0;
  const isDisabled = disabled || isProcessing;
  const chainLogo = getChainLogo(chainId);
  const chainName = getChainName(chainId);

  const containerClassName = cn(
    "transition-all duration-200",
    hasAmount && "border-teal-500/30 bg-teal-500/5",
    hasErrors && "border-red-400/30 bg-red-400/5"
  );

  const RemoveButton = () => {
    if (!canRemove || !onRemove) return null;

    return (
      <button
        type="button"
        onClick={onRemove}
        disabled={isDisabled}
        className={cn(
          "ml-2 text-xs px-2 py-1 border transition-colors disabled:opacity-50",
          "text-red-400 border-red-400/40 hover:bg-red-400/10 hover:border-red-400/60"
        )}
      >
        REMOVE
      </button>
    );
  };

  return (
    <CardContainer
      backgroundLogo={chainLogo}
      backgroundLogoAlt={chainName}
      className={containerClassName}
    >
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChainInputHeader
              chainId={chainId}
              chainName={chainName}
              iconSize={20}
            />
            <RemoveButton />
          </div>
        </div>

        <AmountInput
          value={amount}
          onChange={onAmountChange}
          label="Amount"
          token="USDC"
          disabled={isDisabled}
          hasErrors={hasErrors}
          balance={balance.data}
          isBalanceLoading={balance.isLoading}
          balanceError={balance.error}
          onMaxClick={onMaxClick}
          showMaxButton
        />

        <ValidationMessages errors={errors} />
      </div>
    </CardContainer>
  );
}
