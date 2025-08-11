import React from "react";

interface EmptyTransactionStateProps {
  onFetch: () => void;
  isLoading: boolean;
}

export function EmptyTransactionState({
  onFetch,
  isLoading,
}: EmptyTransactionStateProps) {
  return (
    <div className="text-center py-6 space-y-2">
      <div className="text-gray-400 text-sm">No vault transactions yet</div>
      <button
        onClick={onFetch}
        disabled={isLoading}
        className="text-teal-400 hover:text-teal-300 text-xs transition-colors disabled:opacity-50"
      >
        {isLoading ? "Loading..." : "Fetch Transactions"}
      </button>
    </div>
  );
}
