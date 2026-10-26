import { Clock, Terminal, ChevronRight } from 'lucide-react';
import type { ThoughtStep } from '../../store/useWorkspaceStore';

interface ThoughtStreamProps {
  thoughts: ThoughtStep[];
}

export function ThoughtStream({ thoughts }: ThoughtStreamProps) {
  if (!thoughts || thoughts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500">
        <Terminal className="w-8 h-8 mb-2 stroke-1" />
        <p className="text-sm font-medium">No thought events recorded yet.</p>
        <p className="text-xs text-zinc-600 mt-1">
          When the agent begins execution, its internal reasoning traces will stream here in real time.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-250px)]">
      {thoughts.map((step) => (
        <div
          key={step.id}
          className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all text-xs font-mono"
        >
          <div className="flex items-center justify-between text-zinc-500 mb-1.5 text-[10px]">
            <span className="flex items-center gap-1 font-semibold text-zinc-400">
              <Clock className="w-3 h-3" />
              {new Date(step.timestamp).toLocaleTimeString()}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
              Step #{step.stepIndex + 1}
            </span>
          </div>

          <div className="text-zinc-200 leading-relaxed font-sans mb-2">
            {step.reasoningTrace}
          </div>

          {step.nextPlannedStep && (
            <div className="flex items-center gap-1 text-[11px] text-indigo-400 pt-2 border-t border-zinc-800/80">
              <ChevronRight className="w-3 h-3 shrink-0" />
              <span className="text-zinc-500">Next:</span>
              <span className="truncate">{step.nextPlannedStep}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
