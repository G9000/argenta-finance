import React from "react";

export function TransactionSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-4 border border-gray-700 rounded-lg animate-pulse bg-black/20"
        >
          <div className="flex items-center space-x-3">
            <div className="w-5 h-5 bg-gray-600 rounded-full" />

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="h-4 bg-gray-600 rounded w-16" />
                <div className="h-4 bg-gray-600 rounded w-20" />
              </div>

              <div className="flex items-center space-x-2">
                <div className="h-3 bg-gray-600 rounded w-24" />
                <div className="h-3 bg-gray-600 rounded w-16" />
              </div>

              <div className="h-3 bg-gray-600 rounded w-32" />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="h-3 bg-gray-600 rounded w-16" />
            <div className="h-4 bg-gray-600 rounded w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}
