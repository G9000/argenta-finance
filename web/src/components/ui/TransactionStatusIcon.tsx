import React from "react";

interface TransactionStatusIconProps {
  status: "pending" | "confirmed" | "failed" | "cancelled";
}

export function TransactionStatusIcon({ status }: TransactionStatusIconProps) {
  switch (status) {
    case "pending":
      return (
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
      );
    case "confirmed":
      return <div className="w-2 h-2 bg-green-500 rounded-full" />;
    case "failed":
      return <div className="w-2 h-2 bg-red-500 rounded-full" />;
    default:
      return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
  }
}
