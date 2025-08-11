"use client";

import * as React from "react";
import { Tabs } from "@base-ui-components/react/tabs";
import { cn } from "@/lib/utils";
import { OperationType } from "@/types/ui-state";
import { OPERATION_TYPES } from "@/constant/operation-constants";

interface OperationTabsProps {
  activeTab: OperationType;
  onTabChange: (tab: OperationType) => void;
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
      onValueChange={(value) => onTabChange(value as OperationType)}
      className="grid gap-4"
    >
      <div className="grid gap-1">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
          Operation Type
        </div>
        <Tabs.List className="relative flex border border-white/10 rounded overflow-hidden">
          <Tabs.Tab
            value={OPERATION_TYPES.DEPOSIT}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-mono transition-colors outline-none",
              "hover:text-white",
              "data-[selected]:bg-teal-500/10 data-[selected]:text-teal-400",
              "focus-visible:bg-teal-500/5",
              activeTab === OPERATION_TYPES.DEPOSIT
                ? "text-teal-400 border-r border-teal-500/50"
                : "text-gray-400 border-r border-white/10"
            )}
          >
            {OPERATION_TYPES.DEPOSIT}
          </Tabs.Tab>
          <Tabs.Tab
            value={OPERATION_TYPES.WITHDRAW}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-mono transition-colors outline-none",
              "hover:text-white",
              "data-[selected]:bg-teal-500/10 data-[selected]:text-teal-400",
              "focus-visible:bg-teal-500/5",
              activeTab === OPERATION_TYPES.WITHDRAW
                ? "text-teal-400"
                : "text-gray-400"
            )}
          >
            {OPERATION_TYPES.WITHDRAW}
          </Tabs.Tab>
          <Tabs.Indicator className="absolute inset-y-0 z-[-1] transition-all duration-200 ease-out bg-teal-500/10 data-[orientation=horizontal]:w-[var(--active-tab-width)] data-[orientation=horizontal]:translate-x-[var(--active-tab-left)]" />
        </Tabs.List>
      </div>

      <div>
        <Tabs.Panel value={OPERATION_TYPES.DEPOSIT} className="outline-none">
          {children}
        </Tabs.Panel>
        <Tabs.Panel value={OPERATION_TYPES.WITHDRAW} className="outline-none">
          {children}
        </Tabs.Panel>
      </div>
    </Tabs.Root>
  );
}
