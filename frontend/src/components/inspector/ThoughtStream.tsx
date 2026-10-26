import { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Clock, Terminal, ChevronRight, ChevronDown, Copy, Check, Sparkles } from 'lucide-react';
import type { ThoughtStep } from '../../store/useWorkspaceStore';

interface ThoughtStreamProps {
  thoughts: ThoughtStep[];
}

interface RunGroup {
  runId: string;
  runNumber: number;
  startTime: string;
  steps: ThoughtStep[];
}

type VirtualItemData =
  | {
      type: 'run_header';
      id: string;
      runId: string;
      runNumber: number;
      startTime: string;
      stepCount: number;
      isCollapsed: boolean;
    }
  | {
      type: 'thought_step';
      id: string;
      runId: string;
      step: ThoughtStep;
    };

export function ThoughtStream({ thoughts }: ThoughtStreamProps) {
  const [collapsedRuns, setCollapsedRuns] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // Group thoughts into execution runs
  const runGroups = useMemo(() => {
    if (!thoughts || thoughts.length === 0) return [];

    const groups: RunGroup[] = [];
    let currentGroup: RunGroup | null = null;
    let runCounter = 1;

    for (let index = 0; index < thoughts.length; index++) {
      const step = thoughts[index];
      const previousStep = index > 0 ? thoughts[index - 1] : null;

      // New run if step index resets to 0 or gap > 5 minutes
      const isNewRun =
        index === 0 ||
        step.stepIndex === 0 ||
        (previousStep &&
          Math.abs(new Date(step.timestamp).getTime() - new Date(previousStep.timestamp).getTime()) >
            5 * 60 * 1000);

      if (isNewRun) {
        currentGroup = {
          runId: `run-${runCounter}`,
          runNumber: runCounter,
          startTime: step.timestamp,
          steps: [step],
        };
        groups.push(currentGroup);
        runCounter++;
      } else if (currentGroup) {
        currentGroup.steps.push(step);
      }
    }

    return groups;
  }, [thoughts]);

  // Flatten groups for virtual scrolling
  const flatItems: VirtualItemData[] = useMemo(() => {
    const items: VirtualItemData[] = [];

    runGroups.forEach((group) => {
      const isCollapsed = Boolean(collapsedRuns[group.runId]);
      items.push({
        type: 'run_header',
        id: `header-${group.runId}`,
        runId: group.runId,
        runNumber: group.runNumber,
        startTime: group.startTime,
        stepCount: group.steps.length,
        isCollapsed,
      });

      if (!isCollapsed) {
        group.steps.forEach((step) => {
          items.push({
            type: 'thought_step',
            id: `step-${step.id || step.stepIndex}-${step.timestamp}`,
            runId: group.runId,
            step,
          });
        });
      }
    });

    return items;
  }, [runGroups, collapsedRuns]);

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (flatItems[index]?.type === 'run_header' ? 44 : 124),
    overscan: 6,
  });

  const toggleRun = (runId: string) => {
    setCollapsedRuns((previous) => ({
      ...previous,
      [runId]: !previous[runId],
    }));
  };

  const copyTrace = (stepId: string, traceText: string) => {
    navigator.clipboard.writeText(traceText);
    setCopiedId(stepId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!thoughts || thoughts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500 my-auto">
        <Terminal className="w-9 h-9 mb-2 stroke-1 text-zinc-400 dark:text-zinc-600" />
        <p className="text-xs font-semibold text-[#202124] dark:text-zinc-300">No Thought Events Recorded</p>
        <p className="text-[11px] text-[#5f6368] dark:text-zinc-500 mt-1 max-w-xs leading-relaxed">
          When this agent triggers tools or emits analytical hypotheses, its reasoning trace will stream here in real time.
        </p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto px-4 py-3">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = flatItems[virtualItem.index];
          if (!item) return null;

          if (item.type === 'run_header') {
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="py-1"
              >
                <button
                  onClick={() => toggleRun(item.runId)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {item.isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-blue-600 dark:text-indigo-400" />
                    )}
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Execution Run #{item.runNumber}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(item.startTime).toLocaleTimeString()}
                    </span>
                  </div>

                  <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-400 font-mono">
                    {item.stepCount} {item.stepCount === 1 ? 'step' : 'steps'}
                  </span>
                </button>
              </div>
            );
          }

          const { step } = item;
          const isCopied = copiedId === step.id;

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="py-1.5"
            >
              <div className="p-3 rounded-lg bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800/90 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all text-xs font-mono group shadow-xs">
                <div className="flex items-center justify-between text-zinc-500 mb-1.5 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
                      Step #{step.stepIndex + 1}
                    </span>
                    <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                      <Clock className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                      {new Date(step.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <button
                    onClick={() => copyTrace(step.id, step.reasoningTrace)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-opacity"
                    title="Copy reasoning trace"
                  >
                    {isCopied ? (
                      <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                <div className="text-[#202124] dark:text-zinc-200 leading-relaxed font-sans mb-2 text-xs">
                  {step.reasoningTrace}
                </div>

                {step.nextPlannedStep && (
                  <div className="flex items-start gap-1.5 text-[11px] text-blue-600 dark:text-indigo-300 pt-2 border-t border-zinc-100 dark:border-zinc-800/70">
                    <Sparkles className="w-3 h-3 shrink-0 mt-0.5 text-blue-500 dark:text-indigo-400" />
                    <span className="text-zinc-400 dark:text-zinc-500 font-mono shrink-0">Next:</span>
                    <span className="text-zinc-700 dark:text-zinc-300 leading-snug">{step.nextPlannedStep}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
