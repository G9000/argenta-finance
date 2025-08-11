import React from "react";

export function TransactionListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-3 border border-white/10 rounded animate-pulse"
        >
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
            <div className="space-y-1">
              <div className="w-16 h-3 bg-gray-600 rounded"></div>
              <div className="w-24 h-2 bg-gray-700 rounded"></div>
            </div>
          </div>
          <div className="w-12 h-3 bg-gray-600 rounded"></div>
        </div>
      ))}
    </div>
  );
}
