"use client";

interface ExecutionModeToggleProps {
  isManualMode: boolean;
  onToggle: () => void;
}

export function ExecutionModeToggle({
  isManualMode,
  onToggle,
}: ExecutionModeToggleProps) {
  return (
    <>
      <div className="flex items-center justify-between py-3 px-4 bg-black/20 rounded-lg border border-teal-500/10">
        <div className="flex items-center gap-3">
          <span className="text-gray-300 font-mono text-sm font-medium">
            Execution Mode:
          </span>
          <span
            className={`font-mono text-sm font-bold uppercase tracking-wide ${
              isManualMode ? "text-blue-400" : "text-green-400"
            }`}
          >
            {isManualMode ? "Manual" : "Automatic"}
          </span>
        </div>
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
            isManualMode ? "bg-blue-500" : "bg-green-500"
          }`}
        >
          <span className="sr-only">Toggle execution mode</span>
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isManualMode ? "translate-x-1" : "translate-x-6"
            }`}
          />
        </button>
      </div>

      <div className="text-xs text-gray-500 leading-relaxed px-2">
        <span className="font-mono uppercase tracking-wide">
          {isManualMode ? "Manual:" : "Automatic:"}
        </span>{" "}
        {isManualMode
          ? "Approve and deposit each chain individually using buttons below"
          : "Use unified batch execution to process all chains automatically"}
      </div>
    </>
  );
}
