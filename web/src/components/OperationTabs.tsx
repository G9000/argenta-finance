"use client";

import * as React from "react";
import { Tabs } from "@base-ui-components/react/tabs";
import { cn } from "@/lib/utils";

interface OperationTabsProps {
  activeTab: "deposit" | "withdraw";
  onTabChange: (tab: "deposit" | "withdraw") => void;
  children: React.ReactNode;
}

export function OperationTabs({
  activeTab,
  onTabChange,
  children,
}: OperationTabsProps) {
  return (
    <Tabs.Root
      value={activeTab}
      onValueChange={(value) => onTabChange(value as "deposit" | "withdraw")}
      className="grid gap-4"
    >
      <div className="grid gap-1">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
          Operation Type
        </div>
        <Tabs.List className="relative flex border border-white/10 rounded overflow-hidden">
          <Tabs.Tab
            value="deposit"
            className={cn(
              "flex-1 px-4 py-2 text-sm font-mono transition-colors outline-none",
              "hover:text-white",
              "data-[selected]:bg-teal-500/10 data-[selected]:text-teal-400",
              "focus-visible:bg-teal-500/5",
              activeTab === "deposit"
                ? "text-teal-400 border-r border-teal-500/50"
                : "text-gray-400 border-r border-white/10"
            )}
          >
            Deposit
          </Tabs.Tab>
          <Tabs.Tab
            value="withdraw"
            className={cn(
              "flex-1 px-4 py-2 text-sm font-mono transition-colors outline-none",
              "hover:text-white",
              "data-[selected]:bg-teal-500/10 data-[selected]:text-teal-400",
              "focus-visible:bg-teal-500/5",
              activeTab === "withdraw" ? "text-teal-400" : "text-gray-400"
            )}
          >
            Withdraw
          </Tabs.Tab>
          <Tabs.Indicator className="absolute inset-y-0 z-[-1] transition-all duration-200 ease-out bg-teal-500/10 data-[orientation=horizontal]:w-[var(--active-tab-width)] data-[orientation=horizontal]:translate-x-[var(--active-tab-left)]" />
        </Tabs.List>
      </div>

      <div>
        <Tabs.Panel value="deposit" className="outline-none">
          {children}
        </Tabs.Panel>
        <Tabs.Panel value="withdraw" className="outline-none">
          {children}
        </Tabs.Panel>
      </div>
    </Tabs.Root>
  );
}
